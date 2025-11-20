import { useState, useCallback } from "react";
import sampleResponseData from "./sampleResponse.json";
// import sampleResponseData from "./test_sr.json";

export interface TestMessage {
  id: string;
  type: "human" | "ai";
  content: string;
  timestamp: string;
  status?: "streaming" | "completed";
  fileName?: string;
  showArtifactButton?: boolean;
  artifactUrl?: string;
  artifactTitle?: string;
  artifactDescription?: string;
  isGeneratingArtifact?: boolean;
}

export const useTestSSE = () => {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  // const [isStreaming, setIsStreaming] = useState(false);
  const [sseState, setSseState] = useState<
    "loading" | "streaming" | "completed" | undefined
  >(); // "loading" | "streaming" | "completed"
  const [firstAIMessageCompleted, setFirstAIMessageCompleted] = useState(false);
  const [sampleIndex, setSampleIndex] = useState(0);

  // SSE 스트리밍 시뮬레이션 - 샘플 응답을 단어 단위로 스트리밍
  const streamSampleResponse = useCallback(
    async (aiMessageId: string): Promise<string> => {
      setSseState("streaming");
      return new Promise((resolve) => {
        const allMessages = sampleResponseData.messages as Array<{
          content: string;
        }>;
        const currentIndex = sampleIndex % allMessages.length;
        const sampleMessages = [allMessages[currentIndex]];

        if (sampleMessages.length === 0) {
          resolve("");
          return;
        }

        const fullContent = sampleMessages[0].content;
        const words = fullContent.split(" ");

        let currentContent = "";
        let wordIndex = 0;

        const streamWord = () => {
          if (wordIndex < words.length) {
            currentContent += (wordIndex > 0 ? " " : "") + words[wordIndex];
            wordIndex++;

            // 콜백을 통해 UI 업데이트
            setMessages((prev) => {
              const existingIndex = prev.findIndex(
                (m) => m.type === "ai" && m.id === aiMessageId
              );

              if (existingIndex >= 0) {
                return prev.map((m, idx) =>
                  idx === existingIndex
                    ? {
                        ...m,
                        content: currentContent,
                        status: "streaming" as const,
                      }
                    : m
                );
              } else {
                return [
                  ...prev,
                  {
                    id: aiMessageId,
                    type: "ai" as const,
                    content: currentContent,
                    timestamp: new Date().toISOString(),
                    status: "streaming" as const,
                  },
                ];
              }
            });

            // 60ms 간격으로 다음 단어 추가 (따다다닥 효과)
            setTimeout(streamWord, 60);
          } else {
            // 스트리밍 완료 - status를 completed로 변경
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.id === aiMessageId
                  ? { ...m, status: "completed" as const }
                  : m
              );
              // 첫 번째 AI 메시지 완료 감지
              if (
                !firstAIMessageCompleted &&
                updated.some((m) => m.type === "ai" && m.status === "completed")
              ) {
                setFirstAIMessageCompleted(true);
              }
              return updated;
            });
            resolve(currentContent);
          }
        };

        streamWord();
      });
    },
    [sampleIndex]
  );

  // 사용자 메시지 추가 및 AI 응답 스트리밍
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      // 사용자 메시지 추가
      const newUserMessage: TestMessage = {
        id: `user-${Date.now()}`,
        type: "human",
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setSseState("loading");

      try {
        // 10~15초 랜덤 timeout
        const randomTimeout = Math.floor(Math.random() * 5000) + 10000;
        await new Promise((resolve) => setTimeout(resolve, randomTimeout));

        // AI 메시지 ID 미리 생성
        const aiMessageId = `ai-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        // SSE 스트리밍 시뮬레이션
        await streamSampleResponse(aiMessageId);
        // 다음 샘플 응답으로 진행
        setSampleIndex((prev) => prev + 1);
      } catch (error) {
        console.error("❌ 스트리밍 에러:", error);
      } finally {
        setSseState("completed");
      }
    },
    [streamSampleResponse]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sseState,
    sendMessage,
    clearMessages,
    firstAIMessageCompleted,
  };
};
