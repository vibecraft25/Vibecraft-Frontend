import { useCallback, useRef } from "react";
import { useChatStore, ChatItem } from "@/stores/chatStore";
import { ProcessStatus, getNextProcessStatus } from "@/utils/processStatus";
import { SSEMessage } from "@/hooks/useSSE";

export interface UseChannelReturn {
  // 상태
  chatItems: any[];
  currentChannelId?: string;
  lastThreadId?: string;
  isInitialized: boolean;

  // 채널 관리
  createNewChannel: (channelId: string, submit: string) => void;
  switchChannel: (channelId: string) => void;
  updateChannel: (
    channelId: string,
    newThreadId: string,
    processStatus: ProcessStatus,
    message?: string
  ) => Promise<void>;

  // Store 액션들
  storeChatChannel: (newItem: any) => void;
  updateChatChannel: (
    channelId: string,
    newThreadId: string,
    processStatus: ProcessStatus,
    message?: string
  ) => void;
  deleteChatChannel: (channelId: string) => Promise<void>;
  startNewChat: () => void;
  saveCurrentMessages: (messages: any[], channelId: string) => Promise<void>;
  loadChannelMessages: (channelId: string) => Promise<any[]>;

  // 세션 관리
  initializeSession: () => Promise<void>;
  restoreSession: (providedThreadId?: string, autoRestore?: boolean) => Promise<{
    channelId?: string;
    processStatus: ProcessStatus;
    threadState: string;
  }>;
  handleChannelSwitch: (channelId: string, messageBuffer: SSEMessage[], currentChannelId?: string) => Promise<SSEMessage[]>;
}

