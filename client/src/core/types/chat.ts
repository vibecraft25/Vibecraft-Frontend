/**
 * VibeCraft Chat System Types
 * Core type definitions for chat messages and interactive components
 */

export interface ChatMessage {
  id: string;
  type: "ai" | "human" | "component";
  content?: string;
  componentType?: ComponentType;
  componentData?: any;
  timestamp: string;
  metadata?: {
    threadId?: string;
    isStreaming?: boolean;
    sseEventType?: "ai" | "menu" | "data" | "complete";
  };
}

export enum ComponentType {
  MENU = "MENU",
  DATA_UPLOAD = "DATA_UPLOAD",
  DATA_TABLE = "DATA_TABLE",
  DATA_VISUALIZE = "DATA_VISUALIZE",
  CODE_BLOCK = "CODE_BLOCK",
  PAGE_VIEWER = "PAGE_VIEWER",
}

// Component Data Types
export interface MenuComponentData {
  options: Array<{
    id: string;
    label: string;
    action: string;
  }>;
}

export interface DataUploadComponentData {
  acceptedTypes: string[];
  maxSize: number;
  uploadUrl?: string;
}

export interface DataTableComponentData {
  columns: string[];
  rows: any[][];
  totalRows: number;
  currentPage: number;
  pageSize: number;
}

export interface DataVisualizeComponentData {
  chartType: "line" | "bar" | "pie" | "scatter";
  data: any[];
  xAxis: string;
  yAxis: string;
  title?: string;
}

export interface CodeBlockComponentData {
  language: string;
  code: string;
  executable?: boolean;
  filename?: string;
}

export interface PageViewerComponentData {
  url: string;
  title?: string;
  height?: number;
}

// Union type for all component data
export type ComponentData =
  | MenuComponentData
  | DataUploadComponentData
  | DataTableComponentData
  | DataVisualizeComponentData
  | CodeBlockComponentData
  | PageViewerComponentData;
