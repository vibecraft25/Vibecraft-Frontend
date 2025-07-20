import React, { useEffect, useRef, useState } from 'react';
import { Spin, Alert, Button, Empty } from 'antd';
import { RefreshCw, MessageCircle } from 'lucide-react';
import { MessageListProps } from '../types/chat.types';
import MessageItem from './MessageItem';

const MessageList: React.FC<MessageListProps> = ({
  messages = [],
  isLoading = false,
  error,
  className = '',
  onRetry,
  onDelete,
  height = '400px',
  autoScroll = true
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // 새 메시지가 추가되면 자동 스크롤
  useEffect(() => {
    if (autoScroll && !userScrolled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, autoScroll, userScrolled]);

  // 스크롤 이벤트 처리
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // 사용자가 스크롤했는지 감지
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setUserScrolled(!isNearBottom);
    setShowScrollToBottom(!isNearBottom && messages.length > 0);
  };

  // 맨 아래로 스크롤
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
      setUserScrolled(false);
      setShowScrollToBottom(false);
    }
  };

  // 날짜별 그룹화
  const groupMessagesByDate = () => {
    const groups: { [key: string]: typeof messages } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '오늘';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '어제';
    } else {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }).format(date);
    }
  };

  const messageGroups = groupMessagesByDate();

  return (
    <div className={`relative ${className}`}>
      <div
        ref={containerRef}
        className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        style={{ height }}
        onScroll={handleScroll}
      >
        {/* 에러 상태 */}
        {error && (
          <div className="p-4">
            <Alert
              message="메시지 로딩 중 오류가 발생했습니다"
              description={error}
              type="error"
              showIcon
              action={
                <Button size="small" onClick={() => window.location.reload()}>
                  다시 시도
                </Button>
              }
            />
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Spin size="large" />
              <p className="mt-4 text-gray-500">메시지를 불러오는 중...</p>
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-full">
            <Empty
              image={<MessageCircle className="w-16 h-16 text-gray-300 mx-auto" />}
              description={
                <span className="text-gray-500">
                  아직 메시지가 없습니다.<br />
                  첫 번째 메시지를 보내보세요!
                </span>
              }
            />
          </div>
        )}

        {/* 메시지 목록 */}
        {messages.length > 0 && (
          <div className="p-4 space-y-6">
            {Object.entries(messageGroups).map(([dateString, groupMessages]) => (
              <div key={dateString}>
                {/* 날짜 헤더 */}
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {formatDateHeader(dateString)}
                  </div>
                </div>

                {/* 해당 날짜의 메시지들 */}
                <div className="space-y-1">
                  {groupMessages.map((message, index) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      showTimestamp={true}
                      showStatus={true}
                      onRetry={onRetry ? () => onRetry(message.id) : undefined}
                      onDelete={onDelete ? () => onDelete(message.id) : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 추가 로딩 (메시지가 있을 때) */}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-center py-4">
            <Spin />
          </div>
        )}

        {/* 스크롤 앵커 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 맨 아래로 스크롤 버튼 */}
      {showScrollToBottom && (
        <Button
          type="primary"
          shape="circle"
          icon={<RefreshCw className="w-4 h-4" />}
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 shadow-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 border-0"
          style={{ transform: 'rotate(90deg)' }}
        />
      )}
    </div>
  );
};

export default MessageList;