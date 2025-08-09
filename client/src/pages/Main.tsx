import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "antd";
import { Database } from "lucide-react";

import { useSSE } from "../hooks/useSSE";
import { useChatStore } from "@/stores/chatStore";

import Intro from "../components/Intro";
import PromptBox from "../components/PromptBox";
import ChatView from "../components/chat/ChatView";
import Layout from "../components/Layout";
import { PromptBoxThreadMessage } from "@/message/prompt";
import { ProcessStatus } from "@/types/session";
import { PROCESS_STATUS_ORDER } from "@/utils/processStatus";
import { MenuOption } from "@/components/chat/Menu";

const Main = () => {
  const [currentThreadId, setCurrentThreadId] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [selectedProcessStatus, setSelectedProcessStatus] =
    useState<ProcessStatus>();

  // 초기화 추적을 위한 ref
  const initializedRef = useRef(false);

  // Zustand store에서 chatItems 가져오기 - selector 패턴으로 안정적 참조
  const chatItems = useChatStore((state) => state.chatItems);

  // chatItems 로드 상태 디버깅
  useEffect(() => {
    console.log("📋 Main.tsx chatItems 상태:", {
      length: chatItems.length,
      items: chatItems.map((item) => ({
        id: item.rootThreadId,
        submit: item.submit,
      })),
    });
  }, [chatItems]);

  const {
    threadState,
    processStatus,
    inputType,
    threadId,
    messages,
    addMessage,
    setNextProcessStatus,
    sendMessage,
    sendOptionMessage,
    startNewChat,
    fetchProcess,
  } = useSSE({
    serverUrl: "http://localhost:22041",
    threadId: currentThreadId,
    autoConnect: false,
    autoRestore: !isNewChatMode, // 새 채팅 모드가 아닐 때만 자동 복구
    maxRetries: 5,
    retryInterval: 3000,
  });

  // 현재 채널의 최고 도달 단계 계산 - useMemo로 최적화
  const maxReachedStatus = useMemo((): ProcessStatus | undefined => {
    if (!threadId) return undefined;

    const currentChatItem = chatItems.find(
      (item) => item.lastThreadId === threadId
    );

    if (!currentChatItem) return processStatus;

    // lastProcess와 processStatus 중 더 높은 단계 반환
    const lastProcessIndex = currentChatItem.lastProcess
      ? PROCESS_STATUS_ORDER.indexOf(currentChatItem.lastProcess)
      : -1;
    const currentProcessIndex = PROCESS_STATUS_ORDER.indexOf(processStatus);

    return lastProcessIndex > currentProcessIndex
      ? currentChatItem.lastProcess!
      : processStatus;
  }, [threadId, chatItems, processStatus]);

  // fetchProcess를 래핑하여 selectedProcessStatus 관리 - useCallback으로 최적화
  const handleFetchProcess = useCallback(
    (status: ProcessStatus) => {
      setSelectedProcessStatus(status);
      fetchProcess(status);
    },
    [fetchProcess]
  );

  const handleNewChat = useCallback(() => {
    console.log(
      "🆕 새 채팅 시작 버튼 클릭 - 현재 currentThreadId:",
      currentThreadId,
      "threadId:",
      threadId
    );
    setIsNewChatMode(true); // 새 채팅 모드 활성화
    setCurrentThreadId(undefined); // 명시적으로 currentThreadId 초기화
    setIsInitialLoad(false); // 새 채팅 시작은 사용자 액션임을 명시
    startNewChat();
  }, [currentThreadId, threadId, startNewChat]);

  // 안정적인 콜백 함수들
  const handleToggleSidebar = useCallback(
    () => setSidebarOpen((prev) => !prev),
    []
  );
  const handleSetThreadId = useCallback((newThreadId: string) => {
    console.log("📱 사이드바에서 세션 선택:", newThreadId);
    setIsNewChatMode(false); // 세션 선택 시 새 채팅 모드 해제
    setCurrentThreadId(newThreadId);
  }, []);

  // 사이드바 Props를 메모이제이션하여 불필요한 리렌더링 방지
  const sidebarProps = useMemo(
    () => ({
      isOpen: sidebarOpen,
      onToggle: handleToggleSidebar,
      chattingProps: {
        threadId: threadId,
        setThreadId: handleSetThreadId,
        onNewChat: handleNewChat,
      },
    }),
    [
      sidebarOpen,
      threadId,
      handleToggleSidebar,
      handleSetThreadId,
      handleNewChat,
    ]
  );

  // 안정적인 sendMessage 함수
  const handleSendMessage = useCallback(
    (message: string) => {
      // 첫 메시지 전송 시 새 채팅 모드 해제
      if (isNewChatMode) {
        console.log("📝 첫 메시지 전송으로 새 채팅 모드 해제");
        setIsNewChatMode(false);
      }
      return sendMessage(message);
    },
    [isNewChatMode, sendMessage]
  );

  // 메뉴 옵션 선택 핸들러
  const handleMenuOptionSelect = useCallback(
    (selectedOption: MenuOption) => {
      console.log("📋 메뉴 옵션 선택:", selectedOption);

      // 주제 선정 워크플로우
      if (processStatus === "TOPIC") {
        debugger;
        switch (selectedOption.value) {
          // 데이터 설정 - 자동
          case "1":
            addMessage(selectedOption.label, "human");
            setNextProcessStatus();
            addMessage("데이터 수집단계로 이동합니다.", "ai");
            addMessage("", "ai", "DATA_UPLOAD");
            break;

          // return sendOptionMessage(option);
          // 데이터 설정 - 수동
          case "2":
            addMessage("새 채팅을 시작합니다.", "human");
            break;
          // 주제 재설정
          case "3":
            1;
            addMessage("새 채팅을 시작합니다.", "human");
            break;
          default:
            break;
        }
      }
      return;
    },
    [processStatus]
  );

  // PromptBox Props를 메모이제이션
  const promptBoxProps = useMemo(
    () => ({
      inputType,
      processStatus,
      placeholder: PromptBoxThreadMessage[threadState],
      disabled:
        threadState === "CONNECTING" ||
        threadState === "SENDING" ||
        threadState === "RECEIVING" ||
        threadState === "RECONNECTING",
      sendMessage: handleSendMessage,
    }),
    [inputType, processStatus, threadState, handleSendMessage]
  );

  // ChatView Props를 메모이제이션
  const chatViewProps = useMemo(
    () => ({
      messages,
      isLoading: threadState === "SENDING" || threadState === "RECEIVING",
      threadId,
      threadState,
      processStatus,
      selectedStatus: selectedProcessStatus,
      maxReachedStatus,
      fetchProcess: handleFetchProcess,
      onMenuOptionSelect: handleMenuOptionSelect,
      className: "h-full",
      maxHeight: "100%",
    }),
    [
      messages,
      threadState,
      threadId,
      processStatus,
      selectedProcessStatus,
      maxReachedStatus,
      handleFetchProcess,
      handleMenuOptionSelect,
    ]
  );

  // 초기 로드 시에만 useSSE에서 설정된 threadId를 currentThreadId에 동기화
  useEffect(() => {
    if (!initializedRef.current && isInitialLoad) {
      console.log("🔄 초기 로드 처리:", { threadId, isNewChatMode });
      if (threadId && !isNewChatMode) {
        console.log("🔄 초기 로드 시 threadId 동기화:", threadId);
        setCurrentThreadId(threadId);
      }
      setIsInitialLoad(false); // threadId 유무와 관계없이 초기 로드 완료 처리
      initializedRef.current = true; // 초기화 완료 마킹
    }
  }, [isInitialLoad, threadId, isNewChatMode]);

  // threadId가 빈값이 되면 currentThreadId도 초기화 (새 채팅 시작 시에만)
  useEffect(() => {
    // 새 채팅 모드에서만 currentThreadId 초기화 (세션 선택 시에는 실행 안함)
    // 초기화가 완료된 후에만 실행
    if (
      initializedRef.current &&
      threadId === "" &&
      currentThreadId !== undefined &&
      isNewChatMode
    ) {
      console.log("🔄 새 채팅 시작으로 currentThreadId 초기화");
      setCurrentThreadId(undefined);
    }
  }, [threadId, isNewChatMode]); // currentThreadId 제거하여 무한 루프 방지

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
                  {(() => {
                    if (!threadId) {
                      return "새로운 채팅";
                    }

                    // 현재 세션의 ChatItem 찾기
                    const currentChatItem = chatItems.find(
                      (item) => item.lastThreadId === threadId
                    );

                    if (currentChatItem) {
                      return currentChatItem.submit;
                    }
                    return "새로운 채팅";
                  })()}
                </h1>
                <p className="text-sm text-gray-500">
                  {threadId
                    ? `채팅 세션: ${threadId.slice(0, 8)}...`
                    : "채팅에 연결되어 있지 않습니다."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex relative min-h-0">
          <div className="w-full h-full border-r border-gray-200">
            {threadState === "FIRST_VISIT" ? (
              <div className="w-full overflow-hidden h-screen">
                <Intro />
              </div>
            ) : (
              <div className="flex h-full p-6">
                <div className="flex-1 overflow-hidden">
                  {threadState === "ERROR" ? (
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
                  ) : threadState === "CONNECTING" ? (
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
                    <ChatView {...chatViewProps} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fixed Prompt Box - 메인 컨텐츠 영역 내부에 absolute 배치 */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 z-50">
            <PromptBox {...promptBoxProps} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Main;
