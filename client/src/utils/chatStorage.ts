import { ProcessStatus } from "@/types/session";

// ChatItem 타입 정의 (messages 필드 제거)
export interface ChatItem {
  rootThreadId: string;
  lastThreadId: string;
  steps: string[]; // 사용된 세션 진행
  processStatus: ProcessStatus; // 프로젝트 진행 단계
  lastProcess?: ProcessStatus; // 마지막 완료된 프로세스 단계
  process: Record<ProcessStatus, string[]>; // process 별 사용된 thread
  submit: string; // 주제 (요약)
  createdAt: string; // 생성 시간
  updatedAt: string; // 마지막 업데이트 시간
}

// 스레드 데이터 타입 (메타정보만)
export interface ThreadData {
  history: ChatItem[];
}

// 로컬스토리지 키
const STORAGE_KEY = "vibecraft_thread";

// ID 생성 함수
export const generateId = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// 기존 데이터 마이그레이션 헬퍼 (ChatItem만)
const migrateOldData = (data: any): ThreadData => {
  // 새로운 형식인지 확인 (history만 있는 구조)
  if (data.history && Array.isArray(data.history) && !data.messages) {
    return data as ThreadData;
  }

  // 기존 형식이면 변환 (messages 필드는 무시)
  if (data.history && Array.isArray(data.history)) {
    const migratedHistory: ChatItem[] = [];

    data.history.forEach((oldItem: any, index: number) => {
      const threadId =
        oldItem.id || oldItem.rootThreadId || oldItem.threadId || generateId();
      const processStatus: ProcessStatus = oldItem.processStatus || "TOPIC";

      // ChatItem 생성 (messages 필드 제외)
      const newChatItem: ChatItem = {
        rootThreadId: threadId,
        lastThreadId: threadId,
        steps: oldItem.steps || [threadId],
        processStatus,
        lastProcess: oldItem.lastProcess,
        process: oldItem.process || {
          TOPIC: processStatus === "TOPIC" ? [threadId] : [],
          DATA: processStatus === "DATA" ? [threadId] : [],
          BUILD: processStatus === "BUILD" ? [threadId] : [],
          DEPLOY: processStatus === "DEPLOY" ? [threadId] : [],
        },
        submit: oldItem.title || oldItem.submit || `채팅 ${index + 1}`,
        createdAt: oldItem.createdAt || new Date().toISOString(),
        updatedAt: oldItem.updatedAt || new Date().toISOString(),
      };

      migratedHistory.push(newChatItem);
    });

    return {
      history: migratedHistory,
    };
  }

  return {
    history: [],
  };
};

// 스레드 데이터 가져오기
export const getThreadData = (): ThreadData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const migrated = migrateOldData(parsed);

      // 마이그레이션된 데이터가 원본과 다르면 저장
      if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
        console.log("🔄 기존 localStorage 데이터 마이그레이션 수행");
        saveThreadData(migrated);
      }

      return migrated;
    }
  } catch (error) {
    console.error("❌ 스레드 데이터 로드 실패:", error);
  }
  return { history: [] };
};

// 스레드 데이터 저장 (ChatItem 메타정보만)
export const saveThreadData = (data: ThreadData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log("💾 ChatItem 메타정보 저장 완료:", data.history.length, "개");
  } catch (error) {
    console.error("❌ 스레드 데이터 저장 실패:", error);
  }
};

// ChatItem 목록 가져오기
export const getChatItems = (): ChatItem[] => {
  const threadData = getThreadData();
  return threadData.history || [];
};

// ChatItem 추가
export const storeChatChannel = (newItem: ChatItem): void => {
  const threadData = getThreadData();

  // 새 항목을 맨 앞에 추가
  threadData.history = [newItem, ...threadData.history];

  // 최대 100개까지만 저장
  if (threadData.history.length > 100) {
    threadData.history = threadData.history.slice(0, 100);
  }

  saveThreadData(threadData);
  console.log("💾 새 ChatItem 저장:", newItem.rootThreadId);
};

// ChatItem 업데이트
export const updateChatChannel = (
  threadId: string,
  message: string,
  processStatus: ProcessStatus
): void => {
  const threadData = getThreadData();
  const itemIndex = threadData.history.findIndex(
    (item) => item.rootThreadId === threadId
  );

  if (itemIndex !== -1) {
    const item = threadData.history[itemIndex];

    // lastProcess 업데이트 (현재 단계 완료 표시)
    item.lastProcess = processStatus;
    item.lastThreadId = threadId;
    item.updatedAt = new Date().toISOString();

    // process 배열에 threadId 추가 (중복 방지)
    if (!item.process[processStatus].includes(threadId)) {
      item.process[processStatus].push(threadId);
    }

    // steps에 추가 (중복 방지)
    if (!item.steps.includes(threadId)) {
      item.steps.push(threadId);
    }

    // 첫 번째 메시지인 경우 submit 업데이트
    if (processStatus === "TOPIC" && message.trim()) {
      item.submit = message.slice(0, 100); // 최대 100자
    }

    saveThreadData(threadData);
    console.log("💾 ChatItem 업데이트:", threadId);
  }
};

// ChatItem 삭제
export const deleteChatChannel = (threadId: string): void => {
  const threadData = getThreadData();
  threadData.history = threadData.history.filter(
    (item) => item.rootThreadId !== threadId
  );
  saveThreadData(threadData);
  console.log("🗑️ ChatItem 삭제:", threadId);
};

// 특정 ChatItem 업데이트 시간 갱신 (메시지 저장시 호출)
export const updateChatItemTimestamp = (threadId: string): void => {
  const threadData = getThreadData();
  const itemIndex = threadData.history.findIndex(
    (item) => item.rootThreadId === threadId
  );
  
  if (itemIndex !== -1) {
    threadData.history[itemIndex].updatedAt = new Date().toISOString();
    saveThreadData(threadData);
    console.log("🕒 ChatItem 업데이트 시간 갱신:", threadId);
  }
};
