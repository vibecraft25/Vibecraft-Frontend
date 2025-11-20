import React, { useState, useCallback, useRef, useEffect } from "react";
import { Input, Button } from "antd";
import { Send, Upload, X, FileText } from "lucide-react";

interface TestPromptBoxProps {
  onSubmit: (prompt: string) => Promise<void>;
  isStreaming?: boolean;
  isFirstMessage?: boolean;
  uploadedFiles?: File[];
  onFileSelect?: (files: FileList) => void;
  onFileRemove?: (index: number) => void;
}

const TestPromptBox = ({
  onSubmit,
  isStreaming = false,
  isFirstMessage = true,
  uploadedFiles = [],
  onFileSelect,
  onFileRemove,
}: TestPromptBoxProps) => {
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubmitTimeRef = useRef<number>(0);

  const isInputDisabled = isSubmitting || isStreaming;

  const handleSubmit = useCallback(async () => {
    const message = inputText.trim();
    if (!message || isInputDisabled) return;

    const now = Date.now();
    const timeDiff = now - lastSubmitTimeRef.current;

    // 300ms 디바운싱
    if (timeDiff < 300) return;

    setInputText("");
    setIsSubmitting(true);
    lastSubmitTimeRef.current = now;

    try {
      await onSubmit(message);
    } catch (error) {
      console.error("❌ 전송 실패:", error);
      setInputText(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [inputText, isInputDisabled, onSubmit]);

  const handlePressEnter = useCallback(
    (e: React.KeyboardEvent) => {
      if (!e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();

        if (submitTimeoutRef.current) {
          clearTimeout(submitTimeoutRef.current);
        }

        submitTimeoutRef.current = setTimeout(() => {
          handleSubmit();
        }, 50);
      }
    },
    [handleSubmit]
  );

  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }

      submitTimeoutRef.current = setTimeout(() => {
        handleSubmit();
      }, 50);
    },
    [handleSubmit]
  );

  // 파일 드래그 진입
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  // 파일 드래그 중
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 파일 드래그 떠나감
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  // 파일 드롭
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0 && onFileSelect) {
        onFileSelect(droppedFiles);
      }
    },
    [onFileSelect]
  );

  // 파일 입력 핸들러
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && onFileSelect) {
        onFileSelect(e.target.files);
      }
    },
    [onFileSelect]
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
    if (isInputDisabled) return "";
    return isFirstMessage
      ? "새로운 채팅을 시작하세요..."
      : "메시지를 입력하세요...";
  };

  return (
    <div className="w-full relative">
      {/* 파일 입력 (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept=".csv,.xlsx,.json,.txt,.pdf,.py,.js,.ts,.jsx,.tsx"
      />

      {/* 파일 목록 표시 - Float 스타일 (헤더 고정, 파일 목록 스크롤) */}
      {uploadedFiles.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-blue-50 border border-blue-200 rounded-xl shadow-lg z-10 overflow-hidden">
          {/* 헤더 - 고정 */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 sticky top-0 z-20">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {uploadedFiles.length}개 파일
            </span>
          </div>

          {/* 파일 목록 - 스크롤 가능 */}
          <div className="space-y-1.5 p-3 max-h-48 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded-lg p-2 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {file.name}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {(file.size / 1024).toFixed(1)}K
                  </span>
                </div>
                <button
                  onClick={() => onFileRemove?.(index)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 ml-1 flex-shrink-0"
                  title="제거"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 입력창 */}
      <div
        className={`bg-white/90 backdrop-blur-md rounded-2xl prompt-box-shadow p-4 transition-all ${
          isDragOver
            ? "border-2 border-blue-500 bg-blue-50/50 shadow-lg"
            : "border border-transparent"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 rounded-2xl bg-blue-50/80 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-blue-600 font-medium">파일을 여기 놓으세요</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div
              className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => fileInputRef.current?.click()}
              title="파일 선택"
            >
              <Upload className="w-5 h-5 text-white" />
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

      {/* 팁 텍스트 */}
      {uploadedFiles.length === 0 && (
        <p className="mt-2 text-xs text-gray-500">
          💡 파일을 드래그&드롭하거나 아이콘을 클릭하여 업로드할 수 있습니다.
        </p>
      )}
    </div>
  );
};

export default TestPromptBox;
