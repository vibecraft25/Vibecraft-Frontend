import React, { useState, useEffect } from "react";
import { List, Button, Typography, Tooltip } from "antd";
import {
  MessageSquare,
  Plus,
  Calendar,
} from "lucide-react";

const { Text } = Typography;

export interface ChatItem {
  sessionId: string;
  submit: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChattingsProps {
  className?: string;
  sessionId?: string;
  history?: ChatItem[];
  setSessionId: (sessionId: string) => void;
  onNewChat?: () => void;
}

const Chattings = ({
  className = "",
  sessionId,
  history,
  setSessionId,
  onNewChat,
}: ChattingsProps) => {
  const [chatItems, setChatItems] = useState<ChatItem[]>(history ?? []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "오늘";
    if (diffDays === 2) return "어제";
    if (diffDays <= 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR");
  }

  // history props 변경 시 chatItems 업데이트
  useEffect(() => {
    setChatItems(history ?? []);
  }, [history]);

  const createNewSession = () => {
    onNewChat?.();
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 새 채팅 버튼 */}
      <div className="p-4 border-b border-gray-100">
        <Button
          type="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={createNewSession}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 border-0 rounded-lg"
        >
          새 채팅 시작
        </Button>
      </div>

      {/* 채팅 세션 목록 */}
      <div className="flex-1 overflow-y-auto">
        {chatItems.length > 0 ? (
          <div className="space-y-1">
            {chatItems.map((item) => (
              <div
                key={item.sessionId}
                className={`cursor-pointer transition-all duration-200 rounded-lg mx-3 px-3 py-3 group hover:bg-gray-50 ${
                  item.sessionId === sessionId
                    ? "bg-gradient-to-r from-purple-50 to-blue-50 border-l-3 border-purple-500"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => setSessionId(item.sessionId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    {/* 제목 */}
                    <div className="mb-2">
                      <Text
                        strong={item.sessionId === sessionId}
                        className={`text-sm line-clamp-2 ${
                          item.sessionId === sessionId
                            ? "text-purple-700"
                            : "text-gray-800"
                        }`}
                        title={item.submit}
                      >
                        {item.submit}
                      </Text>
                    </div>
                    
                    {/* 마지막 메시지 */}
                    <div className="mb-2">
                      <Text 
                        type="secondary" 
                        className="text-xs line-clamp-2 text-gray-500"
                        title={item.lastMessage}
                      >
                        {item.lastMessage}
                      </Text>
                    </div>
                    
                    {/* 날짜 */}
                    <div className="flex items-center text-xs text-gray-400">
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>{formatDate(item.updatedAt)}</span>
                    </div>
                  </div>
                  
                  {/* 더보기 버튼 */}
                  <div className="flex-shrink-0">
                    <Tooltip title="더보기">
                      <Button
                        type="text"
                        size="small"
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 추후 드롭다운 메뉴 구현
                        }}
                      >
                        •••
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <Text type="secondary" className="block mb-2">
              채팅 세션이 없습니다.
            </Text>
            <Button
              type="link"
              onClick={createNewSession}
              className="text-purple-600 hover:text-purple-700 p-0"
            >
              첫 번째 채팅을 시작해보세요
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chattings;
