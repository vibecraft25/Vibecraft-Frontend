/**
 * VibeCraft Stores
 * Central export for all Zustand stores
 */

import { useChannelActions, useChannelState } from "./channelStore";
import { useChatActions, useChatState } from "./chatStore";
import { useSSEActions, useSSEState } from "./sseStore";
import { useLoadingActions, useLoadingState } from "./loadingStore";

// Store exports
export { useChatStore, useChatActions, useChatState } from "./chatStore";
export {
  useChannelStore,
  useChannelActions,
  useChannelState,
} from "./channelStore";
export { useSSEStore, useSSEActions, useSSEState } from "./sseStore";
export {
  useLoadingStore,
  useLoadingActions,
  useLoadingState,
  useChannelLoading,
  useApiLoading,
  useAnyLoading,
  useProgress,
} from "./loadingStore";
export type { LoadingType } from "./loadingStore";

// Combined hooks for common patterns
export const useVibeCraftStores = () => {
  const chatActions = useChatActions();
  const chatState = useChatState();
  const channelActions = useChannelActions();
  const channelState = useChannelState();
  const sseActions = useSSEActions();
  const sseState = useSSEState();
  const loadingActions = useLoadingActions();
  const loadingState = useLoadingState();

  return {
    chat: { ...chatActions, ...chatState },
    channel: { ...channelActions, ...channelState },
    sse: { ...sseActions, ...sseState },
    loading: { ...loadingActions, ...loadingState },
  };
};

// Initialize stores (call this in your main app)
export const initializeStores = async () => {
  try {
    // Load existing channels from storage
    const { loadChannels } = await import("./channelStore").then((m) =>
      m.useChannelStore.getState()
    );
    await loadChannels();

    console.log("VibeCraft stores initialized successfully");
  } catch (error) {
    console.error("Failed to initialize stores:", error);
  }
};
