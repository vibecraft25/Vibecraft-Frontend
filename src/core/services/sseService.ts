/**
 * VibeCraft SSE Service
 * Server-Sent Events client with EventSource Parser
 */

import { createParser, type EventSourceMessage } from "eventsource-parser";
import type {
  SSEConfig,
  SSECallbacks,
  SSEConnectionStatus,
  SSEService,
  SSEMessage,
} from "../types";

export class VibeCraftSSEService implements SSEService {
  private eventSource: EventSource | null = null;
  private parser: any = null;
  private config: SSEConfig | null = null;
  private callbacks: SSECallbacks = {};
  private status: SSEConnectionStatus = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 10;
  private baseReconnectInterval = 1000; // 1 second

  constructor() {
    this.setupParser();
  }

  private setupParser(): void {
    this.parser = createParser({
      onEvent: (event: EventSourceMessage) => {
        this.handleSSEEvent(event);
      },
      onRetry: (retryInterval: number) => {
        console.log(`SSE retry interval: ${retryInterval}ms`);
        this.callbacks.onRetry?.(retryInterval);
      },
      onError: (error: any) => {
        console.error("SSE Parser error:", error);
        this.handleError(`Parser error: ${error.message}`);
      },
      onComment: (comment: string) => {
        console.log("SSE comment:", comment);
      },
    });
  }

  connect(config: SSEConfig, callbacks: SSECallbacks): void {
    this.config = config;
    this.callbacks = callbacks;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;

    this.establishConnection();
  }

  private establishConnection(): void {
    if (!this.config) {
      this.handleError("No configuration provided");
      return;
    }

    try {
      this.setStatus("connecting");

      // Create EventSource with configuration
      const eventSourceInit: EventSourceInit = {
        withCredentials: this.config.withCredentials || false,
      };

      this.eventSource = new EventSource(this.config.url, eventSourceInit);

      // Set up event listeners
      this.eventSource.onopen = () => {
        console.log("SSE connection opened");
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.clearReconnectTimer();
      };

      this.eventSource.onmessage = (event) => {
        this.handleRawMessage(event);
      };

      this.eventSource.onerror = (event) => {
        console.error("SSE connection error:", event);
        this.handleConnectionError();
      };

      // Set up custom event listeners for specific event types
      this.setupCustomEventListeners();
    } catch (error) {
      this.handleError(`Failed to establish connection: ${error}`);
    }
  }

  private setupCustomEventListeners(): void {
    if (!this.eventSource) return;

    // Listen for custom event types
    const eventTypes = ["ai", "menu", "data", "complete"];

    eventTypes.forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event) => {
        this.handleCustomEvent(eventType, event as MessageEvent);
      });
    });
  }

  private handleRawMessage(event: MessageEvent): void {
    try {
      // Feed raw data to parser for proper SSE parsing
      this.parser.feed(event.data);
    } catch (error) {
      console.error("Error processing raw message:", error);
      this.handleError(`Message processing error: ${error}`);
    }
  }

  private handleCustomEvent(eventType: string, event: MessageEvent): void {
    try {
      const sseMessage: SSEMessage = {
        type: "ai",
        event: {
          event: eventType as any,
          data: event.data,
          id: event.lastEventId || undefined,
        },
        timestamp: new Date().toISOString(),
      };

      this.callbacks.onMessage?.(sseMessage);
    } catch (error) {
      console.error("Error handling custom event:", error);
    }
  }

  private handleSSEEvent(event: EventSourceMessage): void {
    try {
      const sseMessage: SSEMessage = {
        type: "ai",
        event: {
          event: (event.event || "message") as any,
          data: event.data,
          id: event.id || undefined,
        },
        timestamp: new Date().toISOString(),
      };

      this.callbacks.onMessage?.(sseMessage);
    } catch (error) {
      console.error("Error handling SSE event:", error);
      this.handleError(`Event handling error: ${error}`);
    }
  }

  private handleConnectionError(): void {
    this.setStatus("error");

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.handleError("Maximum reconnection attempts reached");
    }
  }

  private scheduleReconnect(): void {
    const delay = this.calculateReconnectDelay();

    console.log(
      `Scheduling reconnection attempt ${
        this.reconnectAttempts + 1
      } in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnect();
    }, delay);
  }

  private calculateReconnectDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay =
      this.baseReconnectInterval * Math.pow(2, this.reconnectAttempts);
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(exponentialDelay, maxDelay);

    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(1000, delay + jitter); // Minimum 1 second
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.parser) {
      this.parser.reset();
    }

    this.setStatus("disconnected");
    this.reconnectAttempts = 0;
  }

  reconnect(): void {
    console.log("Attempting to reconnect SSE...");
    this.disconnect();

    if (this.config) {
      setTimeout(() => {
        this.establishConnection();
      }, 100); // Brief delay before reconnecting
    }
  }

  // Removed send method - now handled by MessageService

  getStatus(): SSEConnectionStatus {
    return this.status;
  }

  private setStatus(status: SSEConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.callbacks.onStatusChange?.(status);
    }
  }

  private handleError(error: string): void {
    console.error("SSE Service error:", error);
    this.setStatus("error");
    this.callbacks.onError?.(error);
  }

  // Public method to get connection info
  getConnectionInfo(): {
    status: SSEConnectionStatus;
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    url?: string;
  } {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      url: this.config?.url,
    };
  }

  // Method to update configuration
  updateConfig(updates: Partial<SSEConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...updates };
    }
  }

  // Get current configuration
  getConfig(): SSEConfig | null {
    return this.config;
  }

  // Check if connection is active
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Singleton instance for app-wide use
export const sseService = new VibeCraftSSEService();
