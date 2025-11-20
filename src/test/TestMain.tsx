import { Database, Upload } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { message as antMessage } from "antd";

import {
  useArtifactState,
  useArtifactActions,
} from "@/core/stores/artifactStore";

import TestChatView from "./TestChatView";
import TestPromptBox from "./TestPromptBox";
import ArtifactViewer from "@/components/ArtifactViewer";
import TestSidebar from "./TestSidebar";
import { useTestSSE } from "./useTestSSE";
import { useTestChannel } from "./useTestChannel";

const TestMain = () => {
  const {
    messages,
    sseState,
    sendMessage,
    firstAIMessageCompleted,
    clearMessages,
  } = useTestSSE();
  const {
    channels,
    currentChannel,
    currentChannelId,
    hasChannels,
    createChannel,
    switchChannel,
    deleteChannel,
    updateChannelMeta,
  } = useTestChannel({
    autoLoad: true,
  });

  const { meta: channelMeta } = currentChannel ?? { meta: undefined };

  const artifactState = useArtifactState();
  const { hideArtifact } = useArtifactActions();

  // 첫 입력 추적
  const [hasFirstMessage, setHasFirstMessage] = useState(false);

  // 업로드된 파일 추적
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // 드래그 오버 상태
  const [isScreenDragOver, setIsScreenDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  // 채널별 메시지 저장
  const [channelMessages, setChannelMessages] = useState<
    Record<string, typeof messages>
  >({});

  // 페이지 접속 시 자동으로 새로운 채널 생성
  useEffect(() => {
    if (!currentChannelId) {
      // 현재 채널이 없으면 새로운 채널 생성
      createChannel("새로운 채팅", "");
    }
  }, [currentChannelId, createChannel]);

  // 현재 채널의 메시지 저장 및 로드
  useEffect(() => {
    if (currentChannelId) {
      // 이전 채널의 메시지 저장
      setChannelMessages((prev) => ({
        ...prev,
        [currentChannelId]: messages,
      }));
    }
  }, [messages, currentChannelId]);

  // 첫 번째 AI 메시지 완료 시 채널 제목 업데이트
  useEffect(() => {
    if (currentChannelId && messages.length > 0) {
      const firstAIMsg = messages.find(
        (m) => m.type === "ai" && m.status === "completed"
      );

      if (firstAIMsg && channelMeta?.channelName === "새로운 채팅") {
        console.log("✅ 채널 제목 업데이트 (SSE Complete)");
        updateChannelMeta(currentChannelId, {
          channelName: "더블샷 카페 매출분석 보고서",
        });
      }
    }
  }, [messages, currentChannelId, channelMeta?.channelName, updateChannelMeta]);

  // 첫 번째 메시지 전송 시 상태 업데이트
  useEffect(() => {
    if (messages.length > 1 && !hasFirstMessage) {
      // 첫 번째 AI 메시지 감지
      setHasFirstMessage(true);
    }
  }, [messages, hasFirstMessage]);

  // 파일 선택 처리
  const handleFileSelect = useCallback((fileList: FileList) => {
    const newFiles = Array.from(fileList);
    if (newFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      antMessage.success(`📎 ${newFiles.length}개 파일이 업로드되었습니다.`);
      console.log(
        "📎 업로드된 파일:",
        newFiles.map((f) => f.name)
      );
    }
  }, []);

  // 파일 제거 처리
  const handleFileRemove = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    antMessage.info("파일이 제거되었습니다.");
  }, []);

  // 프롬프트 박스 제출 처리
  const handlePromptSubmit = useCallback(
    async (prompt: string) => {
      // 업로드된 파일이 있으면 정보 출력
      if (uploadedFiles.length > 0) {
        console.log("📤 제출된 파일들:", uploadedFiles);
        antMessage.info(`📎 ${uploadedFiles.length}개 파일과 함께 전송 중...`);
      }

      try {
        setUploadedFiles([]);
        console.log("🚀 메시지 전송 시작...");
        await sendMessage(prompt);
        console.log("📨 메시지 전송 함수 완료");
      } catch (error) {
        console.error("❌ 메시지 전송 실패:", error);
      }
    },
    [sendMessage, uploadedFiles]
  );

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
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <TestSidebar
        channelsProps={{
          channels,
          currentChannelId,
          createChannel,
          switchChannel,
          deleteChannel,
        }}
      />

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
                      {channelMeta?.channelName || "테스트 채팅"}
                    </h1>
                    <p className="text-sm text-gray-500">
                      {messages.length > 0
                        ? `메시지 ${messages.length}개`
                        : "채팅을 시작하세요"}
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
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center pointer-events-none">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white rounded-full p-6 shadow-2xl">
                        <Upload className="w-12 h-12 text-purple-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white mb-2">
                          파일 업로드
                        </p>
                        <p className="text-lg text-gray-200">
                          여기에 파일을 놓으세요
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 채팅 영역 */}
                <div
                  className={`flex-1 h-full ${
                    artifactState.isVisible ? "" : "w-full"
                  } transition-all duration-300 flex flex-col`}
                >
                  <div className="flex-1 overflow-hidden">
                    <div className="flex h-full p-6">
                      <div className="flex-1 overflow-hidden">
                        <div className="flex flex-col h-full">
                          <TestChatView
                            messages={channelMessages[currentChannelId || ""] || messages}
                            isLoading={sseState === "loading"}
                            sseState={sseState}
                            firstAIMessageCompleted={firstAIMessageCompleted}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prompt Box - ChatView와 함께 줄어드는 영역 */}
                  <div className="flex-shrink-0 px-6 pb-6">
                    <TestPromptBox
                      onSubmit={handlePromptSubmit}
                      isStreaming={
                        sseState === "loading" || sseState === "streaming"
                      }
                      isFirstMessage={!hasFirstMessage}
                      uploadedFiles={uploadedFiles}
                      onFileSelect={handleFileSelect}
                      onFileRemove={handleFileRemove}
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

export default TestMain;
