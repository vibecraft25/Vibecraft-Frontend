/**
 * VibeCraft Chat Store
 * Manages current chat state with Zustand
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ChatMessage, ComponentType } from "../types";

interface ChatState {
  // Current chat state
  messages: ChatMessage[];
  isStreaming: boolean;
  currentEventType?: string;
  streamingMessageId?: string;

  // Actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean, eventType?: string) => void;
  appendToMessage: (id: string, content: string) => void;
  setCurrentEventType: (eventType?: string) => void;

  // Component-specific actions
  addComponentMessage: (
    componentType: ComponentType,
    componentData: any,
    content?: string
  ) => string;

  // Streaming helpers
  startStreamingMessage: (content?: string) => string;
  finishStreamingMessage: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set, get) => ({
      // Initial state
      messages: [],
      isStreaming: false,
      currentEventType: undefined,
      streamingMessageId: undefined,

      // Add a new message
      addMessage: (messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          messages: [...state.messages, message],
        }));

        return message.id;
      },

      // Update existing message
      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        }));
      },

      // Clear all messages
      clearMessages: () => {
        set({
          messages: [],
          isStreaming: false,
          currentEventType: undefined,
          streamingMessageId: undefined,
        });
      },

      // Set streaming state
      setStreaming: (streaming, eventType) => {
        set({
          isStreaming: streaming,
          currentEventType: eventType,
          streamingMessageId: streaming ? get().streamingMessageId : undefined,
        });
      },

      // Append content to existing message
      appendToMessage: (id, content) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id
              ? { ...msg, content: (msg.content || "") + "\n" + content }
              : msg
          ),
        }));
      },

      // Set current event type
      setCurrentEventType: (eventType) => {
        set({ currentEventType: eventType });
      },

      // Add component message
      addComponentMessage: (componentType, componentData, content) => {
        const message: ChatMessage = {
          id: crypto.randomUUID(),
          type: "component",
          content,
          componentType,
          componentData,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          messages: [...state.messages, message],
        }));

        return message.id;
      },

      // Start streaming message
      startStreamingMessage: (content = "") => {
        // await readStream(response, (event) => onStreamEvent(event, channelId));

        const messageId = crypto.randomUUID();
        const message: ChatMessage = {
          id: messageId,
          type: "ai",
          content,
          timestamp: new Date().toISOString(),
          metadata: {
            isStreaming: true,
            sseEventType: get().currentEventType as any,
          },
        };

        set((state) => ({
          messages: [...state.messages, message],
          streamingMessageId: messageId,
          isStreaming: true,
        }));

        return messageId;
      },

      // Finish streaming message
      finishStreamingMessage: (id) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id && msg.metadata
              ? { ...msg, metadata: { ...msg.metadata, isStreaming: false } }
              : msg
          ),
          streamingMessageId: undefined,
          isStreaming: false,
        }));
      },
    }),
    {
      name: "vibecraft-chat-store",
    }
  )
);

// Helper hooks for common operations
export const useChatActions = () => {
  const store = useChatStore();
  return {
    addMessage: store.addMessage,
    updateMessage: store.updateMessage,
    clearMessages: store.clearMessages,
    addComponentMessage: store.addComponentMessage,
    startStreamingMessage: store.startStreamingMessage,
    finishStreamingMessage: store.finishStreamingMessage,
    appendToMessage: store.appendToMessage,
  };
};

export const useChatState = () => {
  const store = useChatStore();
  return {
    messages: store.messages,
    isStreaming: store.isStreaming,
    currentEventType: store.currentEventType,
    streamingMessageId: store.streamingMessageId,
  };
};
