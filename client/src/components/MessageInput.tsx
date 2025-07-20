import React, { useState, useRef, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import { Send, Loader2, Paperclip, Smile } from 'lucide-react';
import { MessageInputProps } from '../types/chat.types';

const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  placeholder = "메시지를 입력하세요...",
  disabled = false,
  isLoading = false,
  maxLength = 1000,
  className = '',
  showSendButton = true,
  multiline = true,
  onKeyPress
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (onKeyPress) {
      onKeyPress(event);
      return;
    }

    // Enter로 전송 (Shift+Enter는 줄바꿈)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled && !isLoading) {
      onSend(value.trim());
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !isLoading;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm transition-all duration-200 ${
      isFocused ? 'ring-2 ring-purple-500 ring-opacity-20 border-purple-300' : ''
    } ${className}`}>
      <div className="flex items-end p-3 space-x-3">
        {/* 첨부 파일 버튼 (추후 구현) */}
        <Tooltip title="파일 첨부 (준비 중)">
          <Button
            type="text"
            icon={<Paperclip className="w-4 h-4" />}
            disabled={true}
            className="flex-shrink-0 w-8 h-8 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          />
        </Tooltip>

        {/* 텍스트 입력 영역 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full resize-none border-0 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 ${
              multiline ? 'min-h-[20px] max-h-32' : 'h-5'
            }`}
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              paddingTop: multiline ? '2px' : '0'
            }}
            rows={multiline ? undefined : 1}
          />
          
          {/* 글자 수 카운터 */}
          {maxLength && (
            <div className="absolute bottom-0 right-0 text-xs text-gray-400">
              {value.length}/{maxLength}
            </div>
          )}
        </div>

        {/* 이모지 버튼 (추후 구현) */}
        <Tooltip title="이모지 (준비 중)">
          <Button
            type="text"
            icon={<Smile className="w-4 h-4" />}
            disabled={true}
            className="flex-shrink-0 w-8 h-8 p-0 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          />
        </Tooltip>

        {/* 전송 버튼 */}
        {showSendButton && (
          <Tooltip title={canSend ? "메시지 전송 (Enter)" : "메시지를 입력하세요"}>
            <Button
              type="primary"
              icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              onClick={handleSend}
              disabled={!canSend}
              loading={isLoading}
              className={`flex-shrink-0 h-8 w-8 p-0 rounded-full transition-all duration-200 ${
                canSend 
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-md hover:shadow-lg' 
                  : 'bg-gray-300'
              }`}
            />
          </Tooltip>
        )}
      </div>

      {/* 힌트 텍스트 */}
      <div className="px-3 pb-2 text-xs text-gray-400">
        <span>Enter로 전송, Shift+Enter로 줄바꿈</span>
      </div>
    </div>
  );
};

export default MessageInput;