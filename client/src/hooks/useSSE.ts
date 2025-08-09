import { useState, useEffect, useCallback, useRef } from "react";
import {
  ThreadState,
  ProcessStatus,
  InputType,
  SSEConnectionState,
} from "../types/session";
import { getNextProcessStatus } from "@/utils/processStatus";
import {
  ApiEndpoint,
  API_ENDPOINTS,
  getApiResponse,
} from "@/utils/apiEndpoints";
import { readStream, StreamSSEEvent } from "@/utils/streamProcessor";
import { generateId } from "@/utils/chatStorage";
import { useChatStore } from "@/stores/chatStore";
import * as MessageStorage from "@/utils/messageStorage";

// Export types
export type { StreamSSEEvent } from "@/utils/streamProcessor";

// 컴포넌트 타입 정의
export type ComponentType =
  | "MENU"
  | "DATA_UPLOAD"
  | "BUILD_RESULT"
  | "DEPLOY_STATUS";

// SSE 메시지 타입
export interface SSEMessage {
  messageId: string;
  threadId: string;
  timestamp?: Date;
  type: "human" | "ai";
  content: string | string[];
  componentType?: ComponentType;
}

// useSSE 훅 설정 타입
export interface UseSSEConfig {
  serverUrl: string;
  threadId?: string;
  autoConnect?: boolean;
  autoRestore?: boolean;
  maxRetries?: number;
  retryInterval?: number;
}

// useSSE 훅 반환 타입
export interface UseSSEReturn {
  // 상태
  threadState: ThreadState;
  connectionState: SSEConnectionState;
  inputType: InputType;
  processStatus: ProcessStatus;
  threadId?: string;
  messages: SSEMessage[];
  chatItems: any[];

  // 액션
  addMessage: (
    message: string | string[],
    type: "human" | "ai",
    componentType?: ComponentType
  ) => void;
  setNextProcessStatus: () => void;
  sendMessage: (message: string) => Promise<boolean>;
  sendOptionMessage: (
    message: string,
    apiEndpoint: ApiEndpoint
  ) => Promise<boolean>;
  startNewChat: () => void;
  fetchProcess: (status: ProcessStatus) => void;
}

