import { create } from "zustand";
import { SSEMessage } from "@/hooks/useSSE";
import * as MessageStorage from "@/utils/messageStorage";
import { migrateData } from "@/utils/migrationHelper";
import { ProcessStatus } from "@/utils/processStatus";

// ChatItem 타입 정의 (channelId 고정, lastThreadId 업데이트 가능)
export interface ChatItem {
  channelId: string; // 고정 채널 식별자 (변경 안됨)
  lastThreadId: string; // 현재 활성 threadId (API 호출용, 업데이트 됨)
  steps: string[]; // 진행된 threadId들 배열
  processStatus: ProcessStatus; // 현재 프로젝트 진행 단계
  lastProcess?: ProcessStatus; // 마지막 완료된 프로세스 단계
  process: Record<ProcessStatus, string[]>; // process별 사용된 threadId들
  submit: string; // 주제 (요약)
  createdAt: string; // 생성 시간
  updatedAt: string; // 마지막 업데이트 시간
}

// localStorage 키
const STORAGE_KEY = "vibecraft_thread";
// ID 생성 함수를 여기서 export
export const generateId = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// 채팅 스토어 인터페이스 (채널 중심으로 재정의)
interface ChatStore {
  // 런타임 상태만 관리
  chatItems: ChatItem[];
  currentChannelId?: string; // channelId를 관리하는 채널 ID
  lastThreadId?: string; // thread 마지막 ID (api 사용)

  // Private localStorage 함수들
  _getChatItems: () => ChatItem[];
  _saveThreadData: (chatItems: ChatItem[]) => void;
  _addChatItem: (newItem: ChatItem) => void;
  _updateChatItem: (
    channelId: string,
    newThreadId: string,
    processStatus: ProcessStatus,
    message?: string
  ) => void;
  _deleteChatItem: (channelId: string) => void;
  _updateTimestamp: (channelId: string) => void;

  // 공개 액션들
  loadInitialData: () => void;
  switchChannel: (channelId: string) => void; // 채널(channelId) 전환
  storeChatChannel: (newItem: ChatItem) => void;
  updateChatChannel: (
    channelId: string,
    newThreadId: string,
    processStatus: ProcessStatus,
    message?: string
  ) => void;
  deleteChatChannel: (channelId: string) => Promise<void>;
  startNewChat: () => void;
  saveCurrentMessages: (
    messages: SSEMessage[],
    channelId: string
  ) => Promise<void>;
  loadChannelMessages: (channelId: string) => Promise<SSEMessage[]>; // 채널별 통합 메시지 로드
}

