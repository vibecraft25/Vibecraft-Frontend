import { Button } from "antd";
import { Database, Upload } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";

import { useChannel } from "@/hooks/useChannel";
import { useArtifactState, useArtifactActions } from "@/core/stores/artifactStore";
import { useFileUpload } from "@/hooks/useFileUpload";

import Sidebar from "./Sidebar";
import PromptBox from "./PromptBox";
import ChatView from "./ChatView";
import ArtifactViewer from "@/components/ArtifactViewer";
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
  const artifactState = useArtifactState();
  const { hideArtifact } = useArtifactActions();
  const { addFiles } = useFileUpload();

  const { meta: channelMeta } = currentChannel ?? { meta: undefined };

  // 드래그 오버 상태
  const [isScreenDragOver, setIsScreenDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  // 현재 채팅 제목 계산
  const getCurrentChatTitle = () => {
    if (!channelMeta) return "새로운 채팅";

    return channelMeta.description ?? "채팅 제목 추후 update";
  };

  // 파일 선택 처리
  const handleFileSelect = useCallback((fileList: FileList) => {
    const newFiles = Array.from(fileList);
    if (newFiles.length > 0) {
      addFiles(newFiles);
    }
  }, [addFiles]);

  // 윈도우 레벨 드래그-드롭 이벤트 리스너
  useEffect(() => {
    const handleWindowDragEnter = (e: DragEvent) => {
      // DataTransfer에 files가 있는 경우에만 처리
      if (e.dataTransfer?.items) {
        let hasFiles = false;
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === "file") {
            hasFiles = true;
            break;
          }
        }
        if (hasFiles) {
          dragCounterRef.current++;
          setIsScreenDragOver(true);
        }
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleWindowDragLeave = (_e: DragEvent) => {
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsScreenDragOver(false);
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsScreenDragOver(false);

      // 파일 처리
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files);
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener("dragenter", handleWindowDragEnter, false);
    window.addEventListener("dragover", handleWindowDragOver, false);
    window.addEventListener("dragleave", handleWindowDragLeave, false);
    window.addEventListener("drop", handleWindowDrop, false);

    // 정리
    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter, false);
      window.removeEventListener("dragover", handleWindowDragOver, false);
      window.removeEventListener("dragleave", handleWindowDragLeave, false);
      window.removeEventListener("drop", handleWindowDrop, false);
    };
  }, [handleFileSelect]);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar channelsProps={{ channels, createChannel, switchChannel }} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
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
                {/* 드래그 오버레이 */}
                {isScreenDragOver && (
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-none">
                    <div className="bg-white/95 rounded-2xl shadow-lg p-8 text-center max-w-md border border-blue-200">
                      <div className="flex justify-center mb-4">
                        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-full p-4">
                          <Upload className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <p className="text-2xl font-semibold text-gray-900 mb-2">
                        파일 업로드
                      </p>
                      <p className="text-sm text-gray-600">
                        여기에 파일을 놓으세요
                      </p>
                    </div>
                  </div>
                )}

                {/* 채팅 영역 */}
                <div className={`flex-1 h-full ${artifactState.isVisible ? "" : "w-full"} transition-all duration-300 flex flex-col`}>
                  <div className="flex-1 overflow-hidden">
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

                  {/* Prompt Box - ChatView와 함께 줄어드는 영역 */}
                  <div className="flex-shrink-0 px-6 pb-6">
                    <PromptBox
                      channelMeta={channelMeta}
                      sendMessage={sendMessage}
                    />
                  </div>
                </div>

                {/* Artifact Viewer */}
                <ArtifactViewer
                  targetUrl={artifactState.currentUrl || ""}
                  title={artifactState.title}
                  description={artifactState.description}
                  isVisible={artifactState.isVisible}
                  onClose={hideArtifact}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;
