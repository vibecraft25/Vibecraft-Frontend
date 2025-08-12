import { useState, useCallback } from "react";
import { SSEMessage, ComponentType } from "./useSSE";
import { generateId } from "@/stores/chatStore";

export interface UseMessageBufferReturn {
  messageBuffer: SSEMessage[];
  responseBuffer: SSEMessage[];
  addMessage: (
    message: string | string[],
    type: "human" | "ai",
    componentType?: ComponentType
  ) => void;
  addResponseMessage: (
    message: string | string[],
    type: "human" | "ai",
    componentType?: ComponentType
  ) => void;
  setMessageBuffer: React.Dispatch<React.SetStateAction<SSEMessage[]>>;
  setResponseBuffer: React.Dispatch<React.SetStateAction<SSEMessage[]>>;
  clearBuffers: () => void;
  migrateResponseToMessage: (threadId: string) => void;
}

export const useMessageBuffer = (currentThreadId?: string): UseMessageBufferReturn => {
  const [messageBuffer, setMessageBuffer] = useState<SSEMessage[]>([]);
  const [responseBuffer, setResponseBuffer] = useState<SSEMessage[]>([]);

  const addMessage = useCallback(
    (
      message: string | string[],
      type: "human" | "ai",
      componentType?: ComponentType
    ) => {
      console.log("📥 메시지 추가:", message);

      const myMessage: SSEMessage = {
        messageId: generateId(),
        threadId: currentThreadId || "",
        content: message,
        timestamp: new Date(),
        componentType,
        type: type,
      };
      setMessageBuffer((prev) => [...prev, myMessage]);
    },
    [currentThreadId]
  );

  const addResponseMessage = useCallback(
    (
      message: string | string[],
      type: "human" | "ai",
      componentType?: ComponentType
    ) => {
      console.log("📥 응답 메시지 추가:", message);

      const myMessage: SSEMessage = {
        messageId: generateId(),
        threadId: currentThreadId || "",
        content: message,
        timestamp: new Date(),
        componentType,
        type: type,
      };
      setResponseBuffer((prev) => [...prev, myMessage]);
    },
    [currentThreadId]
  );

  const clearBuffers = useCallback(() => {
    setMessageBuffer([]);
    setResponseBuffer([]);
    console.log("🗑️ 메시지 버퍼 초기화");
  }, []);

  const migrateResponseToMessage = useCallback((threadId: string) => {
    if (responseBuffer.length > 0) {
      console.log(
        "📬 응답 버퍼를 메시지 버퍼로 이관 시작:",
        responseBuffer.length,
        "개"
      );

      setMessageBuffer((prev) => [
        ...prev,
        ...responseBuffer.map((msg) => ({
          ...msg,
          threadId: threadId,
        })),
      ]);

      setResponseBuffer([]);
      console.log("✅ 응답 버퍼를 메시지 버퍼로 이관 완료");
    }
  }, [responseBuffer]);

  return {
    messageBuffer,
    responseBuffer,
    addMessage,
    addResponseMessage,
    setMessageBuffer,
    setResponseBuffer,
    clearBuffers,
    migrateResponseToMessage,
  };
};