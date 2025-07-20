/**
 * WebSocket 연결 및 채팅 통신을 위한 React Hook
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  WebSocketMessage,
  WebSocketResponse,
  ConnectionState,
  ConnectionStatus,
  UseWebSocketOptions,
  UseWebSocketReturn,
  ChatError,
  MESSAGE_TYPES,
  CONNECTION_STATUS,
  isWebSocketResponse
} from '../types/chat.types';

const DEFAULT_OPTIONS: Partial<UseWebSocketOptions> = {
  autoConnect: true,
  reconnectAttempts: 5,
  reconnectInterval: 3000,
  heartbeatInterval: 30000
};

/**
 * WebSocket 연결 관리 Hook
 */
export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // 상태 관리
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: CONNECTION_STATUS.DISCONNECTED,
    reconnectAttempts: 0
  });

  // WebSocket 관련 ref
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isIntentionalDisconnectRef = useRef(false);

  // 메시지 큐 (연결되지 않았을 때 대기)
  const messageQueueRef = useRef<WebSocketMessage[]>([]);

  /**
   * 연결 상태 업데이트
   */
  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    setConnectionState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * 에러 처리
   */
  const handleError = useCallback((error: string) => {
    console.error('[WebSocket] 에러:', error);
    updateConnectionState({ 
      status: CONNECTION_STATUS.ERROR, 
      error 
    });
    opts.onError?.(new Event(error));
  }, [opts, updateConnectionState]);

  /**
   * 하트비트 시작
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // 핑 메시지 전송 (서버에서 pong으로 응답)
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
          startHeartbeat(); // 다음 하트비트 스케줄
        } catch (error) {
          console.warn('[WebSocket] 하트비트 전송 실패:', error);
        }
      }
    }, opts.heartbeatInterval);
  }, [opts.heartbeatInterval]);

  /**
   * 하트비트 중지
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  /**
   * 재연결 시도
   */
  const attemptReconnect = useCallback(() => {
    if (isIntentionalDisconnectRef.current) {
      return;
    }

    if (reconnectAttemptsRef.current >= (opts.reconnectAttempts || 5)) {
      handleError('최대 재연결 시도 횟수를 초과했습니다');
      return;
    }

    reconnectAttemptsRef.current++;
    updateConnectionState({ 
      status: CONNECTION_STATUS.RECONNECTING,
      reconnectAttempts: reconnectAttemptsRef.current 
    });

    console.log(`[WebSocket] 재연결 시도 ${reconnectAttemptsRef.current}/${opts.reconnectAttempts}`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, opts.reconnectInterval);
  }, [opts.reconnectAttempts, opts.reconnectInterval, updateConnectionState, handleError]);

  /**
   * 메시지 큐 처리
   */
  const processMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      console.log(`[WebSocket] 대기 중인 메시지 ${messageQueueRef.current.length}개 전송`);
      
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];
      
      queue.forEach(message => {
        try {
          wsRef.current?.send(JSON.stringify(message));
        } catch (error) {
          console.error('[WebSocket] 큐 메시지 전송 실패:', error);
          messageQueueRef.current.unshift(message); // 다시 큐에 추가
        }
      });
    }
  }, []);

  /**
   * WebSocket 연결
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      updateConnectionState({ status: CONNECTION_STATUS.CONNECTING });
      
      console.log('[WebSocket] 연결 시도:', opts.url);
      wsRef.current = new WebSocket(opts.url);

      wsRef.current.onopen = (event) => {
        console.log('[WebSocket] 연결 성공');
        reconnectAttemptsRef.current = 0;
        isIntentionalDisconnectRef.current = false;
        
        updateConnectionState({ 
          status: CONNECTION_STATUS.CONNECTED,
          lastConnected: new Date(),
          reconnectAttempts: 0,
          error: undefined
        });

        // 재연결 타이머 정리
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // 하트비트 시작
        startHeartbeat();

        // 대기 중인 메시지 처리
        processMessageQueue();

        opts.onOpen?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (isWebSocketResponse(data)) {
            console.log('[WebSocket] 메시지 수신:', data.type);
            opts.onMessage?.(data);
          } else {
            console.warn('[WebSocket] 알 수 없는 메시지 형식:', data);
          }
        } catch (error) {
          console.error('[WebSocket] 메시지 파싱 오류:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[WebSocket] 연결 종료:', event.code, event.reason);
        
        updateConnectionState({ 
          status: CONNECTION_STATUS.DISCONNECTED,
          error: event.reason || undefined
        });

        stopHeartbeat();
        opts.onClose?.(event);

        // 의도적 종료가 아닌 경우 재연결 시도
        if (!isIntentionalDisconnectRef.current && 
            event.code !== 1000 && // 정상 종료가 아닌 경우
            reconnectAttemptsRef.current < (opts.reconnectAttempts || 5)) {
          attemptReconnect();
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('[WebSocket] 연결 오류:', event);
        handleError('WebSocket 연결 오류가 발생했습니다');
      };

    } catch (error) {
      console.error('[WebSocket] 연결 생성 실패:', error);
      handleError(`WebSocket 연결 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [opts, updateConnectionState, handleError, startHeartbeat, processMessageQueue, attemptReconnect, stopHeartbeat]);

  /**
   * WebSocket 연결 해제
   */
  const disconnect = useCallback(() => {
    console.log('[WebSocket] 의도적 연결 해제');
    isIntentionalDisconnectRef.current = true;
    
    // 재연결 타이머 정리
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    updateConnectionState({ 
      status: CONNECTION_STATUS.DISCONNECTED,
      error: undefined 
    });
  }, [updateConnectionState, stopHeartbeat]);

  /**
   * 메시지 전송
   */
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        console.log('[WebSocket] 메시지 전송:', message.type);
      } catch (error) {
        console.error('[WebSocket] 메시지 전송 실패:', error);
        // 연결이 끊어진 경우 큐에 추가
        messageQueueRef.current.push(message);
      }
    } else {
      console.log('[WebSocket] 연결되지 않음, 메시지 큐에 추가:', message.type);
      messageQueueRef.current.push(message);
      
      // 연결되지 않은 경우 연결 시도
      if (connectionState.status === CONNECTION_STATUS.DISCONNECTED) {
        connect();
      }
    }
  }, [connectionState.status, connect]);

  /**
   * 채팅 참여
   */
  const joinChat = useCallback((sessionId?: string, userId?: string) => {
    const finalSessionId = sessionId || uuidv4();
    const finalUserId = userId || `user_${Date.now()}`;

    updateConnectionState({ 
      sessionId: finalSessionId, 
      userId: finalUserId 
    });

    sendMessage({
      type: MESSAGE_TYPES.JOIN_CHAT,
      sessionId: finalSessionId,
      userId: finalUserId
    });

    console.log('[WebSocket] 채팅 참여:', finalSessionId);
  }, [sendMessage, updateConnectionState]);

  /**
   * 채팅 나가기
   */
  const leaveChat = useCallback(() => {
    if (connectionState.sessionId) {
      sendMessage({
        type: MESSAGE_TYPES.LEAVE_CHAT,
        sessionId: connectionState.sessionId,
        userId: connectionState.userId
      });

      updateConnectionState({ 
        sessionId: undefined, 
        userId: undefined 
      });

      console.log('[WebSocket] 채팅 나가기');
    }
  }, [connectionState.sessionId, connectionState.userId, sendMessage, updateConnectionState]);

  /**
   * 채팅 메시지 전송
   */
  const sendChatMessage = useCallback((content: string) => {
    if (!connectionState.sessionId) {
      console.warn('[WebSocket] 세션에 참여하지 않음');
      return;
    }

    sendMessage({
      type: MESSAGE_TYPES.CHAT_MESSAGE,
      sessionId: connectionState.sessionId,
      content,
      userId: connectionState.userId
    });

    console.log('[WebSocket] 채팅 메시지 전송');
  }, [connectionState.sessionId, connectionState.userId, sendMessage]);

  // 컴포넌트 마운트 시 자동 연결
  useEffect(() => {
    if (opts.autoConnect) {
      connect();
    }

    // 클린업 함수
    return () => {
      disconnect();
    };
  }, [opts.autoConnect]); // connect와 disconnect는 의존성에서 제외 (무한 루프 방지)

  // 연결 상태 정리
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    connectionState,
    sendMessage,
    joinChat,
    leaveChat,
    sendChatMessage,
    connect,
    disconnect,
    isConnected: connectionState.status === CONNECTION_STATUS.CONNECTED,
    isConnecting: connectionState.status === CONNECTION_STATUS.CONNECTING ||
                 connectionState.status === CONNECTION_STATUS.RECONNECTING,
    error: connectionState.error || null
  };
};

export default useWebSocket;