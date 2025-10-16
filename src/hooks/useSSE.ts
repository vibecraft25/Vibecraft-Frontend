/**
 * VibeCraft SSE Hook
 * React hook for managing SSE connections
 */

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useSSEActions, useSSEState } from "@/core/stores/sseStore";
import type { SSEConfig } from "@/core/types";
import { StreamEndpoint, useChatActions } from "@/core";
import { API_CONFIG } from "@/config/env";
import { API_ENDPOINTS } from "@/utils/apiEndpoints";

interface UseSSEOptions {
  autoConnect?: boolean;
  autoReconnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  initialParams?: Record<string, string>;
}

export const useSSE = (options: UseSSEOptions = {}) => {
  const { connect, disconnect, reconnect, sendMessage } = useSSEActions();
  const { addMessage } = useChatActions();

  const sseState = useSSEState();
  const optionsRef = useRef(options);

  // 기본 SSE 설정 생성 - 고정 SSE 엔드포인트 사용
  const defaultConfig: SSEConfig = useMemo(
    () => ({
      url: `${API_CONFIG.BASE_URL}/sse`,
      withCredentials: false,
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
    }),
    []
  );

  // Update refs when props change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (options.autoConnect) {
      connect(defaultConfig);
    }

    return () => {
      if (options.autoConnect) {
        disconnect();
      }
    };
  }, [defaultConfig, options.autoConnect, connect, disconnect]);

  // Handle connection status changes
  useEffect(() => {
    const currentOptions = optionsRef.current;

    if (sseState.status === "connected" && currentOptions.onConnect) {
      currentOptions.onConnect();
    }

    if (sseState.status === "disconnected" && currentOptions.onDisconnect) {
      currentOptions.onDisconnect();
    }

    if (sseState.lastError && currentOptions.onError) {
      currentOptions.onError(sseState.lastError);
    }
  }, [sseState.status, sseState.lastError]);

  // Auto-reconnect on error if enabled
  useEffect(() => {
    if (
      options.autoReconnect &&
      sseState.status === "error" &&
      sseState.reconnectAttempts < 5 // Prevent infinite loops
    ) {
      const delay = Math.min(
        1000 * Math.pow(2, sseState.reconnectAttempts),
        30000
      );
      const timer = setTimeout(() => {
        reconnect();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [
    options.autoReconnect,
    sseState.status,
    sseState.reconnectAttempts,
    reconnect,
  ]);

  const connectToSSE = useCallback(
    (additionalParams?: Record<string, string>) => {
      const config = additionalParams
        ? {
            ...defaultConfig,
            url: `${defaultConfig.url}?${new URLSearchParams(
              additionalParams
            ).toString()}`,
          }
        : defaultConfig;
      connect(config);
    },
    [connect, defaultConfig]
  );

  const sendSSEMessage = useCallback(
    async (
      message: string,
      props?: {
        userMessage?: boolean;
        endpoint?: StreamEndpoint;
        additionalParams?: Record<string, string>;
      }
    ) => {
      const { userMessage = true, endpoint, additionalParams } = props || {};

      try {
        // 1. 사용자 메시지를 채팅에 추가
        if (userMessage) {
          addMessage({
            type: "human",
            content: message,
          });
        }

        // 2. 기본 엔드포인트 LOAD_CHAT (기존 채팅)
        const _endpoint = endpoint ?? API_ENDPOINTS.LOAD_CHAT;

        // 3. sseStore의 sendMessage에서 모든 처리 담당
        await sendMessage(message, _endpoint, additionalParams);

        return true;
      } catch (error) {
        console.error("Failed to send SSE message:", error);

        // 에러 메시지를 채팅에 추가
        addMessage({
          type: "ai",
          content: `❌ Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });

        return false;
      }
    },
    [addMessage, sendMessage]
  );

  return {
    // State
    ...sseState,

    // Actions
    connect: connectToSSE,
    disconnect,
    reconnect,
    sendMessage: sendSSEMessage,

    // Computed state
    canSend: sseState.isConnected && !sseState.isStreaming,
    connectionInfo: {
      url: defaultConfig.url,
      status: sseState.status,
      attempts: sseState.reconnectAttempts,
      error: sseState.lastError,
    },
  };
};
