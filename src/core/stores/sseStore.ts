/**
 * VibeCraft SSE Store (Refactored)
 * Simplified SSE connection state management
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  SSEConnectionStatus,
  SSEConfig,
  SSEMessage,
} from "../types";
import { ComponentType } from "../types";
import { sseService } from "../services/sseService";
import { MessageService, StreamService } from "../services";
import { useChatStore } from "./chatStore";
import { useChannelStore } from "./channelStore";
import { useLoadingStore } from "./loadingStore";
import type { StreamEndpoint } from "../services/messageService";

interface SSEState {
  // Connection state
  status: SSEConnectionStatus;
  isConnected: boolean;
  reconnectAttempts: number;
  lastError?: string;

  // Current streaming state
  isStreaming: boolean;
  currentEventType?: string;
  currentMessageId?: string;

  // Error state management
  hasError: boolean;
  errorType?: "stream" | "api" | "connection";
  streamError?: string;

  // Configuration
  config?: SSEConfig;

  // Actions
  connect: (config: SSEConfig) => void;
  disconnect: () => void;
  reconnect: () => void;
  sendMessage: (
    message: string,
    endpoint: StreamEndpoint,
    additionalParams?: Record<string, string>
  ) => Promise<void>;

  // Internal state management
  setStatus: (status: SSEConnectionStatus) => void;
  setError: (error?: string) => void;
  handleMessage: (message: SSEMessage) => void;

  // Error management
  clearError: () => void;
  handleStreamError: (
    error: string,
    type?: "stream" | "api" | "connection"
  ) => void;

  // Event handlers
  handleAIEvent: (data: string) => void;
  handleMenuEvent: (data: string) => void;
  handleDataEvent: (data: string) => void;
  handleCompleteEvent: (data: string) => void;

  // Streaming management
  startStreaming: (eventType: string) => void;
  stopStreaming: () => void;
}

export const useSSEStore = create<SSEState>()(
  devtools(
    (set, get) => ({
      // Initial state
      status: "disconnected",
      isConnected: false,
      reconnectAttempts: 0,
      isStreaming: false,
      hasError: false,

      // Connect to SSE endpoint
      connect: (config) => {
        const store = get();

        // Don't connect if already connected
        if (store.isConnected) {
          console.log("SSE already connected");
          return;
        }

        set({ config });

        sseService.connect(config, {
          onMessage: (message) => {
            store.handleMessage(message);
          },
          onError: (error) => {
            store.setError(error);
          },
          onStatusChange: (status) => {
            store.setStatus(status);
          },
          onRetry: (interval) => {
            console.log(`SSE retry in ${interval}ms`);
          },
        });
      },

      // Disconnect from SSE
      disconnect: () => {
        sseService.disconnect();
        set({
          status: "disconnected",
          isConnected: false,
          isStreaming: false,
          currentEventType: undefined,
          currentMessageId: undefined,
          lastError: undefined,
        });
      },

      // Reconnect SSE
      reconnect: () => {
        const { config } = get();
        if (config) {
          get().disconnect();
          setTimeout(() => {
            get().connect(config);
          }, 1000);
        }
      },

      // Send message to endpoint (simplified)
      sendMessage: async (message, endpoint, additionalParams) => {
        try {
          // API 로딩 상태 시작
          const loadingStore = useLoadingStore.getState();
          loadingStore.setLoading("api", true);

          if (endpoint.isStream) {
            // 스트림 API 호출
            const response = await MessageService.sendMessage(
              message,
              endpoint,
              additionalParams
            );

            if (response && response.body) {
              get().stopStreaming(); // 상태 초기화

              // StreamService를 사용한 스트림 처리
              await StreamService.processStream(response, {
                onAIEvent: (data, _id) => {
                  const sseMessage = MessageService.transformSSEEvent(
                    "ai",
                    data,
                    _id
                  );
                  get().handleMessage(sseMessage);
                },
                onMenuEvent: (data, _id) => {
                  const sseMessage = MessageService.transformSSEEvent(
                    "menu",
                    data,
                    _id
                  );
                  get().handleMessage(sseMessage);
                },
                onDataEvent: (data, _id) => {
                  const sseMessage = MessageService.transformSSEEvent(
                    "data",
                    data,
                    _id
                  );
                  get().handleMessage(sseMessage);
                },
                onErrorEvent: (data, _id) => {
                  const sseMessage = MessageService.transformSSEEvent(
                    "error",
                    data,
                    _id
                  );
                  get().handleMessage(sseMessage);
                  throw new Error("Stream Response ERROR");
                },
                onCompleteEvent: (data, _id) => {
                  const sseMessage = MessageService.transformSSEEvent(
                    "complete",
                    data,
                    _id
                  );
                  get().handleMessage(sseMessage);
                },
              });
            }
          } else {
            // 일반 메시지 전송
            const restMessage = await MessageService.sendMessage(
              message,
              endpoint,
              additionalParams
            );

            // visualization 응답 처리
            if (endpoint.api.path === "/workflow/visualization-type") {
              if (restMessage && restMessage instanceof Response) {
                try {
                  const responseData = await restMessage.json();
                  if (responseData?.recommendations) {
                    const chatStore = useChatStore.getState();

                    chatStore.addComponentMessage(
                      ComponentType.DATA_VISUALIZE,
                      responseData.recommendations
                    );
                  }
                } catch (jsonError) {
                  console.error("Failed to parse response JSON:", jsonError);
                }
              }
            }
            // TODO : code generator 처리
            else if (endpoint.api.path === "/workflow/code-generator") {
              debugger;
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          get().setError(errorMessage);
          throw error;
        } finally {
          // API 로딩 상태 종료
          const loadingStore = useLoadingStore.getState();
          loadingStore.setLoading("api", false);

          const channelStore = useChannelStore.getState();
          const currentChannel = channelStore.getCurrentChannel();
          if (currentChannel) {
            channelStore.updateChannelMeta(currentChannel.meta.channelId, {
              lastEndpoint: endpoint.api.path,
            });
          }
        }
      },

      // Set connection status
      setStatus: (status) => {
        const connectionInfo = sseService.getConnectionInfo();

        set({
          status,
          isConnected: status === "connected",
          reconnectAttempts: connectionInfo.reconnectAttempts,
        });

        // Clear error on successful connection
        if (status === "connected") {
          set({ lastError: undefined });
        }
      },

      // Set error state
      setError: (error) => {
        set({ lastError: error });
      },

      // Handle incoming SSE messages (simplified)
      handleMessage: (message) => {
        if (message.type === "ai" && message.event) {
          const { event: eventType, data, id } = message.event;

          switch (eventType) {
            case "ai":
            case "ai_chunk_message":
              get().handleAIEvent(data);
              break;

            case "menu":
              get().handleMenuEvent(data);
              break;

            case "data":
              get().handleDataEvent(data);
              break;

            case "error":
              // 에러 상태를 별도로 처리
              get().handleStreamError(data, "stream");
              get().stopStreaming(); // 스트리밍 중단

              // 에러 메시지를 채팅에 표시
              const chatStore = useChatStore.getState();
              chatStore.addMessage({
                type: "ai",
                content: `⚠️ 오류가 발생했습니다: ${data}`,
              });
              break;

            case "info":
              break;

            case "complete":
              get().handleCompleteEvent(data);
              break;

            default:
              console.log("Unknown SSE event type:", eventType);
          }
        }
      },

      // AI 이벤트 처리 (간소화)
      handleAIEvent: (data: string) => {
        const chatStore = useChatStore.getState();
        const { isStreaming, currentMessageId } = get();

        if (!isStreaming || !currentMessageId) {
          // Start new streaming message
          const messageId = chatStore.startStreamingMessage(data);
          set({
            isStreaming: true,
            currentEventType: "ai",
            currentMessageId: messageId,
          });
        } else {
          // Append to existing streaming message
          chatStore.appendToMessage(currentMessageId, data);
        }
      },

      // 메뉴 이벤트 처리 (간소화)
      handleMenuEvent: (data: string) => {
        const chatStore = useChatStore.getState();

        try {
          const menuData = StreamService.processMenuEvent(data);
          chatStore.addComponentMessage(ComponentType.MENU, menuData);
        } catch (error) {
          console.error("Failed to process menu event:", error);
          chatStore.addMessage({
            type: "ai",
            content: data,
          });
        }

        get().stopStreaming();
      },

      // 데이터 이벤트 처리 (간소화)
      handleDataEvent: (data: string) => {
        const chatStore = useChatStore.getState();

        try {
          const processedData = StreamService.processDataEvent(data);

          if (processedData.type === "table") {
            chatStore.addComponentMessage(
              ComponentType.DATA_TABLE,
              processedData.data
            );
          }
        } catch (error) {
          console.error("Failed to process data event:", error);
          chatStore.addMessage({
            type: "ai",
            content: `Data: ${data}`,
          });
        }
      },

      // 완료 이벤트 처리 (간소화)
      handleCompleteEvent: (data: string) => {
        const chatStore = useChatStore.getState();
        const { currentMessageId } = get();

        // Finish current streaming message if exists
        if (currentMessageId) {
          chatStore.finishStreamingMessage(currentMessageId);
        }

        try {
          const threadId = StreamService.processCompleteEvent(data);

          const channelStore = useChannelStore.getState();
          const currentChannel = channelStore.getCurrentChannel();
          if (currentChannel) {
            // TOPIC 프로세스가 완료되면 DATA_UPLOAD 컴포넌트 추가
            if (currentChannel.meta.currentProcess === "TOPIC") {
              chatStore.addMessage({
                type: "ai",
                componentType: ComponentType.DATA_UPLOAD,
              });
            }

            channelStore.updateChannelMeta(currentChannel.meta.channelId, {
              threadId: threadId[0],
              threadStatus: "READY",
              lastActivity: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Failed to process complete event:", error);
        }

        get().stopStreaming();
      },

      // Start streaming state
      startStreaming: (eventType) => {
        set({
          isStreaming: true,
          currentEventType: eventType,
        });
      },

      // Stop streaming state
      stopStreaming: () => {
        const { currentMessageId } = get();

        if (currentMessageId) {
          const chatStore = useChatStore.getState();
          chatStore.finishStreamingMessage(currentMessageId);
        }

        set({
          isStreaming: false,
          currentEventType: undefined,
          currentMessageId: undefined,
        });
      },

      // Clear error state
      clearError: () => {
        set({
          hasError: false,
          errorType: undefined,
          streamError: undefined,
        });
      },

      // Handle stream error
      handleStreamError: (
        error: string,
        type: "stream" | "api" | "connection" = "stream"
      ) => {
        set({
          hasError: true,
          errorType: type,
          streamError: error,
          lastError: error,
        });
      },
    }),
    {
      name: "vibecraft-sse-store",
    }
  )
);

// Helper hooks
export const useSSEActions = () => {
  const store = useSSEStore();
  return {
    connect: store.connect,
    disconnect: store.disconnect,
    reconnect: store.reconnect,
    sendMessage: store.sendMessage,
    clearError: store.clearError,
    handleStreamError: store.handleStreamError,
  };
};

export const useSSEState = () => {
  const store = useSSEStore();
  return {
    status: store.status,
    isConnected: store.isConnected,
    isStreaming: store.isStreaming,
    reconnectAttempts: store.reconnectAttempts,
    lastError: store.lastError,
    currentEventType: store.currentEventType,
    hasError: store.hasError,
    errorType: store.errorType,
    streamError: store.streamError,
  };
};
