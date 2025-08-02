/**
 * VibeCraft MCP WebSocket 통신을 위한 TypeScript 타입 정의
 */

import { WebSocket } from 'ws';

// ============================================================================
// WebSocket 메시지 타입 정의
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
// 채팅 세션 관련 타입
// ============================================================================

export interface ChatSession {
  id: string;
  userId?: string;
  createdAt: Date;
  lastActivity: Date;
  mcpClient: MCPClientInstance | null;
  langChainMemory: LangChainMemory | null;
  isActive: boolean;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId?: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'error';
}

// ============================================================================
// MCP 클라이언트 관련 타입
// ============================================================================

export interface MCPClientInstance {
  id: string;
  sessionId: string;
  process: any; // Child process
  isConnected: boolean;
  isReady: boolean;
  lastPing: Date;
  errorCount: number;
}

export interface MCPMessage {
  type: 'request' | 'response' | 'notification';
  id?: string;
  method?: string;
  params?: any;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// ============================================================================
// LangChain 관련 타입
// ============================================================================

export interface LangChainMemory {
  sessionId: string;
  conversationHistory: ConversationMessage[];
  maxTokens: number;
  currentTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  role: 'human' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// ============================================================================
// WebSocket 연결 관련 타입
// ============================================================================

export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  sessionId?: string;
  userId?: string;
  connectedAt: Date;
  lastActivity: Date;
  isAlive: boolean;
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  averageResponseTime: number;
}

// ============================================================================
// 서버 설정 관련 타입
// ============================================================================

export interface ServerConfig {
  port: number;
  corsOrigins: string[];
  sessionTimeout: number; // milliseconds
  maxConnectionsPerSession: number;
  maxMessageLength: number;
  rateLimitWindow: number; // milliseconds
  rateLimitMax: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SessionCleanupConfig {
  interval: number; // milliseconds
  maxInactiveTime: number; // milliseconds
  maxSessionAge: number; // milliseconds
}

// ============================================================================
// 이벤트 관련 타입
// ============================================================================

export interface SessionEvent {
  type: 'created' | 'joined' | 'left' | 'message_sent' | 'message_received' | 'error' | 'timeout';
  sessionId: string;
  userId?: string;
  timestamp: Date;
  data?: any;
}

export interface ServerEvent {
  type: 'connection_opened' | 'connection_closed' | 'session_created' | 'session_destroyed' | 'mcp_connected' | 'mcp_disconnected';
  timestamp: Date;
  data?: any;
}

// ============================================================================
// 에러 관련 타입
// ============================================================================

export interface VibeCraftError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

export type ErrorCode = 
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'MCP_CONNECTION_FAILED'
  | 'MCP_TIMEOUT'
  | 'INVALID_MESSAGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MAX_CONNECTIONS_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

// ============================================================================
// 유틸리티 타입
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

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

export const SESSION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  ERROR: 'error'
} as const;

export const MCP_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  READY: 'ready',
  ERROR: 'error'
} as const;