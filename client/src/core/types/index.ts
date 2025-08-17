/**
 * VibeCraft Core Types
 * Central export for all type definitions
 */

// Chat types
export type {
  ChatMessage,
  MenuComponentData,
  DataUploadComponentData,
  DataTableComponentData,
  DataVisualizeComponentData,
  CodeBlockComponentData,
  PageViewerComponentData,
  ComponentData,
} from "./chat";

export { ComponentType } from "./chat";

// Channel types
export type {
  ChannelMeta,
  ChannelHistory,
  Channel,
  ChannelOperations,
  DashboardStatus,
} from "./channel";

export { STORAGE_KEYS } from "./channel";

// SSE types
export type {
  SSEEvent,
  SSEMessage,
  SSEConnectionStatus,
  SSEConfig,
  SSEState,
  SSECallbacks,
  SSEService,
} from "./sse";

// Common utility types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}

export interface FileUpload {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  url?: string;
}

// Environment configuration
export interface AppConfig {
  apiBaseUrl: string;
  sseEndpoint: string;
  maxFileSize: number;
  supportedFileTypes: string[];
  reconnectInterval: number;
  maxReconnectAttempts: number;
}
