import { useState, useEffect, useCallback } from "react";
import { ThreadState, InputType, SSEConnectionState } from "@/types/session";
import { ProcessStatus } from "@/utils/processStatus";
import { API_ENDPOINTS, getApiResponse } from "@/utils/apiEndpoints";
import { StreamSSEEvent } from "@/utils/streamProcessor";
import { generateId } from "@/stores/chatStore";
import { useChannel } from "./useChannel";
import { useMessageBuffer } from "./useMessageBuffer";
import { useProcessStatus } from "./useProcessStatus";
import { useSSEConnection } from "./useSSEConnection";

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
  const { serverUrl } = config;

  // 채널 관리 훅
  const {
    chatItems,
    currentChannelId,
    createNewChannel,
    switchChannel,
    updateChannel,
    updateChatChannel,
    startNewChat: storeStartNewChat,
    saveCurrentMessages,
    handleChannelSwitch,
  } = useChannel();

  // 메시지 버퍼 관리 훅
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();
  const {
    messageBuffer,
    addMessage,
    addResponseMessage,
    setMessageBuffer,
    setResponseBuffer,
    clearBuffers,
    migrateResponseToMessage,
  } = useMessageBuffer(currentThreadId);

  // 프로세스 상태 관리 훅
  const {
    processStatus,
    setProcessStatus,
    setNextProcessStatus: setNextStatus,
  } = useProcessStatus();

  // 로컬 상태
  const [inputType] = useState<InputType>("TEXT");
  const [channelId, setChannelId] = useState<string>();
  const [pendingTableData, setPendingTableData] = useState<string[] | null>(
    null
  );

  // setNextProcessStatus 래퍼 - 채널 업데이트 포함
  const setNextProcessStatus = useCallback(() => {
    debugger;
    setNextStatus((newStatus) => {
      // 현재 채널이 있으면 storage 업데이트
      if (channelId) {
        updateChatChannel(channelId, "", newStatus);
        console.log("💾 채널 프로세스 상태 업데이트:", channelId, newStatus);
      }
    });
  }, [channelId, updateChatChannel, setNextStatus]);

  // SSE 이벤트 처리 함수 정의
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

  // SSE 연결 관리 훅
  const {
    threadState,
    connectionState,
    setThreadState,
    setConnectionState,
    sendStreamMessage,
    sendApiMessage,
  } = useSSEConnection({
    serverUrl,
    onStreamEvent: handleSSEEvent,
  });

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

  const handleApiResponseEvent = useCallback(
    (response: any) => {
      switch (processStatus) {
        case "DATA_PROCESS":
          // processStatus / 특정 option으로 분기처리
          addResponseMessage(response.user_context, "ai");
          addResponseMessage(response.recommendations, "ai", "DATA_VISUALIZE");
          break;
        default:
          break;
      }
    },
    [processStatus]
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

        const { isStream } = API_ENDPOINTS[processStatus];
        const additionalParams = getAdditionParams(message);

        if (isStream) {
          // 스트림 메시지 전송
          const success = await sendStreamMessage(
            message,
            processStatus,
            activeChannelId,
            additionalParams
          );

          if (
            success &&
            activeChannelId &&
            !activeChannelId.startsWith("temp-")
          ) {
            updateChatChannel(activeChannelId, message, processStatus);
            console.log("📝 기존 채널 ChatItem 업데이트:", activeChannelId);
          }

          return success;
        } else {
          // 일반 API 호출
          const response = await sendApiMessage(
            message,
            processStatus,
            additionalParams
          );

          if (!response) {
            throw new Error("응답을 받을 수 없습니다.");
          }

          handleApiResponseEvent(response);

          return true;
        }
      } catch (error) {
        console.error("❌ 메시지 전송 오류:", error);
        setResponseBuffer([]);
        console.log("🗑️ 에러로 인한 응답 버퍼 초기화");
        return false;
      }
    },
    [
      channelId,
      processStatus,
      createNewChannel,
      setChannelId,
      setConnectionState,
      setThreadState,
      addMessage,
      sendStreamMessage,
      sendApiMessage,
      updateChatChannel,
      setResponseBuffer,
      addResponseMessage,
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
    clearBuffers(); // 메시지 버퍼 초기화
    setPendingTableData(null); // 보류 중인 테이블 데이터 초기화
    setProcessStatus("TOPIC");
    setThreadState("IDLE");
    setConnectionState("DISCONNECTED");
  }, [
    storeStartNewChat,
    channelId,
    messageBuffer,
    saveCurrentMessages,
    clearBuffers,
    setPendingTableData,
    setProcessStatus,
    setThreadState,
    setConnectionState,
  ]);

  // currentChannelId 변경시 채널 메시지 로드
  useEffect(() => {
    const handleChannelChange = async () => {
      if (currentChannelId) {
        const messages = await handleChannelSwitch(
          currentChannelId,
          messageBuffer,
          channelId
        );
        setMessageBuffer(messages);
      }
    };

    handleChannelChange();
  }, [currentChannelId, handleChannelSwitch]);

  // currentThreadId 변경시 responseBuffer를 messageBuffer로 이관
  useEffect(() => {
    if (currentThreadId) {
      migrateResponseToMessage(currentThreadId);
    }
  }, [currentThreadId, migrateResponseToMessage]);

  // TODO 컬럼 호출 로직 수정 필요
  // pending Table Data 가 있으면 컬럼 보여줌
  useEffect(() => {
    // 보류 중인 테이블 데이터가 있으면 처리
    if (currentThreadId && pendingTableData) {
      const processTableData = async (
        rawTableData: string[],
        threadId: string
      ) => {
        try {
          console.log("📊 테이블 데이터 처리 시작:", threadId);

          // 1. 메타데이터 API 호출
          const metadata = await getApiResponse(serverUrl, {
            path: "/contents/meta",
            method: "GET",
            params: {
              thread_id: threadId,
            },
          });

          // 2. 원본 데이터 파싱
          const [title, , ...dataLines] = rawTableData;

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

          addResponseMessage(JSON.stringify(tableData), "ai", "DATA_TABLE");

          console.log("✅ 테이블 데이터 처리 완료:", tableData);
        } catch (error) {
          console.error("❌ 테이블 데이터 처리 실패:", error);

          // 실패시 원본 텍스트로 fallback
          const fallbackContent = rawTableData.join("\n");
          addResponseMessage(fallbackContent, "ai");
        }
      };

      processTableData(pendingTableData, currentThreadId);
      setPendingTableData(null); // 처리 후 클리어
    }
  }, [pendingTableData]);

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
