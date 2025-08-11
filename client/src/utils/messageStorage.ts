import { openDB, DBSchema, IDBPDatabase } from "idb";
import { SSEMessage } from "@/hooks/useSSE";

// IndexedDB 스키마 정의 - 메시지 전용
interface MessageDB extends DBSchema {
  messages: {
    key: string; // channelId
    value: SSEMessage[];
  };
}

// IndexedDB 인스턴스
let messageDBInstance: IDBPDatabase<MessageDB> | null = null;

// IndexedDB 초기화
const initMessageDB = async (): Promise<IDBPDatabase<MessageDB>> => {
  if (messageDBInstance) return messageDBInstance;

  try {
    messageDBInstance = await openDB<MessageDB>("vibecraft-messages-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("messages")) {
          db.createObjectStore("messages");
        }
      },
    });
    console.log("📁 MessageDB 초기화 완료");
    return messageDBInstance;
  } catch (error) {
    console.error("❌ MessageDB 초기화 실패:", error);
    throw error;
  }
};

/**
 * channelId의 모든 메시지 가져오기 (백업 포함)
 */
export const getMessages = async (channelId: string): Promise<SSEMessage[]> => {
  try {
    const db = await initMessageDB();
    const messages = await db.get("messages", channelId);

    if (messages && messages.length > 0) {
      console.log(`📨 메시지 로드: ${channelId} (${messages.length}개)`);
      return messages;
    }

    console.log(`📨 메시지 로드: ${channelId} (0개)`);
    return [];
  } catch (error) {
    console.error("❌ 메시지 로드 실패:", channelId, error);
    return [];
  }
};

/**
 * 스레드의 메시지들 전체 저장/교체 (백업 포함)
 */
export const saveMessages = async (
  channelId: string,
  messages: SSEMessage[]
): Promise<void> => {
  try {
    const db = await initMessageDB();
    await db.put("messages", messages, channelId);
    console.log(`💾 메시지 저장: ${channelId} (${messages.length}개)`);
  } catch (error) {
    console.error("❌ 메시지 저장 실패:", channelId, error);
    throw error;
  }
};

/**
 * 스레드에 단일 메시지 추가 (기존 메시지와 병합)
 */
export const addMessage = async (
  channelId: string,
  message: SSEMessage
): Promise<void> => {
  try {
    const existingMessages = await getMessages(channelId);

    // 중복 방지: messageId로 확인
    const duplicateIndex = existingMessages.findIndex(
      (msg) => msg.messageId === message.messageId
    );

    if (duplicateIndex === -1) {
      const updatedMessages = [...existingMessages, message];
      await saveMessages(channelId, updatedMessages);
      console.log(`➕ 메시지 추가: ${channelId} (${message.messageId})`);
    } else {
      console.log(`⚠️ 중복 메시지 감지, 추가 건너뜀: ${message.messageId}`);
    }
  } catch (error) {
    console.error("❌ 메시지 추가 실패:", channelId, message.messageId, error);
    throw error;
  }
};

/**
 * 스레드의 모든 메시지 삭제
 */
export const deleteMessages = async (channelId: string): Promise<void> => {
  try {
    const db = await initMessageDB();
    await db.delete("messages", channelId);
    console.log(`🗑️ 메시지 삭제: ${channelId}`);
  } catch (error) {
    console.error("❌ 메시지 삭제 실패:", channelId, error);
    throw error;
  }
};

/**
 * 모든 메시지 데이터 삭제 (초기화용)
 */
export const clearAllMessages = async (): Promise<void> => {
  try {
    const db = await initMessageDB();
    const tx = db.transaction("messages", "readwrite");
    await tx.objectStore("messages").clear();
    await tx.done;
    console.log("🧹 모든 메시지 데이터 삭제 완료");
  } catch (error) {
    console.error("❌ 모든 메시지 삭제 실패:", error);
    throw error;
  }
};

/**
 * 저장된 모든 채널 ID 목록 가져오기
 */
export const getAllChannelIds = async (): Promise<string[]> => {
  try {
    const db = await initMessageDB();
    const keys = await db.getAllKeys("messages");
    console.log(`📋 저장된 채널 목록: ${keys.length}개`);
    return keys;
  } catch (error) {
    console.error("❌ 채널 목록 조회 실패:", error);
    return [];
  }
};

/**
 * 메시지 저장소 통계 정보
 */
export const getStorageStats = async () => {
  try {
    const channelIds = await getAllChannelIds();
    let totalMessages = 0;

    for (const channelId of channelIds) {
      const messages = await getMessages(channelId);
      totalMessages += messages.length;
    }

    return {
      totalchannels: channelIds.length,
      totalMessages,
      averageMessages:
        channelIds.length > 0
          ? Math.round(totalMessages / channelIds.length)
          : 0,
    };
  } catch (error) {
    console.error("❌ 저장소 통계 조회 실패:", error);
    return null;
  }
};
