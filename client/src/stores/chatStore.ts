import { create } from "zustand";
import { SSEMessage } from "@/hooks/useSSE";
import { ProcessStatus } from "@/types/session";
import {
  getChatItems,
  storeChatChannel,
  updateChatChannel,
  deleteChatChannel,
  updateChatItemTimestamp,
  ChatItem,
} from "@/utils/chatStorage";
import * as MessageStorage from "@/utils/messageStorage";
import { migrateData } from "@/utils/migrationHelper";

// 채팅 스토어 인터페이스 (채널 중심으로 재정의)
interface ChatStore {
  // 런타임 상태만 관리
  chatItems: ChatItem[];
  currentChannelId?: string; // rootThreadId를 관리하는 채널 ID

  // 액션들
  loadInitialData: () => void;
  switchChannel: (channelId: string) => void; // 채널(rootThreadId) 전환
  storeChatChannel: (newItem: ChatItem) => void;
  updateChatChannel: (
    threadId: string,
    message: string,
    processStatus: ProcessStatus
  ) => void;
  deleteChatChannel: (threadId: string) => void;
  startNewChat: () => void;
  saveCurrentMessages: (messages: SSEMessage[]) => Promise<void>;
  loadChannelMessages: (channelId: string) => Promise<SSEMessage[]>; // 채널별 통합 메시지 로드
}

// 순수 Zustand 스토어 (persist 없음)
export const useChatStore = create<ChatStore>()((set, get) => ({
  // 초기 상태
  chatItems: [],
  currentChannelId: undefined,

  // 초기 데이터 로드 - 마이그레이션 후 localStorage에서 ChatItems만 로드
  loadInitialData: async () => {
    try {
      console.log("🔄 초기 데이터 로드 시작...");

      // 1. 데이터 마이그레이션 (필요시)
      await migrateData();

      // 2. ChatItems 로드
      const chatItems = getChatItems();
      set({ chatItems });

      console.log("📋 ChatItems 로드 완료:", chatItems.length, "개");
    } catch (error) {
      console.error("❌ 초기 데이터 로드 실패:", error);
    }
  },

  // 채널 전환 - 채널(rootThreadId) 기반으로 전체 세션 관리
  switchChannel: async (channelId: string) => {
    try {
      console.log("🔄 채널 전환 시작:", channelId);

      // 현재 채널 ID 업데이트
      set({
        currentChannelId: channelId,
      });

      console.log("✅ 채널 전환 완료:", channelId);
    } catch (error) {
      console.error("❌ 채널 전환 실패:", channelId, error);
    }
  },

  // 채널별 통합 메시지 로드 - 해당 채널의 모든 step 메시지들을 통합하여 로드
  loadChannelMessages: async (channelId: string): Promise<SSEMessage[]> => {
    try {
      console.log("📨 채널 메시지 로드 시작:", channelId);

      const { chatItems } = get();
      const chatItem = chatItems.find(
        (item) => item.rootThreadId === channelId
      );

      if (!chatItem) {
        console.log("📭 채널 정보를 찾을 수 없음:", channelId);
        return [];
      }

      // 해당 채널의 모든 step(threadId)들의 메시지를 통합 로드
      const allMessages: SSEMessage[] = await MessageStorage.getMessages(
        channelId
      );

      // 시간순으로 정렬
      allMessages.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });

      console.log(
        "✅ 채널 메시지 로드 완료:",
        channelId,
        allMessages.length,
        "개"
      );
      return allMessages;
    } catch (error) {
      console.error("❌ 채널 메시지 로드 실패:", channelId, error);
      return [];
    }
  },

  // ChatItem 추가
  storeChatChannel: (newItem: ChatItem) => {
    try {
      // localStorage에 저장
      storeChatChannel(newItem);

      // 런타임 상태 업데이트
      const { chatItems } = get();
      const exists = chatItems.some(
        (item) => item.rootThreadId === newItem.rootThreadId
      );

      if (!exists) {
        const newChatItems = [newItem, ...chatItems].slice(0, 100);
        set({ chatItems: newChatItems });
        console.log("📝 ChatItem 추가:", newItem.rootThreadId);
      }
    } catch (error) {
      console.error("❌ ChatItem 추가 실패:", error);
    }
  },

  // ChatItem 업데이트
  updateChatChannel: (
    threadId: string,
    message: string,
    processStatus: ProcessStatus
  ) => {
    try {
      // localStorage에 저장
      updateChatChannel(threadId, message, processStatus);

      // 런타임 상태 업데이트
      const { chatItems } = get();
      const itemIndex = chatItems.findIndex(
        (item) => item.rootThreadId === threadId
      );

      if (itemIndex !== -1) {
        const updatedChatItems = [...chatItems];
        const item = updatedChatItems[itemIndex];

        item.lastProcess = processStatus;
        item.lastThreadId = threadId;
        item.updatedAt = new Date().toISOString();

        if (!item.process[processStatus].includes(threadId)) {
          item.process[processStatus].push(threadId);
        }

        if (!item.steps.includes(threadId)) {
          item.steps.push(threadId);
        }

        if (processStatus === "TOPIC" && message.trim()) {
          item.submit = message.slice(0, 100);
        }

        set({ chatItems: updatedChatItems });
        console.log("📝 ChatItem 업데이트:", threadId);
      }
    } catch (error) {
      console.error("❌ ChatItem 업데이트 실패:", error);
    }
  },

  // ChatItem 삭제
  deleteChatChannel: async (threadId: string) => {
    try {
      // localStorage에서 삭제
      deleteChatChannel(threadId);

      // IndexedDB에서 메시지 삭제
      await MessageStorage.deleteMessages(threadId);

      // 런타임 상태 업데이트
      const { chatItems } = get();
      const filteredChatItems = chatItems.filter(
        (item) => item.rootThreadId !== threadId
      );

      set({ chatItems: filteredChatItems });

      console.log("🗑️ ChatItem 삭제 완료:", threadId);
    } catch (error) {
      console.error("❌ ChatItem 삭제 실패:", error);
    }
  },

  // 새 채팅 시작
  startNewChat: async () => {
    try {
      set({
        currentChannelId: undefined,
      });

      console.log("🆕 새 채팅 시작");
    } catch (error) {
      console.error("❌ 새 채팅 시작 실패:", error);
    }
  },

  // 현재 메시지들 저장 (useSSE에서 전달받은 messageBuffer를 현재 활성 thread에 저장)
  saveCurrentMessages: async (messages: SSEMessage[]) => {
    try {
      if (messages.length === 0) {
        return;
      }

      // 메시지들을 threadId별로 그룹화
      const messagesByThreadId = messages.reduce((acc, message) => {
        const threadId = message.threadId;
        if (!acc[threadId]) {
          acc[threadId] = [];
        }
        acc[threadId].push(message);
        return acc;
      }, {} as Record<string, SSEMessage[]>);

      // 각 threadId별로 저장
      for (const [threadId, threadMessages] of Object.entries(
        messagesByThreadId
      )) {
        if (threadId && threadMessages.length > 0) {
          await MessageStorage.saveMessages(threadId, threadMessages);
          updateChatItemTimestamp(threadId);
          console.log(
            "💾 스레드별 메시지 저장 완료:",
            threadId,
            threadMessages.length,
            "개"
          );
        }
      }
    } catch (error) {
      console.error("❌ 메시지 저장 실패:", error);
    }
  },
}));
