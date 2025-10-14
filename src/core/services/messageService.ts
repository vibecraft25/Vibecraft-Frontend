/**
 * VibeCraft Message Service
 * Handles message sending, receiving, and transformation logic
 */

import type { SSEMessage } from "../types";
import {
  getStreamApiResponse,
  ApiEndpoint,
  getApiResponse,
} from "@/utils/apiEndpoints";

export interface MessageParams {
  [key: string]: any;
}

export interface StreamEndpoint {
  isStream: boolean;
  api: ApiEndpoint;
}

export class MessageService {
  /**
   * Send message to endpoint with streaming support
   */
  static async sendMessage(
    _message: string,
    endpoint: StreamEndpoint,
    additionalParams?: Record<string, string>
  ): Promise<Response | void> {
    const params: MessageParams = {
      ...endpoint.api.params,
      ...additionalParams,
    };

    try {
      if (endpoint.isStream) {
        // 스트림 API 호출
        const response = await getStreamApiResponse(endpoint.api, params);
        if (!response.ok) {
          throw new Error(`Stream API 호출 실패: ${response.status}`);
        }
        return response;
      } else {
        // 일반 메시지 전송
        const response = await getApiResponse(endpoint.api, params);
        return response;
      }
    } catch (error) {
      console.error("Failed to send message to status:", error);
      throw error;
    }
  }

  /**
   * Transform SSE event to internal message format
   */
  static transformSSEEvent(
    eventType: string,
    data: string,
    id?: string
  ): SSEMessage {
    return {
      type: "ai",
      event: {
        event: eventType as any,
        data,
        id,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create streaming message with unique ID
   */
  static createStreamingMessage(content = "", eventType?: string): SSEMessage {
    return {
      type: "ai",
      event: {
        event: eventType as any,
        data: content,
        id: crypto.randomUUID(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate message format
   */
  static validateMessage(message: any): boolean {
    if (!message || typeof message !== "object") return false;
    if (!message.type || !message.event) return false;
    if (!message.event.data) return false;
    return true;
  }

  /**
   * Parse JSON data safely
   */
  static parseJsonSafely<T = any>(data: string): T | null {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      return null;
    }
  }
}
