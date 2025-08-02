import React, { useState, useEffect } from "react";
import { Button } from "antd";
import { Database } from "lucide-react";

import { useSSE } from "../hooks/useSSE";

import Intro from "../components/Intro";
import PromptBox from "../components/PromptBox";
import ChatView from "../components/ChatView";
import Layout from "../components/Layout";
import { PromptBoxSessionMessage } from "@/message/prompt";

const Main = () => {
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    sessionState,
    processStatus,
    sessionId,
    messages,
    chatItems,
    sendMessage,
    connect,
    startTyping,
    stopTyping,
    startNewChat,
  } = useSSE({
    serverUrl: "http://localhost:22041",
    sessionId: currentSessionId,
    autoConnect: false,
    maxRetries: 5,
    retryInterval: 3000,
  });

  // currentSessionId가 변경될 때 connect 호출
  useEffect(() => {
    if (currentSessionId && currentSessionId !== sessionId) {
      connect(currentSessionId);
    }
  }, [currentSessionId, sessionId, connect]);

  // sessionId가 빈값이 되면 currentSessionId도 초기화
  useEffect(() => {
    if (sessionId === "" && currentSessionId !== undefined) {
      setCurrentSessionId(undefined);
    }
  }, [sessionId, currentSessionId]);

  return (
    <Layout
      showSidebar={true}
      sidebarProps={{
        isOpen: sidebarOpen,
        onToggle: () => setSidebarOpen((prev) => !prev),
        chattingProps: {
          sessionId: sessionId,
          history: chatItems,
          setSessionId: setCurrentSessionId,
          onNewChat: startNewChat,
        },
      }}
    >
      <div className="h-screen flex flex-col bg-gray-50">
        {/* 헤더 */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-4">
              <Database className="w-5 h-5 text-purple-500" />
              <div>
                <h1 className="text-lg font-semibold text-gray-800">
                  {(() => {
                    if (!sessionId) {
                      return "새로운 채팅";
                    }

                    // 현재 세션의 ChatItem 찾기
                    const currentChatItem = chatItems.find(
                      (item) => item.sessionId === sessionId
                    );

                    if (currentChatItem) {
                      return currentChatItem.topic ?? currentChatItem.submit;
                    }
                    return "새로운 채팅";
                  })()}
                </h1>
                <p className="text-sm text-gray-500">
                  {sessionId
                    ? `채팅 세션: ${sessionId.slice(0, 8)}...`
                    : "채팅에 연결되어 있지 않습니다."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex relative min-h-0">
          <div className="w-full h-full border-r border-gray-200">
            {sessionState === "FIRST_VISIT" ? (
              <div className="w-full overflow-hidden h-screen">
                <Intro />
              </div>
            ) : (
              <div className="p-6">
                <div className="flex-1 overflow-hidden">
                  {sessionState === "ERROR" ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-red-500 mb-4">
                          <svg
                            className="w-12 h-12 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          연결 오류
                        </h3>
                        <p className="text-gray-600 mb-4">
                          서버와의 연결에 문제가 발생했습니다.
                        </p>
                        <Button
                          type="primary"
                          onClick={() => window.location.reload()}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          페이지 새로고침
                        </Button>
                      </div>
                    </div>
                  ) : sessionState === "CONNECTING" ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          서버 연결 중
                        </h3>
                        <p className="text-gray-600">잠시만 기다려주세요...</p>
                      </div>
                    </div>
                  ) : (
                    <ChatView
                      messages={messages}
                      isLoading={
                        sessionState === "SENDING" ||
                        sessionState === "RECEIVING"
                      }
                      sessionId={sessionId}
                      sessionState={sessionState}
                      processStatus={processStatus}
                      className="h-full"
                      maxHeight="100%"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fixed Prompt Box - 메인 컨텐츠 영역 내부에 absolute 배치 */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 z-50">
            <PromptBox
              processStatus={processStatus}
              placeholder={PromptBoxSessionMessage[sessionState]}
              disabled={
                sessionState === "CONNECTING" ||
                sessionState === "SENDING" ||
                sessionState === "RECEIVING" ||
                sessionState === "RECONNECTING"
              }
              sendMessage={sendMessage}
              onTyping={startTyping}
              onStopTyping={stopTyping}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Main;
