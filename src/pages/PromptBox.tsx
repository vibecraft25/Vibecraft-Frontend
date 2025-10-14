import React, { useState, useCallback, useRef, useEffect } from "react";
import { Input, Button, message as antMessage } from "antd";
import { Send, Sparkles, X, FileText } from "lucide-react";

import {
  ChannelMeta,
  StreamEndpoint,
  useChannelStore,
} from "@/core";
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

const PromptBox_approve = ({ channelMeta, sendMessage }: PromptBoxProps) => {
  const threadState = channelMeta.threadStatus;

  const disabled =
    threadState === "CONNECTING" ||
    threadState === "SENDING" ||
    threadState === "RECEIVING" ||
    threadState === "RECONNECTING";

  const { updateChannelMeta } = useChannelStore();
  const { files, uploadFiles, removeFile, clearAllFiles } = useFileUpload();

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
    (message: string): Record<string, string> => {
      return { query: message };
    },
    []
  );

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

        // 새 채널 Name, description update
        if (channelMeta.channelName === "NewChannel") {
          updateChannelMeta(channelMeta.channelId, {
            channelName: channelMeta.channelId,
            description: message,
          });
        }

        let additionalParams = getAdditionParams(message);

        // 업로드 파일이 있으면 서버로 전송
        if (channelMeta.threadId && files.length > 0) {
          try {
            const res = await uploadFiles(channelMeta.threadId);
            additionalParams = {
              ...additionalParams,
              code: res.code.split(".")[0],
            };
            // 업로드 성공 후 파일 목록 클리어
            clearAllFiles();
          } catch (uploadError) {
            console.error("파일 업로드 실패:", uploadError);
            antMessage.error("파일 업로드에 실패했습니다.");
            setIsSubmitting(false);
            return;
          }
        }

        const success = await sendMessage(message, {
          additionalParams: additionalParams,
        });

        if (success) {
          console.log(
            `✅ 메시지가 성공적으로 전송되었습니다 (${eventSource}).`
          );
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
      files,
      updateChannelMeta,
      uploadFiles,
      clearAllFiles,
      getAdditionParams,
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
    <div className="w-full space-y-2">
      {/* 파일 목록 표시 */}
      {files.length > 0 && (
        <div className="bg-white/95 backdrop-blur-md rounded-xl border border-blue-200/50 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              첨부 파일 ({files.length})
            </span>
            <button
              onClick={() => clearAllFiles()}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              전체 삭제
            </button>
          </div>
          <div className="space-y-1.5">
            {files.map((file) => (
              <div
                key={file.uid}
                className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2.5 border border-blue-100/50 group hover:border-blue-200 transition-all"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-md p-1.5 flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.uid)}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/50 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            메시지 전송 시 자동으로 업로드됩니다
          </p>
        </div>
      )}

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

export default PromptBox_approve;
