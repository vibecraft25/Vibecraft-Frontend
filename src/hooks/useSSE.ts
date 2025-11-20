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
import { getRandomTestResponse, simulateStreaming } from "@/utils/streamingSimulator";

interface UseSSEOptions {
  autoConnect?: boolean;
  autoReconnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  initialParams?: Record<string, string>;
  testMode?: boolean; // 테스트 모드
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

        // 2. 테스트 모드인 경우 테스트 데이터 사용
        if (options.testMode) {
          const testResponse = await getRandomTestResponse();
          if (!testResponse) {
            throw new Error("테스트 응답 데이터를 로드할 수 없습니다");
          }

          // 3. 지연 후 AI 메시지 추가
          await new Promise((resolve) =>
            setTimeout(resolve, testResponse.delayMs)
          );

          let aiContent = "";
          addMessage({
            type: "ai",
            content: aiContent,
          });

          // 4. 스트리밍 시작
          return new Promise<boolean>((resolve) => {
            simulateStreaming({
              text: testResponse.content,
              startDelayMs: 0,
              chunkDelayMs: 30,
              onChunk: (chunk) => {
                aiContent += chunk;
                // 마지막 메시지 업데이트 (실제 구현 필요)
                // 여기서는 스트리밍 효과만 수행
              },
              onComplete: () => {
                // 최종 메시지 추가
                addMessage({
                  type: "ai",
                  content: testResponse.content,
                });
                resolve(true);
              },
            });
          });
        }

        // 5. 기본 엔드포인트 LOAD_CHAT (기존 채팅)
        const _endpoint = endpoint ?? API_ENDPOINTS.LOAD_CHAT;

        // 6. sseStore의 sendMessage에서 모든 처리 담당
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
    [addMessage, sendMessage, options.testMode]
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
