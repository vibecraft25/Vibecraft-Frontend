import React from 'react';
import { Avatar, Tooltip, Button } from 'antd';
import { 
  User, 
  Bot, 
  Settings, 
  Clock, 
  Check, 
  CheckCheck, 
  AlertCircle, 
  RotateCcw,
  Trash2
} from 'lucide-react';
import { ChatMessage, MessageItemProps } from '../types/chat.types';

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showTimestamp = true,
  showStatus = true,
  onRetry,
  onDelete,
  className = ''
}) => {
  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';
  const isAssistant = message.type === 'assistant';

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(timestamp);
  };

  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getAvatarIcon = () => {
    if (isUser) return <User className="w-4 h-4" />;
    if (isAssistant) return <Bot className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  const getAvatarColor = () => {
    if (isUser) return 'bg-blue-500';
    if (isAssistant) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getMessageAlign = () => {
    if (isUser) return 'justify-end';
    return 'justify-start';
  };

  const getMessageBgColor = () => {
    if (isUser) return 'bg-blue-500 text-white';
    if (isSystem) return 'bg-gray-100 text-gray-700';
    return 'bg-white border border-gray-200 text-gray-800';
  };

  return (
    <div className={`flex ${getMessageAlign()} mb-4 group ${className}`}>
      <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 ${isUser ? 'space-x-reverse' : ''}`}>
        {/* 아바타 */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getAvatarColor()} flex items-center justify-center text-white`}>
          {getAvatarIcon()}
        </div>

        {/* 메시지 버블 */}
        <div className="flex flex-col">
          <div
            className={`px-4 py-2 rounded-2xl shadow-sm ${getMessageBgColor()} ${
              isUser ? 'rounded-br-md' : 'rounded-bl-md'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          </div>

          {/* 메타데이터 */}
          <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {showTimestamp && (
              <span>{formatTime(message.timestamp)}</span>
            )}
            
            {showStatus && isUser && (
              <div className="flex items-center">
                {getStatusIcon()}
              </div>
            )}

            {/* 액션 버튼 (호버 시 표시) */}
            <div className={`flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'order-first' : ''}`}>
              {message.status === 'error' && onRetry && (
                <Tooltip title="다시 시도">
                  <Button
                    type="text"
                    size="small"
                    icon={<RotateCcw className="w-3 h-3" />}
                    onClick={onRetry}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                  />
                </Tooltip>
              )}
              
              {onDelete && (
                <Tooltip title="삭제">
                  <Button
                    type="text"
                    size="small"
                    icon={<Trash2 className="w-3 h-3" />}
                    onClick={onDelete}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  />
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;