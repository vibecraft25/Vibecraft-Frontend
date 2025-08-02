import { useState, useEffect, useRef, useCallback } from "react";
import { SessionState, ProcessStatus } from "../types/session";

// ChatItem 타입 정의
export interface ChatItem {
  sessionId: string;
  submit: string; // 사용자가 처음 입력한 메시지
  lastMessage: string; // 마지막 메시지 내용
  createdAt: string; // 생성 시간
  updatedAt: string; // 마지막 업데이트 시간
  processStatus: ProcessStatus; // 프로젝트 진행 단계
  topic?: string; // 주제 (요약)
}

// SSE 연결 상태
export type SSEConnectionState =
  | "IDLE"
  | "CREATING_SESSION"
  | "DISCONNECTED"
  | "CONNECTING"
  | "PENDING"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR";

// SSE 메시지 타입
export interface SSEMessage {
  messageId: string;
  sessionId: string;
  timestamp: Date;
  type: "user" | "server";
  content: string;
}

// SSE 이벤트 타입
export interface SSEEvent {
  type: string;
  data: any;
}

// useSSE 옵션
export interface UseSSEOptions {
  serverUrl?: string;
  sessionId?: string;
  autoConnect?: boolean;
  maxRetries?: number;
  retryInterval?: number;
}

// useSSE 반환 타입
export interface UseSSEReturn {
  connectionState: SSEConnectionState;
  sessionState: SessionState;
  processStatus: ProcessStatus;
  sessionId: string;
  messages: SSEMessage[];
  isConnected: boolean;
  chatItems: ChatItem[];
  addMessage: (message: SSEMessage) => void;
  sendMessage: (message: string, userId?: string) => Promise<boolean>;
  connect: (sessionId: string) => void;
  disconnect: () => void;
  clearMessages: () => void;
  startTyping: () => void;
  stopTyping: () => void;
  startNewChat: () => void;
  getChatItems: () => ChatItem[];
}

const DEFAULT_SERVER_URL = "http://localhost:22041";
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_INTERVAL = 3000;

// SessionData 타입 정의
interface SessionData {
  history: ChatItem[];
}

// localStorage 유틸리티 함수들
const getSessionData = (): SessionData => {
  try {
    const stored = localStorage.getItem("vibecraft_session");
    return stored ? JSON.parse(stored) : { history: [] };
  } catch (error) {
    console.error("SessionData 로드 실패:", error);
    return { history: [] };
  }
};

const saveSessionData = (sessionData: SessionData): void => {
  try {
    localStorage.setItem("vibecraft_session", JSON.stringify(sessionData));
  } catch (error) {
    console.error("SessionData 저장 실패:", error);
  }
};

const getChatItems = (): ChatItem[] => {
  return getSessionData().history;
};

