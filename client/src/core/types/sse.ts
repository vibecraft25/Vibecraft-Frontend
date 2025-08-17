/**
 * VibeCraft SSE Communication Types
 * Types for Server-Sent Events communication
 */

export interface SSEEvent {
  event: "ai" | "menu" | "data" | "complete";
  data: string;
  id?: string;
}

export interface SSEMessage {
  type: "ai" | "human";
  event?: SSEEvent;
  error?: string;
  timestamp: string;
}

export type SSEConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface SSEConfig {
  url: string;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEState {
  status: SSEConnectionStatus;
  connection: EventSource | null;
  reconnectAttempts: number;
  lastError?: string;
  isStreaming: boolean;
  currentEventType?: string;
}

export interface SSECallbacks {
  onMessage?: (message: SSEMessage) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: SSEConnectionStatus) => void;
  onRetry?: (interval: number) => void;
}

// SSE Service interface (simplified - send method moved to MessageService)
export interface SSEService {
  connect: (config: SSEConfig, callbacks: SSECallbacks) => void;
  disconnect: () => void;
  getStatus: () => SSEConnectionStatus;
  reconnect: () => void;
}
