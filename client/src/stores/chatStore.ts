import { create } from "zustand";
import { SSEMessage } from "@/hooks/useSSE";
import { ProcessStatus } from "@/types/session";
import { 
  getChatItems, 
  storeChatChannel, 
  updateChatChannel, 
  deleteChatChannel,
  updateChatItemTimestamp,
  ChatItem 
} from "@/utils/chatStorage";
import * as MessageStorage from "@/utils/messageStorage";
import { migrateData } from "@/utils/migrationHelper";

// 채팅 스토어 인터페이스 (단순화)
interface ChatStore {
  // 런타임 상태만 관리
  chatItems: ChatItem[];
  currentThreadId?: string;

  // 액션들
  loadInitialData: () => void;
  switchThread: (threadId: string) => void;
  storeChatChannel: (newItem: ChatItem) => void;
  updateChatChannel: (
    threadId: string,
    message: string,
    processStatus: ProcessStatus
  ) => void;
  deleteChatChannel: (threadId: string) => void;
  startNewChat: () => void;
  saveCurrentMessages: (messages: SSEMessage[]) => Promise<void>;
}

// 순수 Zustand 스토어 (persist 없음)
export const useChatStore = create<ChatStore>()((set, get) => ({
  // 초기 상태
  chatItems: [],
  currentThreadId: undefined,

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

  // 스레드 전환 - 현재 threadId만 업데이트 (메시지는 useSSE에서 관리)
  switchThread: async (threadId: string) => {
    try {
      console.log("🔄 스레드 전환 시작:", threadId);
      
      set({
        currentThreadId: threadId
      });
      
      console.log("✅ 스레드 전환 완료:", threadId);
    } catch (error) {
      console.error("❌ 스레드 전환 실패:", threadId, error);
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
        currentThreadId: undefined
      });
      
      console.log("🆕 새 채팅 시작");
    } catch (error) {
      console.error("❌ 새 채팅 시작 실패:", error);
    }
  },

  // 현재 메시지들 저장 (useSSE에서 전달받은 messageBuffer 저장)
  saveCurrentMessages: async (messages: SSEMessage[]) => {
    try {
      const { currentThreadId } = get();
      
      if (currentThreadId && messages.length > 0) {
        await MessageStorage.saveMessages(currentThreadId, messages);
        updateChatItemTimestamp(currentThreadId);
        console.log("💾 현재 메시지 저장 완료:", currentThreadId, messages.length, "개");
      }
    } catch (error) {
      console.error("❌ 메시지 저장 실패:", error);
    }
  },
}));