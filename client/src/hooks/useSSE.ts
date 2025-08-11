import { useState, useEffect, useCallback, useRef } from "react";
import { ThreadState, InputType, SSEConnectionState } from "@/types/session";
import { getNextProcessStatus, ProcessStatus } from "@/utils/processStatus";
import {
  ApiEndpoint,
  API_ENDPOINTS,
  getApiResponse,
  fetchTableMetadata,
} from "@/utils/apiEndpoints";
import { readStream, StreamSSEEvent } from "@/utils/streamProcessor";
import { generateId } from "@/stores/chatStore";
import { useChatStore } from "@/stores/chatStore";
import { useChannel } from "./useChannel";

// Export types
export type { StreamSSEEvent } from "@/utils/streamProcessor";

// 컴포넌트 타입 정의
export type ComponentType =
  | "MENU"
  | "DATA_UPLOAD"
  | "DATA_TABLE"
  | "DATA_VISUALIZE"
  | "BUILD_RESULT"
  | "DEPLOY_STATUS";

// 테이블 메타데이터 타입
export interface TableMetadata {
  created_at: string;
  column_mapping: Record<string, string>; // "상호명" -> "Store_Name"
}

// 테이블 데이터 타입
export interface TableData {
  title: string; // "📊 최종 데이터프레임 요약:"
  rawHeaders: string[]; // ["상호명", "주소_동", "위도", ...]
  englishHeaders: string[]; // ["Store_Name", "Address_Dong", ...]
  rows: string[][]; // 파싱된 데이터 행들
  metadata: TableMetadata; // 메타데이터
  threadId: string; // 어떤 thread의 데이터인지
}

// SSE 메시지 타입
export interface SSEMessage {
  messageId: string;
  threadId: string;
  timestamp?: Date;
  type: "human" | "ai";
  // content: string | string[] | TableData;
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
  // sendOptionMessage: (
  //   message: string,
  //   apiEndpoint: ApiEndpoint
  // ) => Promise<boolean>;
  startNewChat: () => void;
  fetchProcess: (status: ProcessStatus) => void;
}