export const useChannel = (): UseChannelReturn => {
  // 초기화 상태 관리
  const initializedRef = useRef(false);
  const sessionRestoreRef = useRef(false);

  // Zustand store 상태와 액션들
  const chatItems = useChatStore((state) => state.chatItems);
  const currentChannelId = useChatStore((state) => state.currentChannelId);
  const lastThreadId = useChatStore((state) => state.lastThreadId);

  const {
    loadInitialData,
    switchChannel: switchCurrentChannel,
    storeChatChannel,
    updateChatChannel,
    startNewChat: storeStartNewChat,
    saveCurrentMessages,
    deleteChatChannel,
    loadChannelMessages,
  } = useChatStore();

  // 새 채널 생성
  const createNewChannel = useCallback(
    (channelId: string, submit: string) => {
      console.log("🆕 새 채널 생성 시작 - channelId:", channelId);

      const newChatItem: ChatItem = {
        channelId: channelId,
        lastThreadId: "", // 초기에는 비어있음, 첫 threadId 받으면 업데이트
        steps: [],
        processStatus: "TOPIC" as ProcessStatus,
        process: {
          TOPIC: [],
          DATA: [],
          DATA_PROCESS: [],
          BUILD: [],
          DEPLOY: [],
        },
        submit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store에 채널 저장
      storeChatChannel(newChatItem);

      // zustand store의 currentChannelId 업데이트
      switchCurrentChannel(channelId);

      console.log("✅ 새 채널 생성 완료:", channelId);
    },
    [storeChatChannel, switchCurrentChannel]
  );

  // 채널 전환
  const switchChannel = useCallback(
    (channelId: string) => {
      console.log("🔄 채널 전환:", channelId);
      switchCurrentChannel(channelId);
    },
    [switchCurrentChannel]
  );

  // 채널에 새 threadId 추가 및 lastThreadId 업데이트
  const updateChannel = useCallback(
    async (
      channelId: string,
      newThreadId: string,
      processStatus: ProcessStatus,
      message?: string
    ) => {
      try {
        console.log(
          "🔄 채널 업데이트 시작:",
          channelId,
          "threadId:",
          newThreadId,
          "status:",
          processStatus
        );

        // updateChatChannel로 새 threadId 추가 및 lastThreadId 업데이트
        updateChatChannel(channelId, newThreadId, processStatus, message);

        console.log(
          "✅ 채널 업데이트 완료:",
          channelId,
          "threadId:",
          newThreadId
        );
      } catch (error) {
        console.error("❌ 채널 업데이트 실패:", error);
      }
    },
    [updateChatChannel]
  );

  // 초기 세션 설정
  const initializeSession = useCallback(async () => {
    if (!initializedRef.current) {
      await loadInitialData();
      initializedRef.current = true;
      console.log("🔄 세션 초기화 완료");
    }
  }, [loadInitialData]);

  // 세션 복구 처리
  const restoreSession = useCallback(async (
    providedThreadId?: string,
    autoRestore: boolean = true
  ) => {
    if (sessionRestoreRef.current) {
      return {
        channelId: currentChannelId,
        processStatus: "TOPIC" as ProcessStatus,
        threadState: "IDLE"
      };
    }

    // 제공된 threadId가 있으면 해당 채널로 전환
    if (providedThreadId) {
      switchCurrentChannel(providedThreadId);
      sessionRestoreRef.current = true;
      console.log("🔄 제공된 채널로 복구:", providedThreadId);
      return {
        channelId: providedThreadId,
        processStatus: "TOPIC" as ProcessStatus,
        threadState: "READY"
      };
    }

    // 자동 복구 비활성화시
    if (!autoRestore) {
      console.log("🔒 자동 복구 비활성화 - IDLE 상태로 설정");
      sessionRestoreRef.current = true;
      return {
        processStatus: "TOPIC" as ProcessStatus,
        threadState: "IDLE"
      };
    }

    // chatItems가 로드된 후 자동 연결
    try {
      if (chatItems.length > 0) {
        const latestChannel = chatItems[0];
        switchCurrentChannel(latestChannel.channelId);

        // lastProcess가 있으면 다음 단계로, 없으면 현재 processStatus 유지
        const processStatus = latestChannel.lastProcess
          ? getNextProcessStatus(latestChannel.lastProcess)
          : latestChannel.processStatus;

        console.log(
          "📊 복구된 프로세스 상태:",
          latestChannel.lastProcess ? `${latestChannel.lastProcess} → ${processStatus}` : processStatus
        );

        sessionRestoreRef.current = true;
        console.log("🔄 최근 채널 복구:", latestChannel.channelId);
        
        return {
          channelId: latestChannel.channelId,
          processStatus,
          threadState: "READY"
        };
      } else {
        sessionRestoreRef.current = true;
        return {
          processStatus: "TOPIC" as ProcessStatus,
          threadState: "FIRST_VISIT"
        };
      }
    } catch (error) {
      console.error("❌ 세션 복구 실패:", error);
      sessionRestoreRef.current = true;
      return {
        processStatus: "TOPIC" as ProcessStatus,
        threadState: "FIRST_VISIT"
      };
    }
  }, [chatItems.length, currentChannelId, switchCurrentChannel]);

  // 채널 전환시 메시지 로드 처리
  const handleChannelSwitch = useCallback(async (
    targetChannelId: string,
    messageBuffer: SSEMessage[],
    currentChannelId?: string
  ): Promise<SSEMessage[]> => {
    try {
      // 이전 채널 메시지 저장
      if (currentChannelId && targetChannelId !== currentChannelId && messageBuffer.length > 0) {
        await saveCurrentMessages(messageBuffer, currentChannelId);
        console.log("💾 이전 채널 메시지 저장 완료:", currentChannelId, messageBuffer.length, "개");
      }

      // 새 채널의 메시지 로드
      const messages = await loadChannelMessages(targetChannelId);
      
      console.log(
        "✅ 채널 전환 및 메시지 로드 완료:",
        targetChannelId,
        messages.length,
        "개"
      );
      
      return messages;
    } catch (error) {
      console.error("❌ 채널 전환 실패:", error);
      return [];
    }
  }, [saveCurrentMessages, loadChannelMessages]);

  // 새 채팅 시작
  const startNewChat = useCallback(() => {
    console.log("🆕 새 채팅 시작");
    storeStartNewChat();
  }, [storeStartNewChat]);

  return {
    // 상태
    chatItems,
    currentChannelId,
    lastThreadId,
    isInitialized: initializedRef.current,

    // 채널 관리
    createNewChannel,
    switchChannel,
    updateChannel,

    // Store 액션들
    storeChatChannel,
    updateChatChannel,
    deleteChatChannel,
    startNewChat,
    saveCurrentMessages,
    loadChannelMessages,

    // 세션 관리
    initializeSession,
    restoreSession,
    handleChannelSwitch,
  };
};
