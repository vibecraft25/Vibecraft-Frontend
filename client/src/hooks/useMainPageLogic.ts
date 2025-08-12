import { useState, useCallback, useMemo } from "react";
import { ProcessStatus, PROCESS_STATUS_ORDER } from "@/utils/processStatus";
import { useChatStore } from "@/stores/chatStore";
import { MenuOption } from "@/components/chat/Menu";
import { PromptBoxThreadMessage } from "@/message/prompt";
import { ThreadState } from "@/types/session";

export interface UseMainPageLogicReturn {
  // UI State
  sidebarOpen: boolean;
  isNewChatMode: boolean;
  selectedProcessStatus?: ProcessStatus;

  // Computed State
  maxReachedStatus?: ProcessStatus;

  // Event Handlers
  handleToggleSidebar: () => void;
  handleNewChat: () => void;
  handleFetchProcess: (status: ProcessStatus) => void;
  handleMenuOptionSelect: (selectedOption: MenuOption) => void;

  // Props Objects
  sidebarProps: any;
  promptBoxProps: any;
  chatViewProps: any;
}

export interface UseMainPageLogicConfig {
  channelId?: string;
  threadState: ThreadState;
  processStatus: ProcessStatus;
  messages: any[];
  switchChannel: (channelId: string) => void;
  startNewChat: () => void;
  fetchProcess: (status: ProcessStatus) => void;
  sendMessage: (message: string) => Promise<boolean>;
  addMessage: (
    message: string | string[],
    type: "human" | "ai",
    componentType?: any
  ) => void;
  setNextProcessStatus: () => void;
  onUpdateUploadedFiles: (files: any) => void;
  onMenuOptionSelect?: (selectedOption: MenuOption) => void;
}

export const useMainPageLogic = (
  config: UseMainPageLogicConfig
): UseMainPageLogicReturn => {
  const {
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
    onUpdateUploadedFiles,
  } = config;

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [selectedProcessStatus, setSelectedProcessStatus] =
    useState<ProcessStatus>();

  // Chat store
  const chatItems = useChatStore((state) => state.chatItems);

  // 현재 채널의 최고 도달 단계 계산
  const maxReachedStatus = useMemo((): ProcessStatus | undefined => {
    if (!channelId) return undefined;

    const currentChatItem = chatItems.find(
      (item) => item.lastThreadId === channelId
    );

    if (!currentChatItem) return processStatus;

    const lastProcessIndex = currentChatItem.lastProcess
      ? PROCESS_STATUS_ORDER.indexOf(currentChatItem.lastProcess)
      : -1;
    const currentProcessIndex = PROCESS_STATUS_ORDER.indexOf(processStatus);

    return lastProcessIndex > currentProcessIndex
      ? currentChatItem.lastProcess!
      : processStatus;
  }, [channelId, chatItems, processStatus]);

  // Event Handlers
  const handleToggleSidebar = useCallback(
    () => setSidebarOpen((prev) => !prev),
    []
  );

  const handleNewChat = useCallback(() => {
    console.log("🆕 새 채팅 시작 버튼 클릭");
    setIsNewChatMode(true);
    startNewChat();
  }, [startNewChat]);

  const handleFetchProcess = useCallback(
    (status: ProcessStatus) => {
      setSelectedProcessStatus(status);
      fetchProcess(status);
    },
    [fetchProcess]
  );

  const handleSendMessage = useCallback(
    (message: string) => {
      if (isNewChatMode) {
        console.log("📝 첫 메시지 전송으로 새 채팅 모드 해제");
        setIsNewChatMode(false);
      }
      return sendMessage(message);
    },
    [isNewChatMode, sendMessage]
  );

  const handleMenuOptionSelect = useCallback(
    (selectedOption: MenuOption) => {
      console.log("📋 메뉴 옵션 선택:", selectedOption);

      // TODO : 이전 선택값 저장 로직 추가

      if (processStatus === "TOPIC") {
        switch (selectedOption.value) {
          case "1":
            addMessage(selectedOption.label, "human");
            setNextProcessStatus();
            addMessage("", "ai", "DATA_UPLOAD");
            break;
          case "2":
            break;
          case "3":
            break;
          default:
            break;
        }
      } else if (processStatus === "DATA_PROCESS") {
        switch (selectedOption.value) {
          case "1":
            break;
          case "2":
            break;
          case "3":
            handleSendMessage(selectedOption.label);
            break;
          default:
            break;
        }
      }
    },
    [processStatus, addMessage, setNextProcessStatus, handleSendMessage]
  );

  // Memoized Props
  const sidebarProps = useMemo(
    () => ({
      isOpen: sidebarOpen,
      onToggle: handleToggleSidebar,
      chattingProps: {
        channelId: channelId,
        switchChannel: switchChannel,
        onNewChat: handleNewChat,
      },
    }),
    [sidebarOpen, channelId, handleToggleSidebar, switchChannel, handleNewChat]
  );

  const promptBoxProps = useMemo(
    () => ({
      inputType: "TEXT" as const,
      processStatus,
      placeholder: PromptBoxThreadMessage[threadState],
      disabled:
        threadState === "CONNECTING" ||
        threadState === "SENDING" ||
        threadState === "RECEIVING" ||
        threadState === "RECONNECTING",
      sendMessage: handleSendMessage,
    }),
    [processStatus, threadState, handleSendMessage]
  );

  const chatViewProps = useMemo(
    () => ({
      messages,
      isLoading: threadState === "SENDING" || threadState === "RECEIVING",
      channelId,
      threadState,
      onMenuOptionSelect: handleMenuOptionSelect,
      onUpdateUploadedFiles,
      className: "h-full",
      maxHeight: "100%",
    }),
    [
      messages,
      threadState,
      channelId,
      handleMenuOptionSelect,
      onUpdateUploadedFiles,
    ]
  );

  return {
    // UI State
    sidebarOpen,
    isNewChatMode,
    selectedProcessStatus,

    // Computed State
    maxReachedStatus,

    // Event Handlers
    handleToggleSidebar,
    handleNewChat,
    handleFetchProcess,
    handleMenuOptionSelect,

    // Props Objects
    sidebarProps,
    promptBoxProps,
    chatViewProps,
  };
};
