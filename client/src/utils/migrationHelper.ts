/**
 * 데이터 마이그레이션 헬퍼
 * 기존 vibecraft-chat-store 구조를 새로운 구조로 변환
 */

import * as MessageStorage from './messageStorage';
import { ChatItem } from '@/stores/chatStore';

const MIGRATION_KEY = 'vibecraft_migration_completed';
const OLD_STORE_KEY = 'vibecraft-chat-store';

interface OldStoreData {
  state: {
    chatItems: ChatItem[];
    messages: { [threadId: string]: any[] };
    currentThreadId?: string;
  };
  version: number;
}

/**
 * 마이그레이션이 필요한지 확인
 */
export const needsMigration = (): boolean => {
  // 이미 마이그레이션 완료된 경우
  if (localStorage.getItem(MIGRATION_KEY)) {
    return false;
  }

  // 기존 데이터가 있는 경우만 마이그레이션 필요
  const oldData = localStorage.getItem(OLD_STORE_KEY);
  return !!oldData;
};

/**
 * 기존 데이터를 새 구조로 마이그레이션
 */
export const migrateData = async (): Promise<boolean> => {
  if (!needsMigration()) {
    console.log('✅ 마이그레이션이 필요하지 않습니다.');
    return true;
  }

  try {
    console.log('🔄 데이터 마이그레이션 시작...');

    // 1. 기존 데이터 읽기
    const oldDataRaw = localStorage.getItem(OLD_STORE_KEY);
    if (!oldDataRaw) {
      console.log('⚠️ 기존 데이터를 찾을 수 없습니다.');
      markMigrationCompleted();
      return true;
    }

    let oldData: OldStoreData;
    try {
      oldData = JSON.parse(oldDataRaw);
    } catch (parseError) {
      console.error('❌ 기존 데이터 파싱 실패:', parseError);
      markMigrationCompleted(); // 손상된 데이터는 무시
      return false;
    }

    // 2. 데이터 구조 검증
    if (!oldData.state || !Array.isArray(oldData.state.chatItems)) {
      console.log('⚠️ 올바르지 않은 데이터 구조입니다.');
      markMigrationCompleted();
      return true;
    }

    const { chatItems, messages } = oldData.state;

    // 3. ChatItems를 localStorage로 마이그레이션
    const threadData = { history: chatItems };
    
    console.log(`📋 ChatItems 마이그레이션: ${chatItems.length}개`);
    localStorage.setItem('vibecraft_thread', JSON.stringify(threadData));

    // 4. Messages를 IndexedDB로 마이그레이션
    if (messages && typeof messages === 'object') {
      const threadIds = Object.keys(messages);
      console.log(`📨 메시지 마이그레이션 시작: ${threadIds.length}개 스레드`);

      let migratedThreads = 0;
      let totalMessages = 0;

      for (const threadId of threadIds) {
        try {
          const threadMessages = messages[threadId];
          
          if (Array.isArray(threadMessages) && threadMessages.length > 0) {
            await MessageStorage.saveMessages(threadId, threadMessages);
            migratedThreads++;
            totalMessages += threadMessages.length;
            console.log(`✅ 스레드 ${threadId}: ${threadMessages.length}개 메시지 마이그레이션 완료`);
          }
        } catch (messageError) {
          console.error(`❌ 스레드 ${threadId} 마이그레이션 실패:`, messageError);
          // 개별 스레드 실패는 전체 마이그레이션을 중단하지 않음
        }
      }

      console.log(`📊 메시지 마이그레이션 완료: ${migratedThreads}개 스레드, ${totalMessages}개 메시지`);
    }

    // 5. 마이그레이션 완료 표시
    markMigrationCompleted();

    // 6. 기존 데이터 백업 후 정리 (선택적)
    await cleanupOldData();

    console.log('🎉 데이터 마이그레이션이 성공적으로 완료되었습니다!');
    
    // 7. 저장소 통계 출력
    const stats = await MessageStorage.getStorageStats();
    if (stats) {
      console.log('📊 새로운 저장소 통계:', stats);
    }

    return true;

  } catch (error) {
    console.error('❌ 데이터 마이그레이션 실패:', error);
    return false;
  }
};

/**
 * 마이그레이션 완료 표시
 */
const markMigrationCompleted = () => {
  localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
};

/**
 * 기존 데이터 정리 (백업 후)
 */
const cleanupOldData = async (): Promise<void> => {
  try {
    // 백업 생성 (혹시 모를 상황을 위해)
    const oldData = localStorage.getItem(OLD_STORE_KEY);
    if (oldData) {
      const backupKey = `${OLD_STORE_KEY}_backup_${Date.now()}`;
      localStorage.setItem(backupKey, oldData);
      console.log('💾 기존 데이터 백업 생성:', backupKey);

      // 원본 제거
      localStorage.removeItem(OLD_STORE_KEY);
      console.log('🗑️ 기존 데이터 정리 완료');

      // 오래된 백업들 정리 (5개 이상이면)
      const allKeys = Object.keys(localStorage);
      const backupKeys = allKeys
        .filter(key => key.startsWith(`${OLD_STORE_KEY}_backup_`))
        .sort(); // 시간순 정렬

      if (backupKeys.length > 5) {
        const keysToRemove = backupKeys.slice(0, backupKeys.length - 5);
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 오래된 백업 정리: ${keysToRemove.length}개`);
      }
    }
  } catch (error) {
    console.error('⚠️ 기존 데이터 정리 중 오류:', error);
    // 정리 실패는 마이그레이션 전체를 실패시키지 않음
  }
};

/**
 * 마이그레이션 상태 초기화 (개발/테스트용)
 */
export const resetMigration = () => {
  localStorage.removeItem(MIGRATION_KEY);
  console.log('🔄 마이그레이션 상태 초기화 완료');
};

/**
 * 저장소 정보 출력 (디버깅용)
 */
export const printStorageInfo = async () => {
  console.log('=== 저장소 정보 ===');
  
  // localStorage 정보
  const threadDataRaw = localStorage.getItem('vibecraft_thread');
  if (threadDataRaw) {
    try {
      const threadData = JSON.parse(threadDataRaw);
      console.log('📋 ChatItems:', threadData.history?.length || 0, '개');
    } catch {
      console.log('📋 ChatItems: 파싱 실패');
    }
  } else {
    console.log('📋 ChatItems: 없음');
  }

  // IndexedDB 정보
  const stats = await MessageStorage.getStorageStats();
  if (stats) {
    console.log('📨 메시지 채널:', stats.totalchannels, '개');
    console.log('📨 전체 메시지:', stats.totalMessages, '개');
    console.log('📨 평균 메시지:', stats.averageMessages, '개/스레드');
  }

  // 마이그레이션 상태
  const migrationCompleted = localStorage.getItem(MIGRATION_KEY);
  console.log('🔄 마이그레이션 완료:', migrationCompleted ? 'Yes' : 'No');
  
  console.log('==================');
};