import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Alert, Button, Tooltip } from 'antd';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ChatComponentProps, 
  ChatMessage, 
  ChatUIState, 
  WebSocketResponse,
  CONNECTION_STATUS,
  MESSAGE_TYPES
} from '../types/chat.types';
import useWebSocket from '../hooks/useWebSocket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const ChatComponent: React.FC<ChatComponentProps> = ({
  sessionId: initialSessionId,
  userId: initialUserId,
  className = '',
  onSessionChange,
  onError,
  height = '600px',
  theme = 'light'
}) => {
  // 상태 관리
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uiState, setUIState] = useState<ChatUIState>({
    isTyping: false,
    isLoading: false,
    inputValue: '',
    showConnectionStatus: true
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId);
  const [currentUserId] = useState(initialUserId || `user_${Date.now()}`);

  // WebSocket 연결
  const {
    connectionState,
    sendChatMessage,
    joinChat,
    leaveChat,
    connect,
    disconnect,
    isConnected,
    isConnecting,
    error: wsError
  } = useWebSocket({
    url: 'ws://localhost:8080/ws',
    autoConnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError
  });

  /**
   * WebSocket 메시지 처리
   */
  function handleWebSocketMessage(response: WebSocketResponse) {
    console.log('[Chat] WebSocket 메시지 수신:', response);

    switch (response.type) {
      case MESSAGE_TYPES.JOINED:
        console.log('[Chat] 채팅 참여 완료:', response.sessionId);
        if (response.sessionId !== currentSessionId) {
          setCurrentSessionId(response.sessionId);
          onSessionChange?.(response.sessionId);
        }
        break;

      case MESSAGE_TYPES.SESSION_CREATED:
        console.log('[Chat] 새 세션 생성:', response.sessionId);
        setCurrentSessionId(response.sessionId);
        onSessionChange?.(response.sessionId);
        break;

      case MESSAGE_TYPES.CHAT_RESPONSE:
        if (response.content) {
          addMessage(response.content, 'assistant');
        }
        setUIState(prev => ({ ...prev, isLoading: false }));
        break;

      case MESSAGE_TYPES.ERROR:
        console.error('[Chat] 서버 오류:', response.message);
        handleError(response.message || '알 수 없는 오류가 발생했습니다');
        setUIState(prev => ({ ...prev, isLoading: false }));
        break;

      case MESSAGE_TYPES.TYPING:
        setUIState(prev => ({ ...prev, isTyping: true }));
        // 3초 후 타이핑 상태 해제
        setTimeout(() => {
          setUIState(prev => ({ ...prev, isTyping: false }));
        }, 3000);
        break;

      default:
        console.log('[Chat] 처리되지 않은 메시지 타입:', response.type);
    }
  }

  /**
   * WebSocket 에러 처리
   */
  function handleWebSocketError(error: Event) {
    console.error('[Chat] WebSocket 에러:', error);
    handleError('연결 오류가 발생했습니다');
  }

  /**
   * 에러 처리
   */
  const handleError = useCallback((error: string) => {
    setUIState(prev => ({ ...prev, error, isLoading: false }));
    onError?.(error);
    
    // 5초 후 에러 메시지 자동 해제
    setTimeout(() => {
      setUIState(prev => ({ ...prev, error: undefined }));
    }, 5000);
  }, [onError]);

  /**
   * 메시지 추가
   */
  const addMessage = useCallback((content: string, type: 'user' | 'assistant' | 'system' = 'user') => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      sessionId: currentSessionId || '',
      userId: currentUserId,
      content,
      timestamp: new Date(),
      type,
      status: type === 'user' ? 'sending' : 'delivered'
    };

    setMessages(prev => [...prev, newMessage]);

    // 사용자 메시지인 경우 상태 업데이트
    if (type === 'user') {
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, status: 'delivered' }
              : msg
          )
        );
      }, 1000);
    }

    return newMessage;
  }, [currentSessionId, currentUserId]);

  /**
   * 메시지 전송
   */
  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim() || !isConnected) {
      return;
    }

    // UI에 메시지 즉시 추가
    addMessage(content, 'user');
    
    // 서버로 전송
    sendChatMessage(content);
    
    // UI 상태 업데이트
    setUIState(prev => ({ 
      ...prev, 
      inputValue: '', 
      isLoading: true 
    }));
  }, [isConnected, addMessage, sendChatMessage]);

  /**
   * 메시지 재전송
   */
  const handleRetryMessage = useCallback((messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message && message.type === 'user') {
      // 메시지 상태를 전송 중으로 변경
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'sending' }
            : msg
        )
      );

      // 재전송
      sendChatMessage(message.content);
      setUIState(prev => ({ ...prev, isLoading: true }));
    }
  }, [messages, sendChatMessage]);

  /**
   * 메시지 삭제
   */
  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  /**
   * 채팅 세션 참여
   */
  useEffect(() => {
    if (isConnected && !connectionState.sessionId) {
      joinChat(currentSessionId, currentUserId);
    }
  }, [isConnected, connectionState.sessionId, currentSessionId, currentUserId, joinChat]);

  /**
   * 연결 상태 표시
   */
  const getConnectionStatusBadge = () => {
    switch (connectionState.status) {
      case CONNECTION_STATUS.CONNECTED:
        return <Badge status="success" text="연결됨" />;
      case CONNECTION_STATUS.CONNECTING:
      case CONNECTION_STATUS.RECONNECTING:
        return <Badge status="processing" text="연결 중..." />;
      case CONNECTION_STATUS.DISCONNECTED:
        return <Badge status="default" text="연결 끊김" />;
      case CONNECTION_STATUS.ERROR:
        return <Badge status="error" text="연결 오류" />;
      default:
        return <Badge status="default" text="알 수 없음" />;
    }
  };

  /**
   * 연결 아이콘
   */
  const getConnectionIcon = () => {
    if (isConnected) {
      return <Wifi className="w-4 h-4 text-green-500" />;
    } else if (isConnecting) {
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    } else {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <Card
      className={`shadow-lg border-0 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} ${className}`}
      style={{ height: isMinimized ? 'auto' : height }}
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              VibeCraft Chat
            </span>
            {uiState.showConnectionStatus && (
              <div className="flex items-center space-x-2">
                {getConnectionIcon()}
                {getConnectionStatusBadge()}
              </div>
            )}
            {uiState.isTyping && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>응답 중...</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Tooltip title="설정">
              <Button
                type="text"
                icon={<Settings className="w-4 h-4" />}
                size="small"
                className="text-gray-500 hover:text-gray-700"
              />
            </Tooltip>
            
            <Tooltip title={isMinimized ? "확대" : "최소화"}>
              <Button
                type="text"
                icon={isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                size="small"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-gray-500 hover:text-gray-700"
              />
            </Tooltip>
          </div>
        </div>
      }
      bodyStyle={{ padding: 0 }}
    >
      {!isMinimized && (
        <>
          {/* 에러 알림 */}
          {(uiState.error || wsError) && (
            <div className="p-4 border-b">
              <Alert
                message={uiState.error || wsError}
                type="error"
                showIcon
                closable
                icon={<AlertCircle className="w-4 h-4" />}
                action={
                  !isConnected && (
                    <Button size="small" icon={<RefreshCw className="w-3 h-3" />} onClick={connect}>
                      재연결
                    </Button>
                  )
                }
                onClose={() => setUIState(prev => ({ ...prev, error: undefined }))}
              />
            </div>
          )}

          {/* 메시지 목록 */}
          <MessageList
            messages={messages}
            isLoading={uiState.isLoading}
            error={uiState.error}
            onRetry={handleRetryMessage}
            onDelete={handleDeleteMessage}
            height={height === '600px' ? '450px' : `calc(${height} - 150px)`}
            autoScroll={true}
          />

          {/* 메시지 입력 */}
          <div className="p-4 border-t border-gray-100">
            <MessageInput
              value={uiState.inputValue}
              onChange={(value) => setUIState(prev => ({ ...prev, inputValue: value }))}
              onSend={handleSendMessage}
              placeholder={
                isConnected 
                  ? "메시지를 입력하세요..." 
                  : "연결을 기다리는 중..."
              }
              disabled={!isConnected}
              isLoading={uiState.isLoading}
              maxLength={1000}
              multiline={true}
              showSendButton={true}
            />
          </div>
        </>
      )}
    </Card>
  );
};

export default ChatComponent;