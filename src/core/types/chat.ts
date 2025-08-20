/**
 * VibeCraft Chat System Types
 * Core type definitions for chat messages and interactive components
 */

import { SSEEvent_Type } from "./sse";

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
    sseEventType?: SSEEvent_Type;
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

export interface VisualizationRecommendation {
  visualization_type: VisualizationType;
  confidence: number;
  reason: string;
  data_requirements: string[];
  benefits: string[];
  title?: string; // 제목 추가
}

// 현재 지원되는 비주얼라이제이션 타입들 (추후 확장 가능)
export type VisualizationType =
  | "comparison"
  | "kpi-dashboard"
  | "geo-spatial"
  | string; // 추후 새로운 타입들을 위한 확장성

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
  | VisualizationRecommendation
  | CodeBlockComponentData
  | PageViewerComponentData;
