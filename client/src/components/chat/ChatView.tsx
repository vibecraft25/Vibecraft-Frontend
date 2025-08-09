import { useEffect, useRef } from "react";
import { Card, Typography, Empty, Spin } from "antd";
import { MessageSquare, User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { SSEMessage } from "@/hooks/useSSE";
import { ThreadState, ProcessStatus } from "@/types/session";

import Process from "../Process";
import ComponentRenderer from "./ComponentRenderer";

const { Text } = Typography;

interface ChatViewProps {
  messages: SSEMessage[];
  isLoading?: boolean;
  channelId?: string;
  threadState?: ThreadState;
  processStatus: ProcessStatus;
  selectedStatus?: ProcessStatus;
  maxReachedStatus?: ProcessStatus;
  fetchProcess: (status: ProcessStatus) => void;
  onMenuOptionSelect: (selectedOption: any) => void;
  className?: string;
  maxHeight?: string;
}

const ChatView = ({
  messages,
  isLoading = false,
  channelId,
  threadState,
  processStatus,
  selectedStatus,
  maxReachedStatus,
  fetchProcess,
  onMenuOptionSelect,
  className = "",
  maxHeight = "400px",
}: ChatViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 업데이트 디버깅
  useEffect(() => {
    console.log("🔄 ChatView messages 업데이트:", {
      length: messages.length,
      channelId,
      timestamp: new Date().toISOString(),
      messages: messages.map((m) => ({
        content:
          typeof m.content === "string" ? m.content.slice(0, 50) : "array",
        type: m.type,
      })),
    });
  }, [messages, channelId]);

  // 새 메시지가 오면 스크롤을 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 메시지가 없고 로딩 중이 아닐 때
  if (messages.length === 0 && !isLoading) {
    // IDLE 상태 (새 채팅 시작)와 기타 상태 구분
    const isNewChat = threadState === "IDLE";

    return (
      <div
        className={`flex flex-col h-full ${className}`}
        style={{ maxHeight }}
      >
        {/* ProcessStatus 표시 */}
        <Process
          threadState={threadState}
          processStatus={processStatus}
          selectedStatus={selectedStatus}
          maxReachedStatus={maxReachedStatus}
        />
        <div
          className={`flex items-center justify-center ${className}`}
          style={{ height: maxHeight }}
        >
          <Empty
            image={<MessageSquare className="w-16 h-16 text-gray-300" />}
            description={
              <div className="text-center">
                <p className="text-gray-500 mb-2">
                  {isNewChat
                    ? "새로운 채팅을 시작하세요"
                    : channelId
                    ? "대화 히스토리가 없습니다"
                    : "세션을 선택하세요"}
                </p>
                <p className="text-sm text-gray-400">
                  {isNewChat
                    ? "아래 입력창에 메시지를 입력해 채팅을 시작하세요."
                    : channelId
                    ? "아래 입력창에 메시지를 입력해보세요."
                    : "사이드바에서 채팅 세션을 선택하거나 새로 시작하세요."}
                </p>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`} style={{ maxHeight }}>
      {/* ProcessStatus 표시 */}
      <Process
        threadState={threadState}
        processStatus={processStatus}
        selectedStatus={selectedStatus}
        maxReachedStatus={maxReachedStatus}
        fetchProcess={fetchProcess}
      />

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {messages.map((message, idx) => (
          <div
            key={`ChatView-${channelId}-Chat-${idx}`}
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
                } shadow-sm inline-block`}
                styles={{ body: { padding: "12px" } }}
              >
                {/* 컴포넌트 메시지 처리 */}
                {message.componentType ? (
                  <ComponentRenderer
                    message={message}
                    onMenuOptionSelect={onMenuOptionSelect}
                  />
                ) : (
                  <div className="text-gray-800 prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {Array.isArray(message.content)
                        ? message.content.join("\n")
                        : message.content}
                    </ReactMarkdown>
                  </div>
                )}
                {/* 순차 메시지 표시 (만약 sequence 정보가 있다면) */}
                {message.type === "ai" &&
                  (message as any).sequence &&
                  (message as any).total && (
                    <div className="text-xs text-gray-400 mt-1">
                      {(message as any).sequence}/{(message as any).total}
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

        {/* 파일 업로드 AI 메시지 - DATA 단계에서만 표시 */}
        {/* {showFileUpload && <Uploader />} */}

        {/* 스크롤 앵커 */}
        <div ref={messagesEndRef} />

        {/* PromptBox와 겹치지 않도록 하단 여유공간 추가 */}
        <div className="h-24" />
      </div>
    </div>
  );
};

export default ChatView;
