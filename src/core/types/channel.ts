/**
 * VibeCraft Channel Management Types
 * Types for channel metadata and management
 */

export type ThreadState =
  | "FIRST_VISIT" // 최초 방문, 세션 기록 없음, Intro 표시
  | "IDLE" // 세션 없음, 빈 채팅 화면 표시
  | "CONNECTING" // 서버 연결 시도 중
  | "READY" // 세션 준비됨, 채팅 입력 가능
  | "TYPING" // 사용자가 입력 중 (typing indicator)
  | "SENDING" // 메시지 전송 중
  | "RECEIVING" // 서버 응답 수신 중
  | "RECONNECTING" // 연결 끊어져서 재연결 시도 중
  | "ERROR"; // 오류 상태, 재시도 가능

// 워크플로우 프로세스 상태
export type WorkflowProcess = "TOPIC" | "RUN" | "CHAT";

export interface ChannelMeta {
  channelId: string;
  channelName: string;
  description: string;
  threadId?: string;
  threadStatus: ThreadState;
  createdAt: string;
  updatedAt: string;
  isCompleted: boolean;
  lastActivity?: string;
  lastEndpoint?: string;
  currentProcess?: WorkflowProcess; // 현재 진행 중인 프로세스
  uploadedCode?: string; // 업로드된 파일의 code 값
}

export interface ChannelHistory {
  channelId: string;
  messages: import("./chat").ChatMessage[];
  lastUpdated: string;
}

export interface Channel {
  meta: ChannelMeta;
  isActive: boolean;
}

// Channel management operations
export interface ChannelOperations {
  create: (name: string, description?: string) => string;
  switch: (channelId: string) => Promise<void>;
  delete: (channelId: string) => Promise<void>;
  updateMeta: (channelId: string, updates: Partial<ChannelMeta>) => void;
}

// Storage keys for persistence
export const STORAGE_KEYS = {
  CHANNEL_META: (channelId: string) => `channel_meta_${channelId}`,
  CHANNEL_LIST: "vibecraft_channels",
  ACTIVE_CHANNEL: "vibecraft_active_channel",
} as const;
