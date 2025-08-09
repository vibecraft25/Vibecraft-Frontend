import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SSEMessage } from '@/hooks/useSSE';

// IndexedDB 스키마 정의 - 메시지 전용
interface MessageDB extends DBSchema {
  'messages': {
    key: string; // threadId
    value: SSEMessage[];
  };
}

// IndexedDB 인스턴스
let messageDBInstance: IDBPDatabase<MessageDB> | null = null;

// IndexedDB 초기화
const initMessageDB = async (): Promise<IDBPDatabase<MessageDB>> => {
  if (messageDBInstance) return messageDBInstance;
  
  try {
    messageDBInstance = await openDB<MessageDB>('vibecraft-messages-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages');
        }
      },
    });
    console.log('📁 MessageDB 초기화 완료');
    return messageDBInstance;
  } catch (error) {
    console.error('❌ MessageDB 초기화 실패:', error);
    throw error;
  }
};

/**
 * 특정 스레드의 모든 메시지 가져오기 (백업 포함)
 */
export const getMessages = async (threadId: string): Promise<SSEMessage[]> => {
  try {
    // 1차: IndexedDB에서 로드
    const db = await initMessageDB();
    const messages = await db.get('messages', threadId);
    
    if (messages && messages.length > 0) {
      console.log(`📨 메시지 로드: ${threadId} (${messages.length}개)`);
      return messages;
    }
    
    // 2차: IndexedDB에 없으면 localStorage 백업에서 로드
    console.log(`🔍 IndexedDB에서 메시지를 찾을 수 없어 localStorage 백업 확인: ${threadId}`);
    const backupMessages = loadFromLocalStorageBackup(threadId);
    
    if (backupMessages.length > 0) {
      // 백업에서 복원된 메시지를 IndexedDB에 다시 저장
      try {
        await db.put('messages', backupMessages, threadId);
        console.log(`✅ localStorage 백업에서 IndexedDB로 복원: ${threadId} (${backupMessages.length}개)`);
      } catch (restoreError) {
        console.error('❌ 백업 메시지 복원 실패:', threadId, restoreError);
      }
      return backupMessages;
    }
    
    console.log(`📨 메시지 로드: ${threadId} (0개)`);
    return [];
  } catch (error) {
    console.error('❌ 메시지 로드 실패:', threadId, error);
    
    // IndexedDB 완전 실패시 localStorage 백업만 시도
    const backupMessages = loadFromLocalStorageBackup(threadId);
    console.log(`🔄 IndexedDB 실패로 localStorage 백업만 사용: ${threadId} (${backupMessages.length}개)`);
    return backupMessages;
  }
};

/**
 * localStorage 백업 저장 (IndexedDB 실패 시 사용)
 */
const saveToLocalStorageBackup = (threadId: string, messages: SSEMessage[]): void => {
  try {
    const key = `vibecraft_messages_backup_${threadId}`;
    const data = JSON.stringify({
      threadId,
      messages,
      timestamp: Date.now()
    });
    localStorage.setItem(key, data);
    console.log(`🔄 localStorage 백업 저장: ${threadId} (${messages.length}개)`);
  } catch (error) {
    console.error('❌ localStorage 백업 저장 실패:', threadId, error);
  }
};

/**
 * localStorage 백업에서 복원
 */
const loadFromLocalStorageBackup = (threadId: string): SSEMessage[] => {
  try {
    const key = `vibecraft_messages_backup_${threadId}`;
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      console.log(`🔄 localStorage 백업에서 복원: ${threadId} (${parsed.messages?.length || 0}개)`);
      return parsed.messages || [];
    }
  } catch (error) {
    console.error('❌ localStorage 백업 복원 실패:', threadId, error);
  }
  return [];
};

/**
 * 스레드의 메시지들 전체 저장/교체 (백업 포함)
 */
export const saveMessages = async (threadId: string, messages: SSEMessage[]): Promise<void> => {
  try {
    // 1차: IndexedDB 저장
    const db = await initMessageDB();
    await db.put('messages', messages, threadId);
    console.log(`💾 메시지 저장: ${threadId} (${messages.length}개)`);
    
    // 2차: localStorage 백업 저장
    saveToLocalStorageBackup(threadId, messages);
  } catch (error) {
    console.error('❌ 메시지 저장 실패:', threadId, error);
    
    // IndexedDB 실패시 localStorage 백업만 저장
    saveToLocalStorageBackup(threadId, messages);
    throw error;
  }
};

/**
 * 스레드에 단일 메시지 추가 (기존 메시지와 병합)
 */
export const addMessage = async (threadId: string, message: SSEMessage): Promise<void> => {
  try {
    const existingMessages = await getMessages(threadId);
    
    // 중복 방지: messageId로 확인
    const duplicateIndex = existingMessages.findIndex(
      msg => msg.messageId === message.messageId
    );
    
    if (duplicateIndex === -1) {
      const updatedMessages = [...existingMessages, message];
      await saveMessages(threadId, updatedMessages);
      console.log(`➕ 메시지 추가: ${threadId} (${message.messageId})`);
    } else {
      console.log(`⚠️ 중복 메시지 감지, 추가 건너뜀: ${message.messageId}`);
    }
  } catch (error) {
    console.error('❌ 메시지 추가 실패:', threadId, message.messageId, error);
    throw error;
  }
};

/**
 * 스레드의 모든 메시지 삭제
 */
export const deleteMessages = async (threadId: string): Promise<void> => {
  try {
    const db = await initMessageDB();
    await db.delete('messages', threadId);
    console.log(`🗑️ 메시지 삭제: ${threadId}`);
  } catch (error) {
    console.error('❌ 메시지 삭제 실패:', threadId, error);
    throw error;
  }
};

/**
 * 모든 메시지 데이터 삭제 (초기화용)
 */
export const clearAllMessages = async (): Promise<void> => {
  try {
    const db = await initMessageDB();
    const tx = db.transaction('messages', 'readwrite');
    await tx.objectStore('messages').clear();
    await tx.done;
    console.log('🧹 모든 메시지 데이터 삭제 완료');
  } catch (error) {
    console.error('❌ 모든 메시지 삭제 실패:', error);
    throw error;
  }
};

/**
 * 저장된 모든 스레드 ID 목록 가져오기
 */
export const getAllThreadIds = async (): Promise<string[]> => {
  try {
    const db = await initMessageDB();
    const keys = await db.getAllKeys('messages');
    console.log(`📋 저장된 스레드 목록: ${keys.length}개`);
    return keys;
  } catch (error) {
    console.error('❌ 스레드 목록 조회 실패:', error);
    return [];
  }
};

/**
 * 메시지 저장소 통계 정보
 */
export const getStorageStats = async () => {
  try {
    const threadIds = await getAllThreadIds();
    let totalMessages = 0;
    
    for (const threadId of threadIds) {
      const messages = await getMessages(threadId);
      totalMessages += messages.length;
    }
    
    return {
      totalThreads: threadIds.length,
      totalMessages,
      averageMessages: threadIds.length > 0 ? Math.round(totalMessages / threadIds.length) : 0
    };
  } catch (error) {
    console.error('❌ 저장소 통계 조회 실패:', error);
    return null;
  }
};