export const useSSE = (config: UseSSEConfig): UseSSEReturn => {
  const { serverUrl, threadId: providedThreadId, autoRestore = true } = config;

  // Zustand store 상태 - 단순화된 구조
  const chatItems = useChatStore((state) => state.chatItems);
  const currentThreadId = useChatStore((state) => state.currentThreadId);
  
  // Store 액션들
  const {
    loadInitialData,
    switchThread,
    storeChatChannel,
    updateChatChannel,
    startNewChat: storeStartNewChat,
    saveCurrentMessages
  } = useChatStore();

  // 로컬 상태 (UI 관련)
  const [threadState, setThreadState] = useState<ThreadState>("IDLE");
  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>("DISCONNECTED");
  const [inputType] = useState<InputType>("TEXT");
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("TOPIC");

  // 메시지 버퍼 - 임시로 저장 (채팅 채널이 변경되기 전까지 메시지를 유지)
  const [messageBuffer, setMessageBuffer] = useState<SSEMessage[]>([]);

  // threadId는 store에서 관리하지만 로컬에서도 추적
  const [threadId, setThreadId] = useState<string | undefined>(
    providedThreadId || currentThreadId
  );

  // 메시지 추가 헬퍼 - messageBuffer에 추가 후 채널 변경시 저장
  const addMessage = useCallback(
    (
      message: string | string[],
      type: "human" | "ai",
      componentType?: ComponentType
    ) => {
      console.log("📥 메시지 추가:", message);

      const myMessage: SSEMessage = {
        messageId: generateId(),
        threadId: threadId || "",
        content: message,
        timestamp: new Date(),
        componentType,
        type: type,
      };

      // messageBuffer에 추가 (채팅 진행 중 임시 저장)
      setMessageBuffer((prev) => [...prev, myMessage]);
    },
    [threadId]
  );

  const setNextProcessStatus = useCallback(() => {
    // 다음 프로세스 단계로 자동 진행
    const nextProcess = getNextProcessStatus(processStatus);
    if (nextProcess !== processStatus) {
      setProcessStatus(nextProcess);
      console.log(
        "📊 다음 프로세스 단계로 진행:",
        processStatus,
        "→",
        nextProcess
      );
    }
  }, [processStatus]);

  // SSE 이벤트 처리
  const handleSSEEvent = useCallback(
    async (event: StreamSSEEvent) => {
      console.log("📨 SSE 이벤트:", event.event, event.data);

      switch (event.event) {
        case "ai":
          await handleAIEvent(event);
          break;
        case "menu":
          await handleAIEvent(event, "MENU");
          break;
        case "complete":
          await handleCompleteEvent(event.data, processStatus);
          break;

        default:
          console.log("🔄 알 수 없는 이벤트:", event.event, event.data);
      }
    },
    [threadId, processStatus]
  );

  const handleAIEvent = useCallback(
    async (_event: StreamSSEEvent, componentType?: ComponentType) => {
      // 여러 data 라인을 하나의 텍스트로 결합
      const aiContent = componentType ? _event.data : _event.data.join("\n");

      addMessage(aiContent, "ai", componentType);

      console.log("🤖 AI 응답 누적:", aiContent);
    },
    [addMessage]
  );

  const handleCompleteEvent = useCallback(
    async (dataLines: string[], processStatus: ProcessStatus) => {
      switch (processStatus) {
        case "TOPIC":
          // 주제 설정 완료 complete : Thread ID
          const chatThreadID = dataLines[0];

          const newChatItem = {
            rootThreadId: chatThreadID,
            lastThreadId: chatThreadID,
            steps: [chatThreadID],
            processStatus,
            process: {
              TOPIC: [chatThreadID],
              DATA: [],
              BUILD: [],
              DEPLOY: [],
            },
            submit: `Submit - ${chatThreadID}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          storeChatChannel(newChatItem);

          setThreadId(chatThreadID);
          // 새 스레드로 전환 (비동기)
          await switchThread(chatThreadID);

          // 주제 설정 시엔 모든 threadId가 없어 update
          setMessageBuffer((prev) => [
            ...prev.map((msg) => ({
              ...msg,
              threadId: chatThreadID,
            })),
          ]);

          break;
        case "DATA":
          // 데이터 수집 단계에서 업로더 컴포넌트 메시지 추가
          if (threadId) {
            addMessage("DATA_UPLOAD", "ai", "DATA_UPLOAD");
          }
          break;
        case "BUILD":
          // 빌드 완료
          break;
        case "DEPLOY":
          // 배포 완료
          break;
        default:
          console.warn("알 수 없는 프로세스 상태:", processStatus);
      }

      setThreadState("READY");
      setConnectionState("CONNECTED");
    },
    [threadId, processStatus, storeChatChannel, switchThread, addMessage]
  );

  // 메시지 전송
  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      console.log("📤 메시지 전송 요청:", message);

      try {
        // 사용자 메시지 즉시 표시
        addMessage(message, "human");

        setThreadState("SENDING");

        // 세션이 없으면 연결 상태로 설정
        if (!threadId) {
          console.log("🆕 새 세션으로 메시지 전송...");
          setConnectionState("CREATING_THREAD");
          setThreadState("CONNECTING");
        }

        // API 호출
        const response = await getApiResponse(
          message,
          serverUrl,
          API_ENDPOINTS[processStatus]
        );

        if (!response.body) {
          throw new Error("응답 스트림을 받을 수 없습니다.");
        }

        // 스트림 처리
        setThreadState("RECEIVING");
        setConnectionState("CONNECTED");

        await readStream(response, handleSSEEvent);

        // 기존 세션에서 메시지를 보낸 경우 ChatItem 업데이트
        if (threadId) {
          updateChatChannel(threadId, message, processStatus);
          console.log("📝 기존 세션 ChatItem 업데이트:", threadId);
        }

        return true;
      } catch (error) {
        console.error("❌ 스트림 처리 오류:", error);
        setConnectionState("ERROR");
        setThreadState("ERROR");
        return false;
      }
    },
    [serverUrl, threadId, processStatus, handleSSEEvent, addMessage, updateChatChannel]
  );

  // 옵션 메시지 전송
  const sendOptionMessage = useCallback(
    async (message: string, apiEndpoint: ApiEndpoint): Promise<boolean> => {
      try {
        setThreadState("RECEIVING");

        const response = await getApiResponse(message, serverUrl, apiEndpoint);

        if (!response.body) {
          throw new Error("응답 스트림을 받을 수 없습니다.");
        }

        setConnectionState("CONNECTED");
        await readStream(response, handleSSEEvent);

        return true;
      } catch (error) {
        console.error("❌ 옵션 메시지 처리 오류:", error);
        setConnectionState("ERROR");
        setThreadState("ERROR");
        return false;
      }
    },
    [serverUrl, handleSSEEvent]
  );

  // 프로세스 변경
  const fetchProcess = useCallback(
    (status: ProcessStatus) => {
      console.log("🔄 프로세스 변경:", processStatus, "→", status);
      setProcessStatus(status);
    },
    [processStatus]
  );

  // 새 채팅 시작
  const startNewChat = useCallback(async () => {
    console.log("🆕 새 채팅 시작");
    
    // 현재 메시지들 저장 후 초기화
    if (threadId && messageBuffer.length > 0) {
      await saveCurrentMessages(messageBuffer);
    }
    
    await storeStartNewChat();
    setThreadId(undefined);
    setMessageBuffer([]); // 메시지 버퍼 초기화
    setProcessStatus("TOPIC");
    setThreadState("IDLE");
    setConnectionState("DISCONNECTED");
  }, [storeStartNewChat, threadId, messageBuffer, saveCurrentMessages]);

  // threadId 변경시 store와 동기화 및 메시지 로드
  useEffect(() => {
    const loadThreadMessages = async () => {
      if (threadId && threadId !== currentThreadId) {
        // 이전 메시지 저장
        if (currentThreadId && messageBuffer.length > 0) {
          await saveCurrentMessages(messageBuffer);
        }
        
        // 새 스레드로 전환
        await switchThread(threadId);
        
        // 새 스레드 메시지 로드
        const messages = await MessageStorage.getMessages(threadId);
        setMessageBuffer(messages);
        
        console.log("✅ 스레드 전환 및 메시지 로드 완료:", threadId, messages.length, "개");
      }
    };
    
    loadThreadMessages();
  }, [threadId, currentThreadId, switchThread, messageBuffer, saveCurrentMessages]);

  // 초기화 - 한 번만 실행
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      loadInitialData();
      initializedRef.current = true;
    }

    // 페이지 종료시 현재 메시지 저장
    const handleBeforeUnload = async () => {
      if (threadId && messageBuffer.length > 0) {
        await saveCurrentMessages(messageBuffer);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // 컴포넌트 언마운트시에도 저장
      if (threadId && messageBuffer.length > 0) {
        saveCurrentMessages(messageBuffer);
      }
    };
  }, [loadInitialData, saveCurrentMessages]);

  // 세션 복구 처리
  const sessionRestoreRef = useRef(false);

  useEffect(() => {
    if (sessionRestoreRef.current) {
      return;
    }

    if (providedThreadId) {
      setThreadId(providedThreadId);
      switchThread(providedThreadId);
      sessionRestoreRef.current = true;
      return;
    }

    if (threadState !== "IDLE") {
      console.log("Process 상태가 IDLE이 아니므로 초기화 생략");
      return;
    }

    if (!autoRestore) {
      console.log("🔒 자동 복구 비활성화 - IDLE 상태로 설정");
      setThreadState("IDLE");
      sessionRestoreRef.current = true;
      return;
    }

    // chatItems가 로드된 후 자동 연결
    try {
      if (chatItems.length > 0) {
        const latestThread = chatItems[0];
        setThreadId(latestThread.rootThreadId);
        switchThread(latestThread.rootThreadId);

        // lastProcess가 있으면 다음 단계로, 없으면 현재 processStatus 유지
        if (latestThread.lastProcess) {
          const nextProcess = getNextProcessStatus(latestThread.lastProcess);
          setProcessStatus(nextProcess);
          console.log(
            "📊 다음 프로세스 단계로 설정:",
            latestThread.lastProcess,
            "→",
            nextProcess
          );
        } else {
          setProcessStatus(latestThread.processStatus);
          console.log(
            "📊 기존 프로세스 단계 유지:",
            latestThread.processStatus
          );
        }

        setThreadState("READY");
        console.log("🔄 최근 세션 복구:", latestThread.rootThreadId);
        sessionRestoreRef.current = true;
      } else if (chatItems.length === 0) {
        setThreadState("FIRST_VISIT");
        sessionRestoreRef.current = true;
      }
    } catch (error) {
      console.error("❌ 세션 복구 실패:", error);
      setThreadState("FIRST_VISIT");
      sessionRestoreRef.current = true;
    }
  }, [
    chatItems.length,
    providedThreadId,
    autoRestore,
    threadState,
    switchThread,
  ]);

  return {
    // 상태
    threadState,
    connectionState,
    inputType,
    processStatus,
    threadId,
    messages: messageBuffer,
    chatItems,

    // 액션
    addMessage,
    setNextProcessStatus,
    sendMessage,
    sendOptionMessage,
    startNewChat,
    fetchProcess,
  };
};