export const useSSE = (config: UseSSEConfig): UseSSEReturn => {
  const { serverUrl, threadId: providedThreadId, autoRestore = true } = config;

  // 채널 관리 훅
  const {
    chatItems,
    currentChannelId,
    lastThreadId,
    createNewChannel,
    switchChannel,
    updateChannel,
    // storeChatChannel,
    updateChatChannel,
    startNewChat: storeStartNewChat,
    saveCurrentMessages,
    loadChannelMessages,
  } = useChannel();

  // 초기 데이터 로드만 직접 사용
  const { loadInitialData } = useChatStore();

  // 로컬 상태 (UI 관련)
  const [threadState, setThreadState] = useState<ThreadState>("IDLE");
  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>("DISCONNECTED");
  const [inputType] = useState<InputType>("TEXT");
  const [processStatus, setProcessStatus] = useState<ProcessStatus>("TOPIC");

  // 테이블 데이터 임시 저장 상태
  const [pendingTableData, setPendingTableData] = useState<string[] | null>(
    null
  );

  // 응답 버퍼 - 응답 임시 저장 후 thread ID update 와 함께 messageBuffer로 전달
  const [responseBuffer, setResponseBuffer] = useState<SSEMessage[]>([]);
  // 메시지 버퍼 - 임시로 저장 (채팅 채널이 변경되기 전까지 메시지를 유지)
  const [messageBuffer, setMessageBuffer] = useState<SSEMessage[]>([]);

  // threadId는 개별 메시지용, channelId는 전체 세션용으로 분리
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
  const [channelId, setChannelId] = useState<string>();

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
        threadId: currentThreadId || "", // 현재 활성 스레드 ID 사용
        content: message,
        timestamp: new Date(),
        componentType,
        type: type,
      };
      setMessageBuffer((prev) => [...prev, myMessage]);
    },
    [currentThreadId, channelId]
  );

  const addResponseMessage = useCallback(
    (
      message: string | string[],
      type: "human" | "ai",
      componentType?: ComponentType
    ) => {
      console.log("📥 메시지 추가:", message);

      const myMessage: SSEMessage = {
        messageId: generateId(),
        threadId: currentThreadId || "", // 현재 활성 스레드 ID 사용
        content: message,
        timestamp: new Date(),
        componentType,
        type: type,
      };
      setResponseBuffer((prev) => [...prev, myMessage]);
    },
    [currentThreadId, channelId]
  );

  const setNextProcessStatus = useCallback(() => {
    debugger;
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

      // 현재 채널이 있으면 storage 업데이트
      if (channelId) {
        updateChatChannel(channelId, "", nextProcess);
        console.log("💾 채널 프로세스 상태 업데이트:", channelId, nextProcess);
      }
    }
  }, [processStatus, channelId, updateChatChannel]);

  // 채널 변경 핸들러 -> useEffect로 message load, thread Id update
  const handleSwitchChannel = useCallback(
    (channelId: string) => {
      setThreadState("IDLE");
      setChannelId(channelId);
      switchChannel(channelId);
    },
    [switchChannel]
  );

  // createNewChannel은 useChannel에서 가져옴

  // SSE 이벤트 처리 (channelId 파라미터로 전달)
  const handleSSEEvent = useCallback(
    async (event: StreamSSEEvent, activeChannelId: string) => {
      console.log("📨 SSE 이벤트:", event.event, event.data);

      debugger;

      switch (event.event) {
        case "ai":
          await handleAIEvent(event, activeChannelId);
          break;
        case "menu":
          await handleAIEvent(event, activeChannelId, "MENU");
          break;
        case "data":
          // 테이블 데이터를 임시로 저장만 함
          setPendingTableData(event.data);
          console.log("📊 테이블 데이터 임시 저장:", event.data);
          break;
        case "complete":
          await handleCompleteEvent(event.data, processStatus, activeChannelId);
          break;

        default:
          console.log("🔄 알 수 없는 이벤트:", event.event, event.data);
      }
    },
    [processStatus]
  );

  const handleAIEvent = useCallback(
    async (
      _event: StreamSSEEvent,
      activeChannelId: string,
      componentType?: ComponentType
    ) => {
      // 여러 data 라인을 하나의 텍스트로 결합
      const aiContent = componentType ? _event.data : _event.data.join("\n");

      addResponseMessage(aiContent, "ai", componentType);

      console.log("🤖 AI 응답 누적:", aiContent, "channelId:", activeChannelId);
    },
    [addResponseMessage]
  );

  // 테이블 데이터 처리 함수
  const processTableData = useCallback(
    async (rawTableData: string[], threadId: string) => {
      try {
        console.log("📊 테이블 데이터 처리 시작:", threadId);

        // 1. 메타데이터 API 호출
        const metadata = await fetchTableMetadata(serverUrl, threadId);

        // 2. 원본 데이터 파싱
        const [title, headerLine, ...dataLines] = rawTableData;

        // 3. 헤더 파싱 (메타데이터 기준)
        const rawHeaders = Object.keys(metadata.column_mapping);

        // 4. 데이터 행 파싱 (간단한 공백 기반 파싱 - 추후 개선 필요)
        const rows = dataLines.map((line) => {
          // 여러 공백을 하나로 합치고 분할
          const parts = line.trim().split(/\s+/);
          return parts;
        });

        // 5. TableData 생성
        const tableData: TableData = {
          title,
          rawHeaders,
          englishHeaders: rawHeaders.map(
            (h) => metadata.column_mapping[h] || h
          ),
          rows,
          metadata,
          threadId,
        };

        // 6. 응답 메시지로 추가 (나중에 messageBuffer로 이관됨)
        // addResponseMessage(tableData, "ai", "DATA_TABLE");

        console.log("✅ 테이블 데이터 처리 완료:", tableData);
      } catch (error) {
        console.error("❌ 테이블 데이터 처리 실패:", error);

        // 실패시 원본 텍스트로 fallback
        const fallbackContent = rawTableData.join("\n");
        addResponseMessage(fallbackContent, "ai");
      }
    },
    [serverUrl, addResponseMessage]
  );

  const handleCompleteEvent = useCallback(
    async (
      dataLines: string[],
      processStatus: ProcessStatus,
      activeChannelId: string
    ) => {
      if (!activeChannelId) return;

      const newThreadId = dataLines[0];
      setCurrentThreadId(newThreadId);

      switch (processStatus) {
        case "TOPIC":
          await updateChannel(activeChannelId, newThreadId, "TOPIC");

          break;
        case "DATA":
          await updateChannel(activeChannelId, newThreadId, "DATA");

          setNextProcessStatus();
          break;
        case "DATA_PROCESS":
          debugger;
          break;
        case "BUILD":
          break;
        case "DEPLOY":
          break;
        default:
          console.warn("알 수 없는 프로세스 상태:", processStatus);
      }

      setThreadState("READY");
      setConnectionState("CONNECTED");
    },
    [updateChannel, setCurrentThreadId, setNextProcessStatus]
  );

  // API 별 파라미터 custom
  const getAdditionParams = useCallback(
    (message: string): Record<string, string> | undefined => {
      switch (processStatus) {
        case "TOPIC":
          return { query: message };
        case "DATA":
          return currentThreadId ? { thread_id: currentThreadId } : undefined;
        case "DATA_PROCESS":
          return currentThreadId
            ? { thread_id: currentThreadId, query: message }
            : undefined;
        default:
          return {};
      }
    },
    [processStatus, currentThreadId]
  );

  // 메시지 전송
  const sendMessage = useCallback(
    async (message: string): Promise<boolean> => {
      console.log("📤 메시지 전송 요청:", message);

      try {
        let activeChannelId = channelId;

        // 채널이 없으면 임시 채널 생성
        if (!channelId) {
          console.log("🆕 새 채널로 메시지 전송...");
          activeChannelId = `temp-${generateId()}`;

          createNewChannel(activeChannelId, message);

          setChannelId(activeChannelId);
          setConnectionState("CREATING_THREAD");
          setThreadState("CONNECTING");
        }

        if (!activeChannelId) {
          throw new Error("채팅 생성에 오류가 발생했습니다.");
        }

        // 사용자 메시지 즉시 표시
        addMessage(message, "human");

        const { isStream, api } = API_ENDPOINTS[processStatus];

        // API 호출
        const response = await getApiResponse(
          serverUrl,
          api,
          getAdditionParams(message)
        );

        if (isStream) {
          setThreadState("SENDING");

          if (!response.body) {
            throw new Error("응답 스트림을 받을 수 없습니다.");
          }

          // 스트림 처리
          setThreadState("RECEIVING");
          setConnectionState("CONNECTED");

          await readStream(response, (event) =>
            handleSSEEvent(event, activeChannelId)
          );

          // 실제 채널에서 메시지를 보낸 경우에만 ChatItem 업데이트 (임시 채널 제외)
          if (activeChannelId && !activeChannelId.startsWith("temp-")) {
            updateChatChannel(activeChannelId, message, processStatus);
            console.log("📝 기존 채널 ChatItem 업데이트:", activeChannelId);
          }
        } else {
          debugger;
        }

        return true;
      } catch (error) {
        console.error("❌ 스트림 처리 오류:", error);

        // 에러 발생시 responseBuffer 초기화
        setResponseBuffer([]);
        console.log("🗑️ 에러로 인한 응답 버퍼 초기화");

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
      createNewChannel,
      setResponseBuffer,
    ]
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
      await saveCurrentMessages(messageBuffer, channelId);
    }

    storeStartNewChat();
    setChannelId(undefined);
    setCurrentThreadId(undefined);
    setMessageBuffer([]); // 메시지 버퍼 초기화
    setResponseBuffer([]); // 응답 버퍼 초기화
    setPendingTableData(null); // 보류 중인 테이블 데이터 초기화
    setProcessStatus("TOPIC");
    setThreadState("IDLE");
    setConnectionState("DISCONNECTED");
  }, [
    storeStartNewChat,
    channelId,
    messageBuffer,
    saveCurrentMessages,
    setResponseBuffer,
    setPendingTableData,
  ]);

  // currentChannelId 변경시 store와 동기화 및 채널 메시지 로드
  useEffect(() => {
    const setStatueSynchronize = async () => {
      if (currentChannelId) {
        if (currentChannelId && channelId && channelId !== currentChannelId) {
          // 이전 채널 메시지 저장
          if (messageBuffer.length > 0) {
            await saveCurrentMessages(messageBuffer, channelId);
          }
        }

        // 실제 채널의 메시지 로드
        const messages = await loadChannelMessages(currentChannelId);
        setMessageBuffer(messages);

        console.log(
          "✅ 채널 전환 및 메시지 로드 완료:",
          currentChannelId,
          messages.length,
          "개"
        );
      }
    };

    setStatueSynchronize();
  }, [currentChannelId]);

  // currentThreadId 변경시 responseBuffer를 messageBuffer로 이관
  useEffect(() => {
    if (currentThreadId && responseBuffer.length > 0) {
      console.log(
        "📬 응답 버퍼를 메시지 버퍼로 이관 시작:",
        responseBuffer.length,
        "개"
      );

      // responseBuffer의 모든 메시지를 messageBuffer로 이관 (thread ID 업데이트)
      setMessageBuffer((prev) => [
        ...prev,
        ...responseBuffer.map((msg) => ({
          ...msg,
          threadId: currentThreadId, // 새로운 thread ID로 업데이트
        })),
      ]);

      // responseBuffer 초기화
      setResponseBuffer([]);

      console.log("✅ 응답 버퍼를 메시지 버퍼로 이관 완료");
    }
  }, [currentThreadId, responseBuffer]);

  // TODO 컬럼 호출 로직 수정 필요
  // pending Table Data 가 있으면 컬럼 보여줌
  useEffect(() => {
    // 보류 중인 테이블 데이터가 있으면 처리
    if (currentThreadId && pendingTableData) {
      processTableData(pendingTableData, currentThreadId);
      setPendingTableData(null); // 처리 후 클리어
    }
  }, [pendingTableData]);

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
      saveCurrentMessages(messageBuffer, channelId).finally(() => {
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
    // startAutoSave();

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
      handleSwitchChannel(providedThreadId);
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
        handleSwitchChannel(latestChannel.channelId);

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
        console.log("🔄 최근 채널 복구:", latestChannel.channelId);
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
    handleSwitchChannel,
  ]);

  return {
    // 상태
    threadState,
    connectionState,
    inputType,
    processStatus,
    channelId: channelId,
    messages: messageBuffer,
    chatItems,

    // 액션
    switchChannel: handleSwitchChannel,
    addMessage,
    setNextProcessStatus,
    sendMessage,
    // sendOptionMessage,
    startNewChat,
    fetchProcess,
  };
};
