/**
 * VibeCraft Stream Service
 * Handles streaming data processing and event management
 */

import { readStream } from "@/utils/streamProcessor";
import { ComponentType } from "../types";
import type { SSEMessage } from "../types";
import { MessageService } from "./messageService";

export interface StreamEventHandler {
  onAIEvent?: (data: string, id?: string) => void;
  onMenuEvent?: (data: string, id?: string) => void;
  onDataEvent?: (data: string, id?: string) => void;
  onCompleteEvent?: (data: string, id?: string) => void;
}

export interface ProcessedDataEvent {
  type: 'table' | 'unknown';
  componentType?: ComponentType;
  data: any;
}

export class StreamService {
  /**
   * Process streaming response with event handlers
   */
  static async processStream(
    response: Response,
    handlers: StreamEventHandler
  ): Promise<void> {
    if (!response.body) {
      throw new Error("No response body to process");
    }

    await readStream(response, async (event) => {
      console.log("📡 SSE Event:", event.event, event.data);

      switch (event.event) {
        case "ai":
          if (handlers.onAIEvent) {
            // 각 data 라인을 개별적으로 처리 (실시간 타이핑 효과)
            for (const dataLine of event.data) {
              if (dataLine.trim()) {
                handlers.onAIEvent(dataLine + "  ", crypto.randomUUID());
                // 실시간 효과를 위한 약간의 지연
                await new Promise((resolve) => setTimeout(resolve, 50));
              }
            }
          }
          break;

        case "menu":
          handlers.onMenuEvent?.(JSON.stringify(event.data), crypto.randomUUID());
          break;

        case "data":
          handlers.onDataEvent?.(JSON.stringify(event.data), crypto.randomUUID());
          break;

        case "complete":
          handlers.onCompleteEvent?.(JSON.stringify(event.data), crypto.randomUUID());
          break;

        default:
          console.log("Unknown SSE event type:", event.event);
      }
    });
  }

  /**
   * Process AI streaming data with typing effect
   */
  static async processAIStream(
    data: string[],
    onChunk: (chunk: string, id: string) => void
  ): Promise<void> {
    for (const dataLine of data) {
      if (dataLine.trim()) {
        const messageId = crypto.randomUUID();
        onChunk(dataLine + "  ", messageId);
        // 실시간 효과를 위한 지연
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Process menu event data
   */
  static processMenuEvent(data: string): any {
    const menuData = MessageService.parseJsonSafely(data);
    if (!menuData) {
      throw new Error("Invalid menu data format");
    }
    return menuData;
  }

  /**
   * Process data event and determine component type
   */
  static processDataEvent(data: string): ProcessedDataEvent {
    const dataInfo = MessageService.parseJsonSafely(data);
    
    if (!Array.isArray(dataInfo) || dataInfo.length === 0) {
      return {
        type: 'unknown',
        data: dataInfo
      };
    }

    // 단순 컬럼 정보 (현재 미사용)
    if (dataInfo.length === 1) {
      return {
        type: 'unknown',
        data: dataInfo
      };
    }

    // 데이터프레임 형태 처리
    if (dataInfo.length >= 2) {
      const title = dataInfo[0];
      const headerString = dataInfo[1];
      
      // 컬럼 파싱
      const columns = this.parseColumns(headerString);
      
      // 데이터 행 파싱
      const dataRows = dataInfo.slice(2);
      const rows = dataRows.map(rowString => this.parseRow(rowString, columns.length));

      return {
        type: 'table',
        componentType: ComponentType.DATA_TABLE,
        data: {
          title: title || "데이터 테이블",
          columns,
          rows
        }
      };
    }

    return {
      type: 'unknown',
      data: dataInfo
    };
  }

  /**
   * Parse column headers from string
   */
  private static parseColumns(headerString: string): string[] {
    if (headerString.includes(",")) {
      return headerString.split(",").map(col => col.trim());
    }
    return headerString.trim().split(/\s+/);
  }

  /**
   * Parse data row with proper column alignment
   */
  private static parseRow(rowString: string, expectedColumns: number): string[] {
    if (rowString.includes(",")) {
      return rowString.split(",").map(cell => cell.trim());
    }

    // 정규식을 사용한 정교한 파싱
    const regex = /(\S+(?:\s+\S+)*?)(?=\s{2,}|\s*$)/g;
    const parts: string[] = [];
    let match;

    while ((match = regex.exec(rowString)) !== null) {
      parts.push(match[1].trim());
    }

    // 예상 컬럼 수와 맞지 않으면 간단한 공백 분리로 폴백
    if (parts.length !== expectedColumns) {
      return rowString
        .trim()
        .split(/\s+/)
        .slice(0, expectedColumns);
    }

    return parts;
  }

  /**
   * Process complete event and extract thread ID
   */
  static processCompleteEvent(data: string): string {
    const threadId = MessageService.parseJsonSafely(data);
    if (!threadId) {
      throw new Error("Invalid complete event data");
    }
    return threadId;
  }

  /**
   * Create streaming message for different event types
   */
  static createStreamingMessage(
    eventType: string,
    data: string,
    id?: string
  ): SSEMessage {
    return MessageService.transformSSEEvent(eventType, data, id);
  }

  /**
   * Validate streaming event format
   */
  static validateStreamEvent(event: any): boolean {
    return event && 
           typeof event.event === 'string' && 
           event.data !== undefined;
  }
}