import React, { useEffect, useRef, useState } from "react";
import { Card, Typography, Empty, Spin, Badge } from "antd";
import {
  MessageSquare,
  User,
  Bot,
  Target,
  Database,
  Wrench,
  Rocket,
} from "lucide-react";
import { SSEMessage, AIResponse } from "@/hooks/useSSE";
import { ThreadState, ProcessStatus } from "@/types/session";
import Process from "./Process";

const { Text } = Typography;

interface ChatViewProps {
  messages: SSEMessage[];
  aiResponse?: AIResponse;
  isLoading?: boolean;
  threadId?: string;
  threadState?: ThreadState;
  processStatus: ProcessStatus;
  fetchProcess: (status: ProcessStatus) => void;
  className?: string;
  maxHeight?: string;
}

const ChatView = ({
  messages,
  aiResponse,
  isLoading = false,
  threadId,
  threadState,
  processStatus,
  fetchProcess,
  className = "",
  maxHeight = "400px",
}: ChatViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
                  : threadId
                  ? "대화 히스토리가 없습니다"
                  : "세션을 선택하세요"}
              </p>
              <p className="text-sm text-gray-400">
                {isNewChat
                  ? "아래 입력창에 메시지를 입력해 채팅을 시작하세요."
                  : threadId
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
    <div className={`flex flex-col h-full ${className}`} style={{ maxHeight }}>
      {/* ProcessStatus 표시 */}
      <Process
        threadState={threadState}
        processStatus={processStatus}
        fetchProcess={fetchProcess}
      />

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {messages.map((message, idx) => (
          <div
            key={`ChatView-${threadId}-Chat-${idx}`}
            className={`flex items-start space-x-3 ${
              message.type === "user" ? "flex-row-reverse space-x-reverse" : ""
            }`}
          >
            {/* 아바타 */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === "user"
                  ? "bg-gradient-to-r from-purple-500 to-blue-500"
                  : "bg-gradient-to-r from-green-500 to-teal-500"
              }`}
            >
              {message.type === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            {/* 메시지 내용 */}
            <div
              className={`min-w-0 max-w-[75%] ${
                message.type === "user"
                  ? "flex flex-col items-end"
                  : "flex flex-col items-start"
              }`}
            >
              <div
                className={`flex items-center space-x-2 mb-1 ${
                  message.type === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                <Text
                  strong
                  className={`text-sm ${
                    message.type === "user"
                      ? "text-purple-700"
                      : "text-green-700"
                  }`}
                >
                  {message.type === "user" ? "사용자" : "AI"}
                </Text>
                <Text type="secondary" className="text-xs">
                  {formatTime(message.timestamp)}
                </Text>
              </div>

              <Card
                size="small"
                className={`${
                  message.type === "user"
                    ? "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
                    : "bg-gradient-to-r from-green-50 to-teal-50 border-green-200"
                } shadow-sm inline-block`}
                styles={{ body: { padding: "12px" } }}
              >
                <div className="text-gray-800 whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                {/* 순차 메시지 표시 (만약 sequence 정보가 있다면) */}
                {message.type === "server" &&
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

        {/* 진행 중인 AI 응답 표시 */}
        {aiResponse && !aiResponse.isComplete && aiResponse.content && (
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
                  응답 중...
                </Text>
                <Spin size="small" />
              </div>
              <Card
                size="small"
                className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200 shadow-sm inline-block"
                styles={{ body: { padding: "12px" } }}
              >
                <div className="text-gray-800 whitespace-pre-wrap break-words">
                  {aiResponse.content}
                </div>
              </Card>
            </div>
          </div>
        )}

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
    </div>
  );
};

export default ChatView;