const updateChatItem = (
  sessionId: string,
  submit: string,
  lastMessage: string,
  processStatus: ProcessStatus = "TOPIC",
  topic?: string
): void => {
  const sessionData = getSessionData();
  const existingIndex = sessionData.history.findIndex(
    (item) => item.sessionId === sessionId
  );

  if (existingIndex >= 0) {
    // 기존 아이템 업데이트 - submit 값은 변경하지 않음
    sessionData.history[existingIndex] = {
      ...sessionData.history[existingIndex],
      lastMessage,
      processStatus,
      topic: topic || sessionData.history[existingIndex].topic,
      updatedAt: new Date().toISOString(),
    };
    console.log("✅ 기존 ChatItem 업데이트:", sessionId);
  } else {
    // 새 아이템 추가 (새로운 세션인 경우에만)
    sessionData.history.unshift({
      sessionId,
      submit,
      lastMessage,
      processStatus,
      topic: topic || submit, // TOPIC 단계에서는 submit을 topic으로 사용
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log("🆕 새 ChatItem 생성:", sessionId);
  }

  saveSessionData(sessionData);
};

export const useSSE = (options: UseSSEOptions = {}): UseSSEReturn => {
  const {
    serverUrl = DEFAULT_SERVER_URL,
    sessionId: providedSessionId,
    autoConnect = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryInterval = DEFAULT_RETRY_INTERVAL,
  } = options;

  // 세션 ID 상태 관리
  const [sessionId, setSessionId] = useState<string>("");

  // 상태 관리
  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>("IDLE");
  const [sessionState, setSessionState] = useState<SessionState>("FIRST_VISIT");
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("TOPIC");
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [expectedMessages, setExpectedMessages] = useState<number>(0);
  const [receivedSequenceCount, setReceivedSequenceCount] = useState<number>(0);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);

  // 내부 상태
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 연결 상태 계산
  const isConnected = connectionState === "CONNECTED";

  // 메시지 추가
  const addMessage = useCallback((message: SSEMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // 메시지 초기화
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 타이핑 상태 관리
  const startTyping = useCallback(() => {
    if (sessionState === "READY") {
      setSessionState("TYPING");

      // 기존 타이머 클리어
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // 3초 후 READY 상태로 복귀
      const timeout = setTimeout(() => {
        setSessionState("READY");
      }, 3000);

      setTypingTimeout(timeout);
    }
  }, [sessionState, typingTimeout]);

  const stopTyping = useCallback(() => {
    if (sessionState === "TYPING") {
      setSessionState("READY");
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  }, [sessionState, typingTimeout]);

  // 메시지 전송 (POST 요청) - 세션이 없어도 바로 전송
  const sendMessage = useCallback(
    async (message: string, userId = "anonymous"): Promise<boolean> => {
      console.log("📤 메시지 전송 요청:", message);

      try {
        const myMessage: SSEMessage = {
          messageId: `msg_${userId}_${Date.now()}`,
          sessionId: sessionId || "",
          content: message,
          timestamp: new Date(),
          type: "user",
        };
        setMessages((prev) => [...prev, myMessage]);

        // 타이핑 상태 정리 후 전송 상태로 변경
        stopTyping();
        setSessionState("SENDING");

        // 세션이 없으면 연결 상태로 설정
        if (!sessionId) {
          console.log("🆕 새 세션으로 메시지 전송...");
          setConnectionState("CREATING_SESSION");
          setSessionState("CONNECTING");
        }

        const response = await fetch(`${serverUrl}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            sessionId: sessionId || null, // 세션이 없으면 null 전송
            userId,
          }),
        });

        if (!response.ok) {
          console.error("❌ 메시지 전송 실패:", response.status);
          setConnectionState("ERROR");
          setSessionState("ERROR");
          return false;
        }

        const data = await response.json();
        console.log("✅ 서버 응답:", data);

        // 기존 세션에서 메시지를 보낸 경우 ChatItem 업데이트
        if (sessionId && data.sessionId === sessionId) {
          updateChatItem(sessionId, message, message, processStatus);
          setChatItems(getChatItems());
          console.log("📝 기존 세션 ChatItem 업데이트:", sessionId);
        }

        if (
          connectionState === "CONNECTING" ||
          connectionState === "CONNECTED"
        ) {
        } else {
          // 서버에서 세션ID를 받은 경우 업데이트
          if (data.sessionId && data.sessionId !== sessionId) {
            console.log("🔄 새 세션ID 설정:", data.sessionId);
            setSessionId(data.sessionId);
            setConnectionState("CONNECTING");
          }
        }

        // 서버 응답 처리 (POST 초기 응답)
        if (data.type === "chat_started" && data.content) {
          // 시작 메시지 추가
          const startMessage: SSEMessage = {
            messageId: data.messageId || `msg_${Date.now()}`,
            sessionId: data.sessionId,
            content: data.content,
            timestamp: new Date(data.timestamp || new Date().toISOString()),
            type: "server",
          };

          setMessages((prev) => [...prev, startMessage]);
          setConnectionState("CONNECTED");
          setSessionState("RECEIVING");
          setExpectedMessages(data.totalResponses || 1);
          setReceivedSequenceCount(0);

          // SSE 연결 시작
          setupEventSource(data.sessionId);
        } else if (data.content) {
          // 일반 메시지 처리
          const serverMessage: SSEMessage = {
            messageId: data.messageId || `msg_${Date.now()}`,
            sessionId: data.sessionId,
            content: data.content,
            timestamp: new Date(data.timestamp || new Date().toISOString()),
            type: "server",
          };

          setMessages((prev) => [...prev, serverMessage]);
          setConnectionState("CONNECTED");
          setSessionState("READY");
        }

        return true;
      } catch (error) {
        console.error("❌ 메시지 전송 오류:", error);
        setConnectionState("ERROR");
        setSessionState("ERROR");
        return false;
      }
    },
    [serverUrl, sessionId]
  );

  // EventSource 설정 함수
  const setupEventSource = useCallback(
    (sessionId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log("🔌 SSE 연결 시작:", sessionId);
      const eventSource = new EventSource(`${serverUrl}/events/${sessionId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("✅ SSE 연결 성공");
        retryCountRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 SSE 메시지 수신:", data);

          if (data.type === "chat_response") {
            // 순차 응답 메시지 처리
            const serverMessage: SSEMessage = {
              messageId: data.messageId,
              sessionId: data.sessionId,
              content: data.content,
              timestamp: new Date(data.timestamp),
              type: "server",
            };

            setMessages((prev) => [...prev, serverMessage]);
            setReceivedSequenceCount(data.sequence);

            // 마지막 메시지인 경우
            if (data.sequence === data.total) {
              setSessionState("READY");
              eventSource.close();

              // ChatItem 업데이트
              updateChatItem(sessionId, data.originalMessage, data.content, processStatus);
              setChatItems(getChatItems());
            }
          }
        } catch (error) {
          console.error("❌ SSE 메시지 파싱 오류:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ SSE 연결 오류:", error);
        setSessionState("ERROR");
        eventSource.close();
      };
    },
    [serverUrl]
  );

  // SSE 연결 설정 - 세션 선택 시 호출
  const connect = useCallback((newSessionId: string) => {
    console.log("🔌 세션 연결:", newSessionId);

    // 현재 세션 ID 업데이트
    setSessionId(newSessionId);
    
    // 기존 세션의 processStatus 로드
    const sessionData = getSessionData();
    const chatItem = sessionData.history.find(item => item.sessionId === newSessionId);
    if (chatItem) {
      setProcessStatus(chatItem.processStatus);
    }

    // localStorage에서 해당 세션의 메시지 로드
    try {
      // const storedMessages = localStorage.getItem(
      //   `vibecraft_messages_${newSessionId}`
      // );
      // if (storedMessages) {
      //   const messages = JSON.parse(storedMessages);
      //   setMessages(
      //     messages.map((msg: any) => ({
      //       ...msg,
      //       timestamp: new Date(msg.timestamp),
      //     }))
      //   );
      //   console.log(
      //     "📨 세션 메시지 로드:",
      //     newSessionId,
      //     messages.length,
      //     "개"
      //   );
      //   setSessionState("READY");
      // } else {
      //   // 서버에서 채팅 기록 요청
      //   fetchChatHistory(newSessionId);
      // }

      // 서버에서 채팅 기록 요청
      fetchChatHistory(newSessionId);
    } catch (error) {
      console.error("❌ 메시지 로드 실패:", error);
      setMessages([]);
      setSessionState("ERROR");
    }
  }, []);

  // 서버에서 채팅 기록 가져오기
  const fetchChatHistory = useCallback(
    async (sessionId: string) => {
      try {
        console.log("📡 서버에서 채팅 기록 요청:", sessionId);
        setSessionState("CONNECTING");

        const response = await fetch(
          `${serverUrl}/sessions/${sessionId}/messages`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            const serverMessages = data.messages.map((msg: any) => ({
              messageId: msg.messageId || `msg_${Date.now()}`,
              sessionId: sessionId,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              type: msg.type || "server",
            }));
            setMessages(serverMessages);
            console.log(
              "✅ 서버에서 채팅 기록 로드:",
              serverMessages.length,
              "개"
            );
          }
          setSessionState("READY");
        } else {
          console.warn("⚠️ 서버에 채팅 기록이 없습니다:", sessionId);
          setMessages([]);
          setSessionState("READY");
        }
      } catch (error) {
        console.error("❌ 채팅 기록 요청 실패:", error);
        setMessages([]);
        setSessionState("ERROR");
      }
    },
    [serverUrl]
  );

  // 연결 해제
  const disconnect = useCallback(() => {
    console.log("🔌 SSE 연결 해제");

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setConnectionState("IDLE");
    retryCountRef.current = 0;
  }, []);

  // 초기 로드 시 ChatItems 불러오기
  useEffect(() => {
    setChatItems(getChatItems());
  }, []);

  // 초기 세션 ID 설정
  useEffect(() => {
    // autoConnect가 false이거나 세션 ID가 없으면 자동 생성하지 않음
    // sendMessage 호출 시에 자동으로 세션이 생성됨
    if (providedSessionId) {
      setSessionId(providedSessionId);
    }
    // localStorage에서 세션 데이터 복구
    else {
      try {
        const sessionData = getSessionData();
        const chatItems = sessionData.history;

        if (chatItems.length > 0) {
          // 가장 최근 세션으로 자동 연결
          const latestSession = chatItems[0];
          setSessionId(latestSession.sessionId);
          setProcessStatus(latestSession.processStatus);
          setSessionState("READY");
          console.log("🔄 최근 세션 복구:", latestSession.sessionId);

          // 서버에서 채팅 기록 요청
          fetchChatHistory(latestSession.sessionId);
        } else {
          // 채팅 기록이 없으면 FIRST_VISIT
          setSessionState("FIRST_VISIT");
        }
      } catch (error) {
        console.error("❌ 세션 복구 실패:", error);
        setSessionState("FIRST_VISIT");
      }
    }
  }, [providedSessionId]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // 세션 데이터 저장은 updateChatItem에서 처리됨

  // 새 채팅 시작
  const startNewChat = useCallback(() => {
    console.log("🆕 새 채팅 시작");

    // 기존 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // 상태 초기화 - 채팅 기록이 있으므로 IDLE 상태
    setSessionId("");
    setMessages([]);
    setSessionState("IDLE");
    setConnectionState("IDLE");
    setProcessStatus("TOPIC"); // 새 채팅은 항상 TOPIC부터 시작

    // 새 채팅을 위한 추가 작업은 필요 없음
  }, []);

  return {
    connectionState,
    sessionState,
    processStatus,
    sessionId,
    messages,
    isConnected,
    chatItems,
    addMessage,
    sendMessage,
    connect,
    disconnect,
    clearMessages,
    startTyping,
    stopTyping,
    startNewChat,
    getChatItems: () => getChatItems(),
  };
};
