import { Button, message as antMessage } from "antd";
import { Database, Upload as UploadIcon } from "lucide-react";
import { useState, useCallback } from "react";

import { useChannel } from "@/hooks/useChannel";
import { useFileUpload } from "@/hooks/useFileUpload";
import { validateFile } from "@/utils/fileUtils";

import Sidebar from "./Sidebar";
import PromptBox from "./PromptBox";
import ChatView from "./ChatView";
import { useSSE } from "@/hooks";

const Main = () => {
  const {
    channels,
    currentChannel,
    hasChannels,
    createChannel,
    switchChannel,
    isChannelLoading,
    isApiLoading,
  } = useChannel({
    autoLoad: true,
  });

  const { sendMessage } = useSSE();

  const { meta: channelMeta } = currentChannel ?? { meta: undefined };

  // File upload hooks
  const { addFiles, files } = useFileUpload();
  const [isDragging, setIsDragging] = useState(false);

  // 현재 채팅 제목 계산
  const getCurrentChatTitle = () => {
    if (!channelMeta) return "새로운 채팅";

    return channelMeta.description ?? "채팅 제목 추후 update";
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 깜빡임 방지: 실제로 컨테이너를 벗어날 때만 isDragging을 false로 설정
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;

      // Check if file already exists
      if (files.length > 0) {
        antMessage.error("이미 첨부된 파일이 있습니다. 기존 파일을 삭제한 후 새 파일을 추가해주세요.");
        return;
      }

      // Single file mode - only take the first file
      const file = droppedFiles[0];

      // Validate file
      const validation = validateFile(file, 10);
      if (!validation.isValid) {
        antMessage.error(validation.error);
        return;
      }

      // Add file to store (don't upload yet)
      addFiles([file]);
      antMessage.success({
        content: `${file.name} 파일이 추가되었습니다. 메시지를 입력하고 전송하세요.`,
        duration: 3,
      });
    },
    [addFiles, files]
  );

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar channelsProps={{ channels, createChannel, switchChannel }} />

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col min-w-0 h-full relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay - 단순한 디자인 */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* 반투명 배경 */}
            <div className="absolute inset-0 bg-blue-50/80"></div>

            {/* 점선 테두리 */}
            <div className="absolute inset-8 border-3 border-dashed border-blue-400 rounded-lg"></div>

            {/* 컨텐츠 */}
            <div className="relative bg-white rounded-lg p-8 shadow-lg border border-blue-200">
              {/* 아이콘 */}
              <div className="flex justify-center mb-4">
                <div className="bg-blue-500 rounded-lg p-4">
                  <UploadIcon className="w-12 h-12 text-white" strokeWidth={2} />
                </div>
              </div>

              {/* 텍스트 */}
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  파일을 여기에 드롭하세요
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  CSV, SQL, JSON, XLSX • 최대 10MB
                </p>
              </div>
            </div>
          </div>
        )}


        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col bg-gray-50">
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
                      {channelMeta
                        ? `채팅 세션: ${channelMeta.channelId.slice(0, 8)}...`
                        : "채팅에 연결되어 있지 않습니다."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 메인 컨텐츠 */}
            {hasChannels && channelMeta && (
              <div className="flex-1 flex relative min-h-0">
                <div className="w-full h-full border-r border-gray-200">
                  <div className="flex h-full p-6">
                    <div className="flex-1 overflow-hidden">
                      {channelMeta.threadStatus === "ERROR" ? (
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
                      ) : isChannelLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              서버 연결 중
                            </h3>
                            <p className="text-gray-600">
                              잠시만 기다려주세요...
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex flex-col h-full"
                          style={{ maxHeight: "100%" }}
                        >
                          <ChatView
                            channelMeta={channelMeta}
                            isLoading={isApiLoading}
                            sendMessage={sendMessage}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fixed Prompt Box */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 z-50">
                  <PromptBox
                    channelMeta={channelMeta}
                    sendMessage={sendMessage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;
