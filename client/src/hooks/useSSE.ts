import { useState, useEffect, useRef, useCallback } from "react";
import { ThreadState, ProcessStatus, InputType } from "../types/session";

// ChatItem 타입 정의
// export interface ChatItem {
//   threadId: string;
//   submit: string; // 사용자가 처음 입력한 메시지
//   lastMessage: string; // 마지막 메시지 내용
//   createdAt: string; // 생성 시간
//   updatedAt: string; // 마지막 업데이트 시간
//   processStatus: ProcessStatus; // 프로젝트 진행 단계
//   topic?: string; // 주제 (요약)
// }

export interface ChatItem {
  rootThreadId: string;
  lastThreadId: string;
  steps: string[]; // 사용된 세션 진행
  processStatus: ProcessStatus; // 프로젝트 진행 단계
  process: Record<ProcessStatus, string[]>; // process 별 사용된 thread
  submit: string; // 주제 (요약)
  // lastMessage: string; // 마지막 메시지 내용
  createdAt: string; // 생성 시간
  updatedAt: string; // 마지막 업데이트 시간
}

// SSE 연결 상태
export type SSEConnectionState =
  | "IDLE"
  | "CREATING_THREAD"
  | "DISCONNECTED"
  | "CONNECTING"
  | "PENDING"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR";

// SSE 메시지 타입
export interface SSEMessage {
  messageId: string;
  threadId: string;
  timestamp: Date;
  type: "user" | "server";
  content: string;
}

// SSE 이벤트 타입
export interface SSEEvent {
  type: string;
  data: any;
}

// AI 응답 타입
export interface AIResponse {
  content: string;
  isComplete: boolean;
  threadId?: string;
}

// useSSE 옵션
export interface UseSSEOptions {
  serverUrl?: string;
  threadId?: string;
  autoConnect?: boolean;
  maxRetries?: number;
  retryInterval?: number;
}

// useSSE 반환 타입
export interface UseSSEReturn {
  connectionState: SSEConnectionState;
  threadState: ThreadState;
  processStatus: ProcessStatus;
  inputType: InputType;
  threadId: string;
  messages: SSEMessage[];
  aiResponse: AIResponse;
  isConnected: boolean;
  chatItems: ChatItem[];
  addMessage: (message: SSEMessage) => void;
  sendMessage: (message: string, userId?: string) => Promise<boolean>;
  connect: (threadId: string) => void;
  disconnect: () => void;
  clearMessages: () => void;
  startTyping: () => void;
  stopTyping: () => void;
  startNewChat: () => void;
  getChatItems: () => ChatItem[];
  fetchProcess: (status: ProcessStatus) => void;
}

const DEFAULT_SERVER_URL = "http://localhost:22041";
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_INTERVAL = 3000;

// ThreadData 타입 정의
interface ThreadData {
  history: ChatItem[];
}

// localStorage 유틸리티 함수들
const getThreadData = (): ThreadData => {
  try {
    const stored = localStorage.getItem("vibecraft_thread");
    return stored ? JSON.parse(stored) : { history: [] };
  } catch (error) {
    console.error("ThreadData 로드 실패:", error);
    return { history: [] };
  }
};

const saveThreadData = (threadData: ThreadData): void => {
  try {
    localStorage.setItem("vibecraft_thread", JSON.stringify(threadData));
  } catch (error) {
    console.error("ThreadData 저장 실패:", error);
  }
};

const getChatItems = (): ChatItem[] => {
  return getThreadData().history;
};

