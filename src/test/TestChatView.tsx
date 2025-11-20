import { useEffect, useRef, useState } from "react";
import { Card, Typography, Empty, Spin } from "antd";
import { MessageSquare, User, Bot, Code } from "lucide-react";
import { useArtifactActions } from "@/core/stores/artifactStore";
import Markdown from "@/components/chat/Markdown";
import StreamingLoad from "@/components/chat/StreamingLoad";
import { TestMessage } from "./useTestSSE";

const { Text } = Typography;

interface TestChatViewProps {
  messages: TestMessage[];
  isLoading?: boolean;
  sseState?: "loading" | "streaming" | "completed" | undefined;
  firstAIMessageCompleted?: boolean;
}

const TestChatView = ({
  messages,
  isLoading = false,
  sseState,
  firstAIMessageCompleted = false,
}: TestChatViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { showArtifact } = useArtifactActions();
  const [isArtifactButtonLoading, setIsArtifactButtonLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 첫 번째 AI 메시지 완료 감지
  useEffect(() => {
    const firstAIMsg = messages.find(
      (m) => m.type === "ai" && m.status === "completed"
    );

    if (firstAIMsg && firstAIMessageCompleted && !isArtifactButtonLoading) {
      // 아티팩트 생성 시작 (isArtifactButtonLoading = false)
      setIsArtifactButtonLoading(false);

      // 10초 후 isArtifactButtonLoading = true로 변경
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsArtifactButtonLoading(true);
      }, 10000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [messages, firstAIMessageCompleted]);

  // 컴포넌트 언마운트 시 모든 타이머 정리
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 첫 번째 AI 메시지 ID 찾기 (완료된 것)
  const firstAIMessageId = messages.find(
    (m) => m.type === "ai" && m.status === "completed"
  )?.id;

  // displayMessages (메시지는 그대로, view 상태는 별도 관리)
  const displayMessages = messages;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 직접 스크롤 (부드러움 없이 즉시)
  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    // 마이크로태스크 큐를 사용해 DOM 업데이트 후에 스크롤
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 0);
  };

  // 사용자가 수동으로 스크롤했는지 감지 (마우스/터치)
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleMouseDown = () => {
      isUserScrollingRef.current = true;
    };

    const handleMouseUp = () => {
      // 100ms 후에 다시 자동 스크롤 가능하도록
      setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 100);
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // 메시지 변경 시 항상 스크롤 (입력 시)
  useEffect(() => {
    if (!isUserScrollingRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // 스트리밍 상태에서 주기적 스크롤
  // useEffect(() => {
  //   if (sseState === "streaming") {
  //     if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);

  //     // 100ms마다 스크롤
  //     scrollIntervalRef.current = setInterval(() => {
  //       if (!isUserScrollingRef.current) {
  //         scrollToBottom();
  //       }
  //     }, 100);

  //     return () => {
  //       if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
  //     };
  //   }
  // }, [sseState]);

  // 스트리밍 완료 시 최종 스크롤
  useEffect(() => {
    if (sseState === "completed") {
      const timer = setTimeout(() => {
        if (!isUserScrollingRef.current) {
          scrollToBottom();
        }
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [sseState]);

  // 아티팩트 보기 버튼 클릭
  const handleShowArtifact = (message: TestMessage) => {
    if (message.artifactUrl) {
      showArtifact(
        message.artifactUrl,
        message.id,
        message.artifactTitle,
        message.artifactDescription
      );
    }
  };

  // displayMessages가 없는 경우 (초기 로딩 시에만)
  if (displayMessages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Empty
          image={<MessageSquare className="w-16 h-16 text-gray-300" />}
          description={
            <div className="text-center">
              <p className="text-gray-500 mb-2">새로운 채팅을 시작하세요</p>
              <p className="text-sm text-gray-400">
                아래 입력창에 메시지를 입력해 채팅을 시작하세요.
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
    >
      {displayMessages.map((message) => (
        <div
          key={`test-chat-${message.id}`}
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
            {/* 헤더 */}
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
              <Text type="secondary" className="text-xs">
                {formatTime(message.timestamp)}
              </Text>
            </div>

            {/* 메시지 카드 */}
            <Card
              size="small"
              className={`${
                message.type === "human"
                  ? "bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200"
                  : "bg-gradient-to-r from-green-50 to-teal-50 border-green-200 p-4"
              } shadow-sm inline-block max-w-full`}
            >
              <div className="text-gray-800 prose prose-sm max-w-full overflow-hidden">
                <Markdown content={message.content} />

                {/* 스트리밍 상태 표시 */}
                {message.status === "streaming" && (
                  <StreamingLoad text="답변 생성중" />
                )}
              </div>
            </Card>

            {/* 아티팩트 상태 표시 */}
            {message.id === firstAIMessageId && !isArtifactButtonLoading && (
              <div className="mt-2 flex gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                  <Code className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <StreamingLoad className={"mt-0"} text="코드 생성중입니다" />
                </div>
              </div>
            )}

            {/* 웹에서 보기 버튼 */}
            {message.id === firstAIMessageId && isArtifactButtonLoading && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() =>
                    showArtifact(
                      "http://localhost:3001",
                      message.id,
                      "더블샷 카페",
                      "더블샷 카페 매출분석 보고서"
                    )
                  }
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <span className="text-xs text-blue-600 font-medium">
                    🌐 웹에서 보기
                  </span>
                </button>
              </div>
            )}
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

      {/* 하단 여유공간 */}
      {/* <div className="h-24" /> */}
    </div>
  );
};

export default TestChatView;
