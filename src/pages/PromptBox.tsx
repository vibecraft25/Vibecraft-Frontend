import React, { useState, useCallback, useRef, useEffect } from "react";
import { Input, Button, message as antMessage } from "antd";
import { Send, Sparkles } from "lucide-react";

import { ChannelMeta, StreamEndpoint, useChannelStore } from "@/core";
import { API_ENDPOINTS } from "@/utils/apiEndpoints";
import { useFileUpload } from "@/hooks/useFileUpload";

interface PromptBoxProps {
  channelMeta: ChannelMeta;
  sendMessage: (
    message: string,
    props?: {
      endpoint?: StreamEndpoint;
      additionalParams?: Record<string, string>;
    }
  ) => Promise<boolean>;
}

const PromptBox = ({ channelMeta, sendMessage }: PromptBoxProps) => {
  const threadState = channelMeta.threadStatus;

  const disabled =
    threadState === "CONNECTING" ||
    threadState === "SENDING" ||
    threadState === "RECEIVING" ||
    threadState === "RECONNECTING";

  const { updateChannelMeta } = useChannelStore();
  const { files, uploadFiles, clearAllFiles } = useFileUpload();

  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 디바운싱을 위한 ref
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);
  const lastSubmittedMessageRef = useRef<string>("");

  // 이벤트 소스 추적을 위한 ref
  const eventSourceRef = useRef<"keyboard" | "button" | null>(null);

  const isInputDisabled = disabled || isSubmitting;

  // API 호출 파라미터 생성
  const getAdditionParams = useCallback(
    (message: string, process?: string): Record<string, string> => {
      const { currentProcess, threadId, uploadedCode } = channelMeta;
      const targetProcess = process || currentProcess;

      switch (targetProcess) {
        case "TOPIC":
          return { query: message };
        case "RUN":
          // RUN 프로세스: thread_id는 필수, code는 있으면 추가
          const runParams: Record<string, string> = threadId
            ? { thread_id: threadId }
            : {};

          if (uploadedCode) {
            runParams.code = uploadedCode;
          }
          return runParams;
        case "CHAT":
          return threadId ? { thread_id: threadId, query: message } : {};
        default:
          // currentProcess가 없으면 TOPIC으로 시작
          return { query: message };
      }
    },
    [channelMeta.currentProcess, channelMeta.threadId, channelMeta.uploadedCode]
  );

  // 프로세스에 따른 엔드포인트 결정
  const getEndpointByProcess = useCallback(() => {
    const currentProcess = channelMeta.currentProcess;

    // 프로세스가 없으면 TOPIC부터 시작 (최초 접속)
    if (!currentProcess) {
      return API_ENDPOINTS.TOPIC;
    }

    // 프로세스 순서: TOPIC → RUN → CHAT
    switch (currentProcess) {
      case "TOPIC":
        return API_ENDPOINTS.TOPIC;
      case "RUN":
        return API_ENDPOINTS.RUN;
      case "CHAT":
        return API_ENDPOINTS.LOAD_CHAT;
      default:
        return API_ENDPOINTS.TOPIC;
    }
  }, [channelMeta.currentProcess]);

  // 다음 프로세스로 전환
  const moveToNextProcess = useCallback(() => {
    const currentProcess = channelMeta.currentProcess;

    if (!currentProcess || currentProcess === "TOPIC") {
      // TOPIC 완료 → RUN으로 전환
      updateChannelMeta(channelMeta.channelId, {
        currentProcess: "RUN",
      });
    } else if (currentProcess === "RUN") {
      // RUN 완료 → CHAT으로 전환
      updateChannelMeta(channelMeta.channelId, {
        currentProcess: "CHAT",
      });
    }
    // CHAT 상태에서는 계속 CHAT으로 유지
  }, [channelMeta.currentProcess, channelMeta.channelId, updateChannelMeta]);

  // 중복 실행 방지를 위한 내부 함수
  const executeSubmit = useCallback(
    async (message: string, eventSource: "keyboard" | "button") => {
      const now = Date.now();
      const timeDiff = now - lastSubmitTimeRef.current;

      // 중복 실행 방지 조건들
      if (
        isSubmitting ||
        disabled ||
        !message ||
        timeDiff < 300 || // 300ms 디바운싱
        (lastSubmittedMessageRef.current === message && timeDiff < 2000) // 같은 메시지 2초 내 중복 방지
      ) {
        console.log(`🚫 중복 실행 차단 (${eventSource}):`, {
          isSubmitting,
          disabled,
          message: !!message,
          timeDiff,
          lastMessage: lastSubmittedMessageRef.current,
        });
        return;
      }

      // 실행 플래그 설정
      setIsSubmitting(true);
      lastSubmitTimeRef.current = now;
      lastSubmittedMessageRef.current = message;

      try {
        console.log(`📤 메시지 전송 시작 (${eventSource}):`, message);

        // 새 채널 생성 시 명시적으로 TOPIC 프로세스 설정
        let effectiveProcess = channelMeta.currentProcess;

        if (channelMeta.channelName === "NewChannel") {
          effectiveProcess = "TOPIC";
          updateChannelMeta(channelMeta.channelId, {
            channelName: channelMeta.channelId,
            description: message,
            currentProcess: "TOPIC", // 최초 접속 시 TOPIC으로 시작
          });
        }

        let uploadedCode = null;
        // RUN 프로세스에서 파일 업로드 처리 (TOPIC 완료 후 DATA_UPLOAD 컴포넌트에서 업로드한 파일)
        if (
          effectiveProcess === "RUN" &&
          channelMeta.threadId &&
          files.length > 0
        ) {
          try {
            console.log("📎 파일 업로드 중...");
            const uploadResult = await uploadFiles(channelMeta.threadId);

            if (uploadResult?.code) {
              const uploadResultCode = uploadResult?.code.split(".")[0];
              uploadedCode = uploadResultCode;

              // 업로드 성공 시 code를 채널 메타데이터에 저장
              await updateChannelMeta(channelMeta.channelId, {
                uploadedCode: uploadResultCode,
              });
              console.log(`✅ 파일 업로드 완료: code=${uploadResult.code}`);
              clearAllFiles();
            }
          } catch (uploadError) {
            console.error("❌ 파일 업로드 실패:", uploadError);
            antMessage.error("파일 업로드에 실패했습니다.");
            setIsSubmitting(false);
            return;
          }
        }

        // effectiveProcess를 사용하여 파라미터와 엔드포인트 결정
        const additionalParams = getAdditionParams(message, effectiveProcess);
        const endpoint = effectiveProcess
          ? effectiveProcess === "TOPIC"
            ? API_ENDPOINTS.TOPIC
            : effectiveProcess === "RUN"
            ? API_ENDPOINTS.RUN
            : API_ENDPOINTS.LOAD_CHAT
          : API_ENDPOINTS.TOPIC;

        console.log(
          `🔄 현재 프로세스: ${effectiveProcess || "TOPIC"}`,
          `\n📋 API 파라미터:`,
          additionalParams
        );

        const success = await sendMessage(message, {
          endpoint: endpoint,
          additionalParams: {
            ...additionalParams,
            ...(uploadedCode && { code: uploadedCode }),
          },
        });

        if (success) {
          console.log(
            `✅ 메시지가 성공적으로 전송되었습니다 (${eventSource}).`
          );

          // 성공 시 다음 프로세스로 전환
          moveToNextProcess();

          // 성공 시 입력창 클리어 (이미 클리어되어 있지만 확실히)
          setInputText("");
        } else {
          antMessage.error("메시지 전송에 실패했습니다. 다시 시도해주세요.");
          setInputText(message);
        }
      } catch (error) {
        console.error(`❌ 메시지 전송 오류 (${eventSource}):`, error);
        antMessage.error("메시지 전송 중 오류가 발생했습니다.");
        setInputText(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      disabled,
      channelMeta.channelName,
      channelMeta.channelId,
      channelMeta.threadId,
      channelMeta.currentProcess,
      files,
      updateChannelMeta,
      uploadFiles,
      clearAllFiles,
      getAdditionParams,
      getEndpointByProcess,
      moveToNextProcess,
      sendMessage,
    ]
  );

  // 디바운스된 제출 핸들러
  const handleSubmit = useCallback(
    (eventSource: "keyboard" | "button" = "button") => {
      const message = inputText.trim();
      if (!message || disabled || isSubmitting) return;

      // 이벤트 소스 설정
      eventSourceRef.current = eventSource;

      // 입력창 즉시 클리어 (UX 개선)
      setInputText("");

      // 기존 타임아웃 취소
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }

      // 디바운싱된 실행
      submitTimeoutRef.current = setTimeout(() => {
        executeSubmit(message, eventSource);
      }, 50); // 50ms 디바운싱으로 이벤트 중복 방지
    },
    [inputText, disabled, isSubmitting, executeSubmit]
  );

  // Enter 키 핸들러 - Ant Design onPressEnter 전용
  const handlePressEnter = useCallback(
    (e: React.KeyboardEvent) => {
      // Shift+Enter는 줄바꿈으로 처리 (Ant Design이 자동 처리)
      if (!e.shiftKey) {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 버블링 방지
        handleSubmit("keyboard");
      }
    },
    [handleSubmit]
  );

  // 버튼 클릭 핸들러 - 마우스 이벤트 전용
  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // 이벤트 버블링 방지
      handleSubmit("button");
    },
    [handleSubmit]
  );

  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const getPlaceholderTextForInput = () => {
    if (disabled || isSubmitting) return "";
    return channelMeta.threadId
      ? "메시지를 입력하세요..."
      : "새로운 채팅을 시작하세요...";
  };

  return (
    <div className="w-full">
      {/* 입력창 */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl prompt-box-shadow p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              {/* {disabled || isSubmitting ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )} */}
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <Input.TextArea
              value={inputText}
              placeholder={getPlaceholderTextForInput()}
              disabled={isInputDisabled}
              autoSize={{ minRows: 1, maxRows: 4 }}
              className="border-0 bg-transparent resize-none text-gray-700 placeholder-gray-400"
              style={{
                boxShadow: "none",
                fontSize: "16px",
                lineHeight: "1.5",
              }}
              onChange={(e) => {
                setInputText(e.target.value);
              }}
              onPressEnter={handlePressEnter}
            />
          </div>
          <div className="flex-shrink-0">
            <Button
              type="primary"
              icon={<Send className="w-4 h-4" />}
              onClick={handleButtonClick}
              loading={isSubmitting}
              disabled={!inputText.trim() || isInputDisabled}
              className="h-10 px-4 bg-gradient-to-r from-purple-500 to-blue-500 border-0 rounded-xl hover:from-purple-600 hover:to-blue-600"
            >
              전송
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptBox;
