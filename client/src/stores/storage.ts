import { openDB, DBSchema, IDBPDatabase } from 'idb';
import LZString from 'lz-string';

// IndexedDB 스키마 정의
interface ChatDB extends DBSchema {
  'chat-data': {
    key: string;
    value: string;
  };
}

// IndexedDB 인스턴스
let dbInstance: IDBPDatabase<ChatDB> | null = null;

// IndexedDB 초기화
const initDB = async (): Promise<IDBPDatabase<ChatDB>> => {
  if (dbInstance) return dbInstance;
  
  try {
    dbInstance = await openDB<ChatDB>('vibecraft-chat-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('chat-data')) {
          db.createObjectStore('chat-data');
        }
      },
    });
    return dbInstance;
  } catch (error) {
    console.error('IndexedDB 초기화 실패:', error);
    throw error;
  }
};

// IndexedDB 헬퍼 함수들
const idbGet = async (key: string): Promise<string | null> => {
  try {
    const db = await initDB();
    const result = await db.get('chat-data', key);
    return result || null;
  } catch (error) {
    console.error('IndexedDB 읽기 실패:', error);
    return null;
  }
};

const idbSet = async (key: string, value: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.put('chat-data', value, key);
  } catch (error) {
    console.error('IndexedDB 쓰기 실패:', error);
    throw error;
  }
};

const idbDelete = async (key: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.delete('chat-data', key);
  } catch (error) {
    console.error('IndexedDB 삭제 실패:', error);
    throw error;
  }
};

// 레거시 압축 저장소 (더 이상 사용되지 않음)
// MessageStorage가 메시지 저장을 담당하고, ChatStorage가 메타정보를 담당
export const createSmartCompressedStorage = () => {
  console.warn('⚠️ createSmartCompressedStorage는 더 이상 사용되지 않습니다. MessageStorage를 사용하세요.');
  
  return {
    getItem: async (key: string): Promise<string | null> => {
      return localStorage.getItem(key);
    },
    
    setItem: async (key: string, value: string): Promise<void> => {
      localStorage.setItem(key, value);
    },
    
    removeItem: async (key: string): Promise<void> => {
      localStorage.removeItem(key);
    }
  };
};

// 오래된 데이터 정리 함수
const cleanupOldData = async (): Promise<void> => {
  try {
    // localStorage에서 오래된 항목들 제거
    const keys = Object.keys(localStorage);
    const chatKeys = keys.filter(key => key.startsWith('vibecraft-'));
    
    if (chatKeys.length > 10) {
      // 가장 오래된 키들 제거 (간단한 정리)
      const keysToRemove = chatKeys.slice(0, Math.floor(chatKeys.length / 3));
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`🧹 정리 완료: ${keysToRemove.length}개 항목 제거`);
    }
  } catch (error) {
    console.error('데이터 정리 실패:', error);
  }
};

// 저장소 상태 체크
export const getStorageInfo = async () => {
  try {
    // localStorage 사용량 추정
    let localStorageSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        localStorageSize += localStorage[key].length + key.length;
      }
    }
    
    return {
      localStorage: {
        used: (localStorageSize / 1024).toFixed(1) + 'KB',
        available: 'Unknown'
      },
      indexedDB: {
        available: !!window.indexedDB
      }
    };
  } catch (error) {
    console.error('저장소 정보 조회 실패:', error);
    return null;
  }
};