// 순수 Zustand 스토어 (persist 없음)
export const useChatStore = create<ChatStore>()((set, get) => ({
  // 초기 상태
  chatItems: [],
  currentChannelId: undefined,
  lastThreadId: undefined,

  // ==================== PRIVATE LOCALSTORAGE 함수들 ====================
  _getChatItems: (): ChatItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.history || [];
      }
    } catch (error) {
      console.error("❌ ChatItems 로드 실패:", error);
    }
    return [];
  },

  _saveThreadData: (chatItems: ChatItem[]): void => {
    try {
      const data = { history: chatItems };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log("💾 ChatItems 저장 완료:", chatItems.length, "개");
    } catch (error) {
      console.error("❌ ChatItems 저장 실패:", error);
    }
  },

  _addChatItem: (newItem: ChatItem): void => {
    const chatItems = get()._getChatItems();
    const updatedItems = [newItem, ...chatItems].slice(0, 100);
    get()._saveThreadData(updatedItems);
  },

  _updateChatItem: (
    channelId: string,
    newThreadId: string,
    processStatus: ProcessStatus,
    message?: string
  ): void => {
    const chatItems = get()._getChatItems();
    const itemIndex = chatItems.findIndex(
      (item) => item.channelId === channelId
    );

    if (itemIndex !== -1) {
      const updatedItems = [...chatItems];
      const item = updatedItems[itemIndex];

      // lastThreadId 업데이트 (API 호출용)
      item.lastThreadId = newThreadId;
      item.lastProcess = processStatus;
      item.processStatus = processStatus;
      item.updatedAt = new Date().toISOString();

      // process에 새 threadId 추가
      if (!item.process[processStatus].includes(newThreadId)) {
        item.process[processStatus].push(newThreadId);
      }

      // steps에 새 threadId 추가
      if (!item.steps.includes(newThreadId)) {
        item.steps.push(newThreadId);
      }

      // TOPIC 단계에서 메시지가 있으면 submit 업데이트
      if (processStatus === "TOPIC" && message && message.trim()) {
        item.submit = message.slice(0, 100);
      }

      get()._saveThreadData(updatedItems);
      console.log(
        "📝 ChatItem 업데이트:",
        channelId,
        "threadId:",
        newThreadId,
        "status:",
        processStatus
      );
    }
  },

  _deleteChatItem: (channelId: string): void => {
    const chatItems = get()._getChatItems();
    const filteredItems = chatItems.filter(
      (item) => item.channelId !== channelId
    );
    get()._saveThreadData(filteredItems);
  },

  _updateTimestamp: (channelId: string): void => {
    const chatItems = get()._getChatItems();
    const itemIndex = chatItems.findIndex(
      (item) => item.channelId === channelId
    );

    if (itemIndex !== -1) {
      const updatedItems = [...chatItems];
      updatedItems[itemIndex].updatedAt = new Date().toISOString();
      get()._saveThreadData(updatedItems);
    }
  },

  // ==================== PUBLIC 액션들 ====================

  // 초기 데이터 로드
  loadInitialData: async () => {
    try {
      console.log("🔄 초기 데이터 로드 시작...");

      // 1. 데이터 마이그레이션 (필요시)
      await migrateData();

      // 2. ChatItems 로드
      const chatItems = get()._getChatItems();
      set({ chatItems });

      console.log("📋 ChatItems 로드 완료:", chatItems.length, "개");
    } catch (error) {
      console.error("❌ 초기 데이터 로드 실패:", error);
    }
  },

  // 채널 전환 - 채널(channelId) 기반으로 전체 세션 관리
  switchChannel: async (channelId: string) => {
    try {
      console.log("🔄 채널 전환 시작:", channelId);

      const chatItems = get()._getChatItems();
      const target = chatItems.find((item) => item.channelId === channelId);

      if (!target) throw new Error();

      // 현재 채널 ID 업데이트
      set({
        currentChannelId: channelId,
        lastThreadId: target.lastThreadId,
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
      const chatItem = chatItems.find((item) => item.channelId === channelId);

      if (!chatItem) {
        console.log("📭 채널 정보를 찾을 수 없음:", channelId);
        return [];
      }

      // 해당 채널의 모든 step(channelId)들의 메시지를 통합 로드
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
      get()._addChatItem(newItem);

      // 런타임 상태 업데이트
      const { chatItems } = get();
      const exists = chatItems.some(
        (item) => item.channelId === newItem.channelId
      );

      if (!exists) {
        const newChatItems = [newItem, ...chatItems].slice(0, 100);
        set({ chatItems: newChatItems });
        console.log("📝 ChatItem 추가:", newItem.channelId);
      }
    } catch (error) {
      console.error("❌ ChatItem 추가 실패:", error);
    }
  },

  // ChatItem 업데이트 (새 threadId 추가)
  updateChatChannel: (
    channelId: string,
    newThreadId: string,
    processStatus: ProcessStatus,
    message?: string
  ) => {
    try {
      // localStorage에 저장
      get()._updateChatItem(channelId, newThreadId, processStatus, message);

      // 런타임 상태 업데이트
      const { chatItems } = get();
      const itemIndex = chatItems.findIndex(
        (item) => item.channelId === channelId
      );

      if (itemIndex !== -1) {
        const updatedChatItems = [...chatItems];
        const item = updatedChatItems[itemIndex];

        // lastThreadId 업데이트 (API 호출용)
        item.lastThreadId = newThreadId;
        item.lastProcess = processStatus;
        item.processStatus = processStatus;
        item.updatedAt = new Date().toISOString();

        // process에 새 threadId 추가
        if (!item.process[processStatus].includes(newThreadId)) {
          item.process[processStatus].push(newThreadId);
        }

        // steps에 새 threadId 추가
        if (!item.steps.includes(newThreadId)) {
          item.steps.push(newThreadId);
        }

        // TOPIC 단계에서 메시지가 있으면 submit 업데이트
        if (processStatus === "TOPIC" && message && message.trim()) {
          item.submit = message.slice(0, 100);
        }

        set({ chatItems: updatedChatItems });
        console.log(
          "📝 ChatItem 업데이트:",
          channelId,
          "threadId:",
          newThreadId,
          "status:",
          processStatus
        );
      }
    } catch (error) {
      console.error("❌ ChatItem 업데이트 실패:", error);
    }
  },

  // ChatItem 삭제
  deleteChatChannel: async (channelId: string) => {
    try {
      // localStorage에서 삭제
      get()._deleteChatItem(channelId);

      // IndexedDB에서 메시지 삭제
      await MessageStorage.deleteMessages(channelId);

      // 런타임 상태 업데이트
      const { chatItems } = get();
      const filteredChatItems = chatItems.filter(
        (item) => item.channelId !== channelId
      );

      set({ chatItems: filteredChatItems });

      console.log("🗑️ ChatItem 삭제 완료:", channelId);
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
  saveCurrentMessages: async (messages: SSEMessage[], channelId: string) => {
    try {
      if (messages.length === 0) {
        return;
      }

      await MessageStorage.saveMessages(channelId, messages);
      get()._updateTimestamp(channelId);

      console.log(
        "💾 스레드별 메시지 저장 완료:",
        channelId,
        messages.length,
        "개"
      );
    } catch (error) {
      console.error("❌ 메시지 저장 실패:", error);
    }
  },
}));
