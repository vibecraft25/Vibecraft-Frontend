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
  channelId?: string;
  messages: SSEMessage[];
  chatItems: any[];

  // 액션
  switchChannel: (channelId: string) => void;
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

  // Zustand store 상태 - 채널 중심 구조
  const chatItems = useChatStore((state) => state.chatItems);
  const currentChannelId = useChatStore((state) => state.currentChannelId);

  // Store 액션들
  const {
    loadInitialData,
    switchChannel: switchCurrentChannel,
    storeChatChannel,
    updateChatChannel,
    startNewChat: storeStartNewChat,
    saveCurrentMessages,
  } = useChatStore();

  // 로컬 상태 (UI 관련)
  const [threadState, setThreadState] = useState<ThreadState>("IDLE");
  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>("DISCONNECTED");
  const [inputType] = useState<InputType>("TEXT");
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("TOPIC");

  // 메시지 버퍼 - 임시로 저장 (채팅 채널이 변경되기 전까지 메시지를 유지)
  const [messageBuffer, setMessageBuffer] = useState<SSEMessage[]>([]);

  // threadId는 개별 메시지용, channelId는 전체 세션용으로 분리
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
  const [channelId, setChannelId] = useState<string | undefined>(
    providedThreadId || currentChannelId
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
        threadId: currentThreadId || channelId || "", // 현재 활성 스레드 또는 채널 ID 사용
        content: message,
        timestamp: new Date(),
        componentType,
        type: type,
      };

      // messageBuffer에 추가 (채팅 진행 중 임시 저장)
      setMessageBuffer((prev) => [...prev, myMessage]);
    },
    [currentThreadId, channelId]
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

  const switchChannel = useCallback(
    (threadId: string) => {
      setChannelId(threadId);
      switchCurrentChannel(threadId);
    },
    [switchCurrentChannel]
  );

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
    [channelId, currentThreadId, processStatus]
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
          // 주제 설정 완료 complete : Root Thread ID (채널 ID)
          const rootThreadId = dataLines[0];

          const newChatItem = {
            rootThreadId: rootThreadId,
            lastThreadId: rootThreadId,
            steps: [rootThreadId],
            processStatus,
            process: {
              TOPIC: [rootThreadId],
              DATA: [],
              BUILD: [],
              DEPLOY: [],
            },
            submit: `Submit - ${rootThreadId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          storeChatChannel(newChatItem);

          // 새 채널로 전환 (비동기)
          switchChannel(rootThreadId);

          // 주제 설정 시엔 모든 메시지의 threadId를 rootThreadId로 업데이트
          setMessageBuffer((prev) => [
            ...prev.map((msg) => ({
              ...msg,
              threadId: rootThreadId,
            })),
          ]);

          break;
        case "DATA":
          // 데이터 수집 단계에서 새 스레드 ID 생성 및 업로더 컴포넌트 메시지 추가
          if (dataLines.length > 0) {
            const dataThreadId = dataLines[0];
            setCurrentThreadId(dataThreadId);
            addMessage("DATA_UPLOAD", "ai", "DATA_UPLOAD");
          }
          break;
        case "BUILD":
          // 빌드 단계에서 새 스레드 ID 생성
          if (dataLines.length > 0) {
            const buildThreadId = dataLines[0];
            setCurrentThreadId(buildThreadId);
          }
          break;
        case "DEPLOY":
          // 배포 단계에서 새 스레드 ID 생성
          if (dataLines.length > 0) {
            const deployThreadId = dataLines[0];
            setCurrentThreadId(deployThreadId);
          }
          break;
        default:
          console.warn("알 수 없는 프로세스 상태:", processStatus);
      }

      setThreadState("READY");
      setConnectionState("CONNECTED");
    },
    [
      channelId,
      currentThreadId,
      processStatus,
      storeChatChannel,
      switchChannel,
      addMessage,
    ]
  );

  // 메시지 전송
  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      console.log("📤 메시지 전송 요청:", message);

      try {
        // 사용자 메시지 즉시 표시
        addMessage(message, "human");

        setThreadState("SENDING");

        // 채널이 없으면 연결 상태로 설정
        if (!channelId) {
          console.log("🆕 새 채널로 메시지 전송...");
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

        // 기존 채널에서 메시지를 보낸 경우 ChatItem 업데이트
        if (channelId) {
          updateChatChannel(channelId, message, processStatus);
          console.log("📝 기존 채널 ChatItem 업데이트:", channelId);
        }

        return true;
      } catch (error) {
        console.error("❌ 스트림 처리 오류:", error);
        setConnectionState("ERROR");
        setThreadState("ERROR");
        return false;
      }
    },
    [
      serverUrl,
      channelId,
      processStatus,
      handleSSEEvent,
      addMessage,
      updateChatChannel,
    ]
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
    if (channelId && messageBuffer.length > 0) {
      await saveCurrentMessages(messageBuffer);
    }

    await storeStartNewChat();
    setChannelId(undefined);
    setCurrentThreadId(undefined);
    setMessageBuffer([]); // 메시지 버퍼 초기화
    setProcessStatus("TOPIC");
    setThreadState("IDLE");
    setConnectionState("DISCONNECTED");
  }, [storeStartNewChat, channelId, messageBuffer, saveCurrentMessages]);

  // currentChannelId 변경시 store와 동기화 및 채널 메시지 로드
  useEffect(() => {
    const loadChannelMessages = async () => {
      if (currentChannelId) {
        if (channelId && channelId !== currentChannelId) {
          // 이전 채널 메시지 저장
          if (currentChannelId && messageBuffer.length > 0) {
            await saveCurrentMessages(messageBuffer);
          }
        }

        // 채널의 메시지 로드
        const messages = await useChatStore
          .getState()
          .loadChannelMessages(currentChannelId);
        setMessageBuffer(messages);

        console.log(
          "✅ 채널 전환 및 메시지 로드 완료:",
          currentChannelId,
          messages.length,
          "개"
        );
      }
    };

    loadChannelMessages();
  }, [currentChannelId]);

  // 초기화 - 한 번만 실행
  const initializedRef = useRef(false);

  // 저장이 진행 중인지 추적하는 ref
  const savingRef = useRef(false);

  // 자동저장 타이머 ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!initializedRef.current) {
      loadInitialData();
      initializedRef.current = true;
    }

    // 메시지 저장 함수 (동기적으로 호출 가능)
    const saveMessagesSync = () => {
      if (savingRef.current || !channelId || messageBuffer.length === 0) {
        return;
      }

      savingRef.current = true;
      console.log(
        "💾 긴급 메시지 저장 시작:",
        channelId,
        messageBuffer.length,
        "개"
      );

      // 비동기 저장 시작 (완료를 기다리지 않음)
      saveCurrentMessages(messageBuffer).finally(() => {
        savingRef.current = false;
      });
    };

    // 주기적 자동저장 (30초마다)
    const startAutoSave = () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setInterval(() => {
        if (channelId && messageBuffer.length > 0 && !savingRef.current) {
          console.log(
            "⏰ 자동저장 실행:",
            channelId,
            messageBuffer.length,
            "개"
          );
          saveMessagesSync();
        }
      }, 30000); // 30초마다
    };

    // 페이지 숨김 이벤트 (탭 전환, 최소화 등)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("👁️ 페이지 숨김 감지 - 메시지 저장");
        saveMessagesSync();
      }
    };

    // 페이지 언로드 이벤트 (새로고침, 닫기)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (channelId && messageBuffer.length > 0) {
        console.log("🚪 페이지 언로드 감지 - 메시지 저장");
        saveMessagesSync();

        // 브라우저에게 저장이 진행중임을 알림 (사용자에게 확인 대화상자)
        e.preventDefault();

        // 짧은 시간 동안 저장 시도
        setTimeout(saveMessagesSync, 0);
      }
    };

    // 페이지 숨김/언로드 이벤트 (모바일에서 더 안정적)
    const handlePageHide = () => {
      console.log("📱 페이지 숨김 이벤트 - 메시지 저장");
      saveMessagesSync();
    };

    // 자동저장 시작
    startAutoSave();

    // 이벤트 리스너 등록
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      // 자동저장 타이머 정리
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      // 이벤트 리스너 제거
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);

      // 컴포넌트 언마운트시에도 저장
      console.log("🔄 컴포넌트 언마운트 - 메시지 저장");
      saveMessagesSync();
    };
  }, [loadInitialData, saveCurrentMessages, channelId, messageBuffer]);

  // 세션 복구 처리
  const sessionRestoreRef = useRef(false);

  useEffect(() => {
    if (sessionRestoreRef.current) {
      return;
    }

    if (providedThreadId) {
      switchChannel(providedThreadId);
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
        const latestChannel = chatItems[0];
        switchChannel(latestChannel.rootThreadId);

        // lastProcess가 있으면 다음 단계로, 없으면 현재 processStatus 유지
        if (latestChannel.lastProcess) {
          const nextProcess = getNextProcessStatus(latestChannel.lastProcess);
          setProcessStatus(nextProcess);
          console.log(
            "📊 다음 프로세스 단계로 설정:",
            latestChannel.lastProcess,
            "→",
            nextProcess
          );
        } else {
          setProcessStatus(latestChannel.processStatus);
          console.log(
            "📊 기존 프로세스 단계 유지:",
            latestChannel.processStatus
          );
        }

        setThreadState("READY");
        console.log("🔄 최근 채널 복구:", latestChannel.rootThreadId);
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
    switchChannel,
  ]);

  return {
    // 상태
    threadState,
    connectionState,
    inputType,
    processStatus,
    channelId: channelId, // 외부에는 여전히 threadId로 제공 (호환성)
    messages: messageBuffer,
    chatItems,

    // 액션
    switchChannel,
    addMessage,
    setNextProcessStatus,
    sendMessage,
    sendOptionMessage,
    startNewChat,
    fetchProcess,
  };
};