const updateChatItem = (
  threadId: string,
  submit: string,
  processStatus: ProcessStatus = "TOPIC"
): void => {
  const threadData = getThreadData();
  const existingIndex = threadData.history.findIndex(
    (item) => item.rootThreadId === threadId
  );

  if (existingIndex >= 0) {
    // 기존 아이템 업데이트 - submit 값은 변경하지 않음
    threadData.history[existingIndex] = {
      ...threadData.history[existingIndex],
      processStatus,
      updatedAt: new Date().toISOString(),
    };
    console.log("✅ 기존 ChatItem 업데이트:", threadId);
  } else {
    // 새 아이템 추가 (새로운 세션인 경우에만)
    // threadData.history.unshift({
    //   rootThreadId,
    //   submit,
    //   processStatus,
    //   createdAt: new Date().toISOString(),
    //   updatedAt: new Date().toISOString(),
    // });
    threadData.history.unshift({
      rootThreadId: threadId,
      lastThreadId: threadId,
      submit,
      processStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [],
      process: {
        TOPIC: [threadId],
        DATA: [],
        BUILD: [],
        DEPLOY: [],
      },
    });
    console.log("🆕 새 ChatItem 생성:", threadId);
  }

  saveThreadData(threadData);
};

export const useSSE = (options: UseSSEOptions = {}): UseSSEReturn => {
  const {
    serverUrl = DEFAULT_SERVER_URL,
    threadId: providedThreadId,
    autoConnect = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryInterval = DEFAULT_RETRY_INTERVAL,
  } = options;

  // 세션 ID 상태 관리
  const [threadId, setThreadId] = useState<string>("");

  // 상태 관리
  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>("IDLE");
  const [threadState, setThreadState] = useState<ThreadState>("FIRST_VISIT");
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("TOPIC");
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [expectedMessages, setExpectedMessages] = useState<number>(0);
  const [receivedSequenceCount, setReceivedSequenceCount] = useState<number>(0);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [inputType, setInputType] = useState<InputType>("TEXT");
  const [aiResponse, setAiResponse] = useState<AIResponse>({
    content: "",
    isComplete: false,
  });

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
    if (threadState === "READY") {
      setThreadState("TYPING");

      // 기존 타이머 클리어
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // 3초 후 READY 상태로 복귀
      const timeout = setTimeout(() => {
        setThreadState("READY");
      }, 3000);

      setTypingTimeout(timeout);
    }
  }, [threadState, typingTimeout]);

  const stopTyping = useCallback(() => {
    if (threadState === "TYPING") {
      setThreadState("READY");
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  }, [threadState, typingTimeout]);

  // 메시지 전송 (POST 요청) - 세션이 없어도 바로 전송
  const sendMessage = useCallback(
    async (message: string, userId = "anonymous"): Promise<boolean> => {
      console.log("📤 메시지 전송 요청:", message);

      try {
        const myMessage: SSEMessage = {
          messageId: `msg_${userId}_${Date.now()}`,
          threadId: threadId || "",
          content: message,
          timestamp: new Date(),
          type: "user",
        };
        setMessages((prev) => [...prev, myMessage]);

        // 타이핑 상태 정리 후 전송 상태로 변경
        stopTyping();
        setThreadState("SENDING");

        // 세션이 없으면 연결 상태로 설정
        if (!threadId) {
          console.log("🆕 새 세션으로 메시지 전송...");
          setConnectionState("CREATING_THREAD");
          setThreadState("CONNECTING");
        }

        const response = await fetch(`${serverUrl}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            threadId: threadId || null, // 세션이 없으면 null 전송
            userId,
          }),
        });

        if (!response.ok) {
          console.error("❌ 메시지 전송 실패:", response.status);
          setConnectionState("ERROR");
          setThreadState("ERROR");
          return false;
        }

        const data = await response.json();
        console.log("✅ 서버 응답:", data);

        // 기존 세션에서 메시지를 보낸 경우 ChatItem 업데이트
        if (threadId && data.threadId === threadId) {
          updateChatItem(threadId, message, processStatus);
          setChatItems(getChatItems());
          console.log("📝 기존 세션 ChatItem 업데이트:", threadId);
        }

        if (
          connectionState === "CONNECTING" ||
          connectionState === "CONNECTED"
        ) {
        } else {
          // 서버에서 세션ID를 받은 경우 업데이트
          if (data.threadId && data.threadId !== threadId) {
            console.log("🔄 새 세션ID 설정:", data.threadId);
            setThreadId(data.threadId);
            setConnectionState("CONNECTING");
          }
        }

        // 서버 응답 처리 (POST 초기 응답)
        if (data.type === "chat_started" && data.content) {
          // 시작 메시지 추가
          const startMessage: SSEMessage = {
            messageId: data.messageId || `msg_${Date.now()}`,
            threadId: data.threadId,
            content: data.content,
            timestamp: new Date(data.timestamp || new Date().toISOString()),
            type: "server",
          };

          setMessages((prev) => [...prev, startMessage]);
          setConnectionState("CONNECTED");
          setThreadState("RECEIVING");
          setExpectedMessages(data.totalResponses || 1);
          setReceivedSequenceCount(0);

          // SSE 연결 시작
          setupEventSource(data.threadId);
        } else if (data.content) {
          // 일반 메시지 처리
          const serverMessage: SSEMessage = {
            messageId: data.messageId || `msg_${Date.now()}`,
            threadId: data.threadId,
            content: data.content,
            timestamp: new Date(data.timestamp || new Date().toISOString()),
            type: "server",
          };

          setMessages((prev) => [...prev, serverMessage]);
          setConnectionState("CONNECTED");
          setThreadState("READY");
        }

        // TODO : Process Status 다음 step으로 변경

        return true;
      } catch (error) {
        console.error("❌ 메시지 전송 오류:", error);
        setConnectionState("ERROR");
        setThreadState("ERROR");
        return false;
      }
    },
    [serverUrl, threadId]
  );

  // EventSource 설정 함수
  const setupEventSource = useCallback(
    (threadId: string) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log("🔌 SSE 연결 시작:", threadId);
      const eventSource = new EventSource(`${serverUrl}/events/${threadId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("✅ SSE 연결 성공");
        retryCountRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          // SSE 이벤트 파싱
          const parseSSEEvent = (rawData: string) => {
            const lines = rawData.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.replace("event:", "").trim();
              } else if (line.startsWith("data:")) {
                eventData = line.replace("data:", "").trim();
              }
            }

            return { event: eventType, data: eventData };
          };

          // 원본 이벤트 데이터 파싱
          const { event: eventType, data: eventData } = parseSSEEvent(
            event.data
          );
          console.log("📨 SSE 이벤트 수신:", { eventType, eventData });

          // AI 이벤트만 처리
          if (eventType === "ai") {
            setAiResponse((prev) => ({
              content: prev.content + eventData + "\n",
              isComplete: false,
              threadId: threadId,
            }));
          } else if (eventType === "complete") {
            // AI 응답 완료 처리
            setAiResponse((prev) => {
              const completedResponse = {
                ...prev,
                isComplete: true,
              };

              // 전체 AI 응답을 메시지로 추가
              const aiMessage: SSEMessage = {
                messageId: `ai_response_${Date.now()}`,
                threadId: threadId,
                content: completedResponse.content,
                timestamp: new Date(),
                type: "server",
              };
              setMessages((prevMessages) => [...prevMessages, aiMessage]);

              // ChatItem 업데이트
              updateChatItem(
                threadId,
                "", // originalMessage
                processStatus
              );
              setChatItems(getChatItems());

              return completedResponse;
            });

            setThreadState("READY");
            eventSource.close();
          } else if (eventType === "menu") {
            // 메뉴 이벤트는 현재 무시
            console.log("📝 메뉴 이벤트 수신 (무시):", eventData);
          }

          // 기존 JSON 파싱 방식 유지 (하위 호환성)
          try {
            const data = JSON.parse(event.data);
            if (data.type === "chat_response") {
              // 기존 순차 응답 메시지 처리
              const serverMessage: SSEMessage = {
                messageId: data.messageId,
                threadId: data.threadId,
                content: data.content,
                timestamp: new Date(data.timestamp),
                type: "server",
              };

              setMessages((prev) => [...prev, serverMessage]);
              setReceivedSequenceCount(data.sequence);

              // 마지막 메시지인 경우
              if (data.sequence === data.total) {
                setThreadState("READY");
                eventSource.close();

                // ChatItem 업데이트
                updateChatItem(threadId, data.originalMessage, processStatus);
                setChatItems(getChatItems());
              }
            }
          } catch (jsonError) {
            // JSON 파싱 실패는 무시 (새로운 이벤트 형식)
          }
        } catch (error) {
          console.error("❌ SSE 메시지 파싱 오류:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ SSE 연결 오류:", error);
        setThreadState("ERROR");
        eventSource.close();
      };
    },
    [serverUrl]
  );

  // SSE 연결 설정 - 세션 선택 시 호출
  const connect = useCallback((newThreadId: string) => {
    console.log("🔌 세션 연결:", newThreadId);

    // 현재 세션 ID 업데이트
    setThreadId(newThreadId);

    // 기존 세션의 processStatus 로드
    const threadData = getThreadData();
    const chatItem = threadData.history.find(
      (item) => item.rootThreadId === newThreadId
    );
    if (chatItem) {
      setProcessStatus(chatItem.processStatus);
    }
    try {
      // 서버에서 채팅 기록 요청
      fetchChatHistory(newThreadId);
    } catch (error) {
      console.error("❌ 메시지 로드 실패:", error);
      setMessages([]);
      setThreadState("ERROR");
    }
  }, []);

  // 서버에서 채팅 기록 가져오기
  const fetchChatHistory = useCallback(
    async (threadId: string) => {
      try {
        console.log("📡 서버에서 채팅 기록 요청:", threadId);
        setThreadState("CONNECTING");

        const response = await fetch(
          `${serverUrl}/threads/${threadId}/messages`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            const serverMessages = data.messages.map((msg: any) => ({
              messageId: msg.messageId || `msg_${Date.now()}`,
              threadId: threadId,
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
          setThreadState("READY");
        } else {
          console.warn("⚠️ 서버에 채팅 기록이 없습니다:", threadId);
          setMessages([]);
          setThreadState("READY");
        }
      } catch (error) {
        console.error("❌ 채팅 기록 요청 실패:", error);
        setMessages([]);
        setThreadState("ERROR");
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

  // 프로세스 상태값 변경 및 process tree node update
  const fetchProcess = useCallback((status: ProcessStatus) => {
    setProcessStatus(status);
  }, []);

  // 초기 로드 시 ChatItems 불러오기
  useEffect(() => {
    setChatItems(getChatItems());
  }, []);

  // 초기 세션 ID 설정
  useEffect(() => {
    // autoConnect가 false이거나 세션 ID가 없으면 자동 생성하지 않음
    // sendMessage 호출 시에 자동으로 세션이 생성됨
    if (providedThreadId) {
      setThreadId(providedThreadId);
    }
    // localStorage에서 세션 데이터 복구
    else {
      try {
        const threadData = getThreadData();
        const chatItems = threadData.history;

        if (chatItems.length > 0) {
          // 가장 최근 세션으로 자동 연결
          const latestThread = chatItems[0];
          setThreadId(latestThread.rootThreadId);
          setProcessStatus(latestThread.processStatus);
          setThreadState("READY");
          console.log("🔄 최근 세션 복구:", latestThread.rootThreadId);

          // 서버에서 채팅 기록 요청
          fetchChatHistory(latestThread.rootThreadId);
        } else {
          // 채팅 기록이 없으면 FIRST_VISIT
          setThreadState("FIRST_VISIT");
        }
      } catch (error) {
        console.error("❌ 세션 복구 실패:", error);
        setThreadState("FIRST_VISIT");
      }
    }
  }, [providedThreadId]);

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
    setThreadId("");
    setMessages([]);
    setAiResponse({ content: "", isComplete: false });
    setThreadState("IDLE");
    setConnectionState("IDLE");
    setProcessStatus("TOPIC"); // 새 채팅은 항상 TOPIC부터 시작

    // 새 채팅을 위한 추가 작업은 필요 없음
  }, []);

  return {
    connectionState,
    threadState,
    processStatus,
    inputType,
    threadId,
    messages,
    aiResponse,
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
    fetchProcess,
  };
};
