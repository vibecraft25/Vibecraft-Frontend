import { useEffect } from "react";
import { Button } from "antd";
import { Database } from "lucide-react";

import { useSSE } from "@/hooks/useSSE";
import { useChannel } from "@/hooks/useChannel";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useMainPageLogic } from "@/hooks/useMainPageLogic";

import { useChatStore } from "@/stores/chatStore";
import { CONFIG } from "@/config/env";

import PromptBox from "../components/PromptBox";
import ChatView from "../components/chat/ChatView";
import Layout from "../components/Layout";
import Process from "@/components/Process";

const Main = () => {
  // 채널 관리 훅
  const { initializeSession } = useChannel();

  // 파일 업로드 훅 사용
  const { updateFiles } = useFileUpload();

  // 채팅 상태 및 데이터
  const chatItems = useChatStore((state) => state.chatItems);

  // chatItems 로드 상태 디버깅
  useEffect(() => {
    console.log("📋 Main.tsx chatItems 상태:", {
      length: chatItems.length,
      items: chatItems.map((item) => ({
        channelId: item.channelId,
        submit: item.submit,
      })),
    });
  }, [chatItems]);

  // useSSE 훅으로 채팅 기능 관리
  const {
    threadState,
    processStatus,
    channelId,
    messages,
    switchChannel,
    addMessage,
    setNextProcessStatus,
    sendMessage,
    startNewChat,
    fetchProcess,
  } = useSSE({
    serverUrl: CONFIG.API.BASE_URL,
    autoConnect: false,
    autoRestore: true,
    maxRetries: 5,
    retryInterval: 3000,
  });

  // 메인 페이지 로직 훅
  const {
    selectedProcessStatus,
    maxReachedStatus,
    sidebarProps,
    promptBoxProps,
    chatViewProps,
  } = useMainPageLogic({
    channelId,
    threadState,
    processStatus,
    messages,
    switchChannel,
    startNewChat,
    fetchProcess,
    sendMessage,
    addMessage,
    setNextProcessStatus,
    onUpdateUploadedFiles: updateFiles,
  });

  // 초기화 처리
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // 현재 채팅 제목 계산
  const getCurrentChatTitle = () => {
    if (!channelId) return "새로운 채팅";
    
    const currentChatItem = chatItems.find(
      (item) => item.lastThreadId === channelId
    );
    
    return currentChatItem ? currentChatItem.submit : "새로운 채팅";
  };

  return (
    <Layout showSidebar={true} sidebarProps={sidebarProps}>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* 헤더 */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-4">
              <Database className="w-5 h-5 text-purple-500" />
              <div>
                <h1 className="text-lg font-semibold text-gray-800">
                  {getCurrentChatTitle()}
                </h1>
                <p className="text-sm text-gray-500">
                  {channelId
                    ? `채팅 세션: ${channelId.slice(0, 8)}...`
                    : "채팅에 연결되어 있지 않습니다."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex relative min-h-0">
          <div className="w-full h-full border-r border-gray-200">
            <div className="flex h-full p-6">
              <div className="flex-1 overflow-hidden">
                {threadState === "ERROR" ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-red-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">연결 오류</h3>
                      <p className="text-gray-600 mb-4">서버와의 연결에 문제가 발생했습니다.</p>
                      <Button type="primary" onClick={() => window.location.reload()} 
                        className="bg-blue-500 hover:bg-blue-600">
                        페이지 새로고침
                      </Button>
                    </div>
                  </div>
                ) : threadState === "CONNECTING" ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">서버 연결 중</h3>
                      <p className="text-gray-600">잠시만 기다려주세요...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full" style={{ maxHeight: "100%" }}>
                    <Process
                      threadState={threadState}
                      processStatus={processStatus}
                      selectedStatus={selectedProcessStatus}
                      maxReachedStatus={maxReachedStatus}
                    />
                    <ChatView
                      key={`chatview-${channelId}-${messages.length}`}
                      {...chatViewProps}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Prompt Box */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 z-50">
            <PromptBox {...promptBoxProps} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Main;
