import { useEffect, useCallback, useRef, useState } from "react";
import { Card, Typography, Empty, Spin } from "antd";
import { MessageSquare, User, Bot } from "lucide-react";

// import { SSEMessage } from "@/hooks/useSSE";
import {
  ChannelMeta,
  StreamEndpoint,
  useChatState,
} from "@/core";

import ComponentRenderer from "@/components/chat/ComponentRenderer";
import { MenuOption } from "@/components/chat/Menu";
import Markdown from "@/components/chat/Markdown";

const { Text } = Typography;

interface ChatViewProps {
  channelMeta: ChannelMeta;
  isLoading?: boolean;
  sendMessage: (
    message: string,
    props?: {
      userMessage?: boolean;
      endpoint?: StreamEndpoint;
      additionalParams?: Record<string, string>;
    }
  ) => Promise<boolean>;
}

const ChatView = ({
  channelMeta,
  isLoading = false,
}: ChatViewProps) => {
  // 선택된 컬럼들을 관리하는 상태
  const [selectedColumns, setSelectedColumns] = useState<{
    recommand: string[];
    self: string[];
  }>({ recommand: [], self: [] });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  const { messages } = useChatState();

  const formatTime = (timestamp: Date | string) => {
    return new Date(timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 스크롤 이벤트 핸들러
  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px 여유
      isUserScrollingRef.current = !isAtBottom;
    }
  };

  const mediumScrollToBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const start = container.scrollTop;
    const end = container.scrollHeight - container.clientHeight;
    const distance = end - start;
    const duration = 300; // smooth보다 빠르고 auto보다 부드럽게

    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOut 효과로 자연스럽게
      const easeOut = 1 - Math.pow(1 - progress, 2);

      container.scrollTop = start + distance * easeOut;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const handleMenuOptionSelect = useCallback(
    async (selectedOption: MenuOption) => {
      console.log("📋 메뉴 옵션 선택:", selectedOption);
    },
    [channelMeta, selectedColumns.recommand, selectedColumns.self]
  );

  // 새 메시지가 오면 스크롤을 아래로
  useEffect(() => {
    if (!isUserScrollingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // isLoading일때 (API 동작중) 스크롤을 아래로
  useEffect(() => {
    if (messages.length > 0 && isLoading) {
      mediumScrollToBottom();
    }
  }, [messages, isLoading]);

  // 메시지가 없고 로딩 중이 아닐 때
  if (messages.length === 0 && !isLoading) {
    // IDLE 상태 (새 채팅 시작)와 기타 상태 구분
    const isNewChat = channelMeta.threadStatus === "IDLE";

    return (
      <div className={`flex items-center justify-center h-full`}>
        <Empty
          image={<MessageSquare className="w-16 h-16 text-gray-300" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">
                {isNewChat
                  ? "새로운 채팅을 시작하세요"
                  : channelMeta.channelId
                  ? "대화 히스토리가 없습니다"
                  : "세션을 선택하세요"}
              </p>
              <p className="text-sm text-gray-400">
                {isNewChat
                  ? "아래 입력창에 메시지를 입력해 채팅을 시작하세요."
                  : channelMeta.channelId
                  ? "아래 입력창에 메시지를 입력해보세요."
                  : "사이드바에서 채팅 세션을 선택하거나 새로 시작하세요."}
              </p>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      style={{ maxHeight: "calc(100vh - 200px)" }}
      onScroll={handleScroll}
    >
      {messages.map((message, idx) => (
        <div
          key={`ChatView-${channelMeta.channelId}-Chat-${idx}`}
          className={`flex items-start space-x-3 ${
            message.type === "human" ? "flex-row-reverse space-x-reverse" : ""
          }`}
        >
          {/* 아바타 */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.type === "human"
                ? "bg-gradient-to-r from-purple-500 to-blue-500"
                : "bg-gradient-to-r from-green-500 to-teal-500"
            }`}
          >
            {message.type === "human" ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Bot className="w-4 h-4 text-white" />
            )}
          </div>

          {/* 메시지 내용 */}
          <div
            className={`min-w-0 max-w-[75%] ${
              message.type === "human"
                ? "flex flex-col items-end"
                : "flex flex-col items-start"
            }`}
          >
            <div
              className={`flex items-center space-x-2 mb-1 ${
                message.type === "human"
                  ? "flex-row-reverse space-x-reverse"
                  : ""
              }`}
            >
              <Text
                strong
                className={`text-sm ${
                  message.type === "human"
                    ? "text-purple-700"
                    : "text-green-700"
                }`}
              >
                {message.type === "human" ? "사용자" : "AI"}
              </Text>
              {message?.timestamp && (
                <Text type="secondary" className="text-xs">
                  {formatTime(message.timestamp)}
                </Text>
              )}
            </div>

            <Card
              size="small"
              className={`${
                message.type === "human"
                  ? "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
                  : "bg-gradient-to-r from-green-50 to-teal-50 border-green-200"
              } shadow-sm inline-block max-w-full`}
              styles={{ body: { padding: "12px" } }}
            >
              {/* 컴포넌트 메시지 처리 */}
              {message.componentType ? (
                <ComponentRenderer
                  message={message}
                  threadId={channelMeta.threadId}
                  lastEndpoint={channelMeta.lastEndpoint}
                  selectedColumns={selectedColumns.self}
                  setSelectedColumns={(columns: string[]) => {
                    setSelectedColumns((prev) => ({
                      ...prev,
                      self: columns,
                      recommand:
                        prev.recommand.length === 0 ? columns : prev.recommand,
                    }));
                  }}
                  onMenuOptionSelect={handleMenuOptionSelect}
                />
              ) : (
                <div className="text-gray-800 prose prose-sm max-w-full overflow-hidden">
                  <Markdown content={message.content} />
                </div>
              )}
            </Card>
          </div>
        </div>
      ))}

      {/* 로딩 표시 */}
      {isLoading && (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 max-w-[75%] flex flex-col items-start">
            <div className="flex items-center space-x-2 mb-1">
              <Text strong className="text-sm text-green-700">
                AI
              </Text>
              <Text type="secondary" className="text-xs">
                입력 중...
              </Text>
            </div>
            <Card
              size="small"
              className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200 shadow-sm inline-block"
              styles={{ body: { padding: "12px" } }}
            >
              <div className="flex items-center space-x-2">
                <Spin size="small" />
                <Text type="secondary" className="text-sm">
                  응답을 생성하고 있습니다...
                </Text>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 스크롤 앵커 */}
      <div ref={messagesEndRef} />

      {/* PromptBox와 겹치지 않도록 하단 여유공간 추가 */}
      <div className="h-24" />
    </div>
  );
};

export default ChatView;
