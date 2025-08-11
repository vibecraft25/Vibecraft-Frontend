import { useCallback } from "react";
import { useChatStore, ChatItem } from "@/stores/chatStore";
import { ProcessStatus } from "@/utils/processStatus";

export interface UseChannelReturn {
  // 상태
  chatItems: any[];
  currentChannelId?: string;
  lastThreadId?: string;

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
}

export const useChannel = (): UseChannelReturn => {
  // Zustand store 상태와 액션들
  const chatItems = useChatStore((state) => state.chatItems);
  const currentChannelId = useChatStore((state) => state.currentChannelId);
  const lastThreadId = useChatStore((state) => state.lastThreadId);

  const {
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
  };
};
