/**
 * 클라이언트 채팅 관련 TypeScript 타입 정의
 */

// ============================================================================
// WebSocket 메시지 타입
// ============================================================================

export interface WebSocketMessage {
  type: 'join_chat' | 'chat_message' | 'leave_chat';
  sessionId: string;
  content?: string;
  userId?: string;
}

export interface WebSocketResponse {
  type: 'joined' | 'chat_response' | 'left' | 'error' | 'typing' | 'session_created';
  sessionId: string;
  content?: string;
  message?: string;
  timestamp?: string;
  userId?: string;
}

// ============================================================================
// 채팅 관련 타입
// ============================================================================

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId?: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'error';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastActivity: Date;
  isActive: boolean;
  userId?: string;
  messageCount: number;
  preview?: string;
}

// ============================================================================
// WebSocket 연결 상태
// ============================================================================

export type ConnectionStatus = 
  | 'disconnected'
  | 'connecting' 
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface ConnectionState {
  status: ConnectionStatus;
  sessionId?: string;
  userId?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

// ============================================================================
// 채팅 UI 상태
// ============================================================================

export interface ChatUIState {
  isTyping: boolean;
  isLoading: boolean;
  error?: string;
  inputValue: string;
  showConnectionStatus: boolean;
}

export interface MessageListState {
  messages: ChatMessage[];
  isLoading: boolean;
  hasMore: boolean;
  error?: string;
}

// ============================================================================
// WebSocket Hook 타입
// ============================================================================

export interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (response: WebSocketResponse) => void;
}

export interface UseWebSocketReturn {
  connectionState: ConnectionState;
  sendMessage: (message: WebSocketMessage) => void;
  joinChat: (sessionId?: string, userId?: string) => void;
  leaveChat: () => void;
  sendChatMessage: (content: string) => void;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

// ============================================================================
// 채팅 컴포넌트 Props
// ============================================================================

export interface ChatComponentProps {
  sessionId?: string;
  userId?: string;
  className?: string;
  onSessionChange?: (sessionId: string) => void;
  onError?: (error: string) => void;
  height?: string | number;
  theme?: 'light' | 'dark';
}

export interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  error?: string;
  className?: string;
  onRetry?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  height?: string | number;
  autoScroll?: boolean;
}

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  className?: string;
  showSendButton?: boolean;
  multiline?: boolean;
  onKeyPress?: (event: React.KeyboardEvent) => void;
}

export interface MessageItemProps {
  message: ChatMessage;
  showTimestamp?: boolean;
  showStatus?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
  className?: string;
}

// ============================================================================
// 이벤트 핸들러 타입
// ============================================================================

export type MessageEventHandler = (message: ChatMessage) => void;
export type ErrorEventHandler = (error: string) => void;
export type ConnectionEventHandler = (status: ConnectionStatus) => void;
export type SessionEventHandler = (sessionId: string) => void;

// ============================================================================
// 설정 타입
// ============================================================================

export interface ChatClientConfig {
  websocketUrl: string;
  apiUrl?: string;
  defaultUserId?: string;
  maxMessageLength: number;
  reconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  messageRetryAttempts: number;
  enableLogging: boolean;
}

export interface MessageDisplayOptions {
  showTimestamps: boolean;
  showUserNames: boolean;
  showMessageStatus: boolean;
  groupConsecutiveMessages: boolean;
  dateFormat: string;
  timeFormat: string;
}

// ============================================================================
// 에러 타입
// ============================================================================

export interface ChatError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  sessionId?: string;
  messageId?: string;
}

export type ChatErrorCode = 
  | 'CONNECTION_FAILED'
  | 'MESSAGE_SEND_FAILED'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_MESSAGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR';

// ============================================================================
// 상수
// ============================================================================

export const MESSAGE_TYPES = {
  JOIN_CHAT: 'join_chat',
  CHAT_MESSAGE: 'chat_message',
  LEAVE_CHAT: 'leave_chat',
  JOINED: 'joined',
  CHAT_RESPONSE: 'chat_response',
  LEFT: 'left',
  ERROR: 'error',
  TYPING: 'typing',
  SESSION_CREATED: 'session_created'
} as const;

export const CONNECTION_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
} as const;

export const MESSAGE_STATUS = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  ERROR: 'error'
} as const;

export const MESSAGE_TYPE = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
} as const;

// ============================================================================
// 유틸리티 타입
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 타입 가드
export const isWebSocketResponse = (data: any): data is WebSocketResponse => {
  return data && typeof data.type === 'string' && typeof data.sessionId === 'string';
};

export const isChatMessage = (data: any): data is ChatMessage => {
  return data && 
    typeof data.id === 'string' && 
    typeof data.content === 'string' &&
    typeof data.type === 'string' &&
    ['user', 'assistant', 'system'].includes(data.type);
};

