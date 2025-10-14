/**
 * VibeCraft Channel Store (Refactored)
 * Lightweight channel metadata management
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ChannelMeta, Channel } from "../types";
import { DataService } from "../services/dataService";
import { useLoadingStore } from "./loadingStore";
import { useChatStore } from "./chatStore";

interface ChannelState {
  // Current state
  channels: Channel[];
  currentChannelId: string | null;

  // Actions
  createChannel: (name: string, description: string) => Promise<string>;
  switchChannel: (channelId: string) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  deleteAllChannels: () => Promise<void>;
  updateChannelMeta: (
    channelId: string,
    updates: Partial<ChannelMeta>
  ) => Promise<void>;

  // Data management
  loadChannels: () => Promise<void>;
  saveCurrentChannelData: () => Promise<void>;
  restoreChannelData: (channelId: string) => Promise<void>;

  // Utility
  getChannelById: (channelId: string) => Channel | undefined;
  getCurrentChannel: () => Channel | undefined;
  markChannelActive: (channelId: string) => void;
}

export const useChannelStore = create<ChannelState>()(
  devtools(
    (set, get) => ({
      // Initial state
      channels: [],
      currentChannelId: null,

      // Create new channel
      createChannel: async (name, description) => {
        const loadingStore = useLoadingStore.getState();
        loadingStore.setLoading("channel", true);

        try {
          const channelId = crypto.randomUUID();
          const now = new Date().toISOString();

          const channelMeta: ChannelMeta = {
            channelId,
            channelName: name,
            description,
            threadStatus: "IDLE",
            createdAt: now,
            updatedAt: now,
            isCompleted: false,
          };

          const channel: Channel = {
            meta: channelMeta,
            isActive: false,
          };

          // Save using DataService
          await DataService.saveChannelData(channelId, channelMeta, []);

          // Update state
          set((state) => ({
            channels: [channel, ...state.channels],
          }));

          return channelId;
        } catch (error) {
          console.error("Failed to create channel:", error);
          throw error;
        } finally {
          loadingStore.setLoading("channel", false);
        }
      },

      // Switch to different channel
      switchChannel: async (channelId) => {
        const { currentChannelId, saveCurrentChannelData, restoreChannelData } =
          get();
        const loadingStore = useLoadingStore.getState();

        if (currentChannelId === channelId) return;

        loadingStore.setLoading("channel", true);

        try {
          // Save current channel data if exists
          if (currentChannelId) {
            await saveCurrentChannelData();
          }

          // Restore new channel data
          await restoreChannelData(channelId);

          // Update active channel
          set((state) => ({
            channels: state.channels.map((channel) => ({
              ...channel,
              isActive: channel.meta.channelId === channelId,
            })),
            currentChannelId: channelId,
          }));
        } catch (error) {
          console.error("Failed to switch channel:", error);
          throw error;
        } finally {
          loadingStore.setLoading("channel", false);
        }
      },

      // Delete channel
      deleteChannel: async (channelId) => {
        const loadingStore = useLoadingStore.getState();
        loadingStore.setLoading("data", true);

        try {
          // Remove using DataService
          await DataService.deleteChannelData(channelId);

          // Update state
          set((state) => {
            const currentIndex = state.channels.findIndex(
              (channel) => channel.meta.channelId === channelId
            );

            const newChannels = state.channels.filter(
              (channel) => channel.meta.channelId !== channelId
            );

            let newCurrentChannelId = state.currentChannelId;

            // If we deleted the current channel, select the next one below
            if (state.currentChannelId === channelId) {
              if (newChannels.length > 0) {
                // Select the channel at the same index, or the last one if we deleted the last channel
                const nextIndex = Math.min(
                  currentIndex,
                  newChannels.length - 1
                );
                newCurrentChannelId =
                  newChannels[nextIndex]?.meta.channelId || null;
              } else {
                newCurrentChannelId = null;
              }
            }

            return {
              channels: newChannels,
              currentChannelId: newCurrentChannelId,
            };
          });

          // If we deleted the current channel, switch to the selected one
          const { currentChannelId, channels } = get();
          if (currentChannelId && channels.length > 0) {
            await get().switchChannel(currentChannelId);
          } else {
            // Clear chat if no channels left
            useChatStore.getState().clearMessages();
          }
        } catch (error) {
          console.error("Failed to delete channel:", error);
          throw error;
        } finally {
          loadingStore.setLoading("data", false);
        }
      },

      // Delete all channels
      deleteAllChannels: async () => {
        const loadingStore = useLoadingStore.getState();
        loadingStore.setLoading("data", true);

        try {
          const { channels } = get();

          // Delete all channels using DataService
          for (const channel of channels) {
            await DataService.deleteChannelData(channel.meta.channelId);
          }

          // Clear state
          set({
            channels: [],
            currentChannelId: null,
          });

          // Clear chat
          useChatStore.getState().clearMessages();
        } catch (error) {
          console.error("Failed to delete all channels:", error);
          throw error;
        } finally {
          loadingStore.setLoading("data", false);
        }
      },

      // Update channel metadata
      updateChannelMeta: async (channelId, updates) => {
        try {
          // Update using DataService
          await DataService.updateChannelActivity(channelId, updates);

          // Update local state
          set((state) => ({
            channels: state.channels.map((channel) =>
              channel.meta.channelId === channelId
                ? {
                    ...channel,
                    meta: {
                      ...channel.meta,
                      ...updates,
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : channel
            ),
          }));
        } catch (error) {
          console.error("Failed to update channel meta:", error);
          throw error;
        }
      },

      // Load all channels from storage
      loadChannels: async () => {
        const loadingStore = useLoadingStore.getState();
        loadingStore.setLoading("data", true);

        try {
          // Get channel summaries from DataService
          const storedChannels = DataService.getAllChannels();
          const channels: Channel[] = storedChannels.map((storedChannel) => ({
            meta: {
              channelId: storedChannel.channelId,
              channelName: storedChannel.name,
              description: storedChannel.description,
              threadStatus: "IDLE",
              threadId: storedChannel.threadId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastActivity: storedChannel.lastActivity,
              isCompleted: storedChannel.isCompleted,
            },
            isActive: false,
          }));

          set({ channels });

          // await get().switchChannel(channels[0].meta.channelId);
        } catch (error) {
          console.error("Failed to load channels:", error);
          throw error;
        } finally {
          loadingStore.setLoading("data", false);
        }
      },

      // Save current channel data
      saveCurrentChannelData: async () => {
        const { currentChannelId } = get();
        if (!currentChannelId) return;

        const loadingStore = useLoadingStore.getState();
        loadingStore.setLoading("data", true);

        try {
          const messages = useChatStore.getState().messages;
          const currentChannel = get().getCurrentChannel();

          if (currentChannel) {
            // Save using DataService
            await DataService.saveChannelData(
              currentChannelId,
              currentChannel.meta,
              messages
            );
          }
        } catch (error) {
          console.error("Failed to save current channel data:", error);
          throw error;
        } finally {
          loadingStore.setLoading("data", false);
        }
      },

      // Restore channel data
      restoreChannelData: async (channelId) => {
        const loadingStore = useLoadingStore.getState();
        loadingStore.setLoading("data", true);

        try {
          const channelData = await DataService.loadChannelData(channelId);
          const chatStore = useChatStore.getState();

          if (channelData.history && channelData.history.messages.length > 0) {
            // Restore messages
            chatStore.clearMessages();
            channelData.history.messages.forEach((message) => {
              chatStore.addHistoryMessage(message);
            });
          } else {
            // Clear chat for new/empty channel
            chatStore.clearMessages();
          }
        } catch (error) {
          console.error("Failed to restore channel data:", error);
          // Clear chat on error
          useChatStore.getState().clearMessages();
          throw error;
        } finally {
          loadingStore.setLoading("data", false);
        }
      },

      // Get channel by ID
      getChannelById: (channelId) => {
        return get().channels.find(
          (channel) => channel.meta.channelId === channelId
        );
      },

      // Get current active channel
      getCurrentChannel: () => {
        const { currentChannelId, channels } = get();
        return currentChannelId
          ? channels.find(
              (channel) => channel.meta.channelId === currentChannelId
            )
          : undefined;
      },

      // Mark channel as active
      markChannelActive: (channelId) => {
        set((state) => ({
          channels: state.channels.map((channel) => ({
            ...channel,
            isActive: channel.meta.channelId === channelId,
          })),
        }));
      },
    }),
    {
      name: "vibecraft-channel-store",
    }
  )
);

// Helper hooks
export const useChannelActions = () => {
  const store = useChannelStore();
  return {
    createChannel: store.createChannel,
    switchChannel: store.switchChannel,
    deleteChannel: store.deleteChannel,
    deleteAllChannels: store.deleteAllChannels,
    updateChannelMeta: store.updateChannelMeta,
    loadChannels: store.loadChannels,
  };
};

export const useChannelState = () => {
  const store = useChannelStore();
  const loadingStore = useLoadingStore();

  return {
    channels: store.channels,
    currentChannelId: store.currentChannelId,
    currentChannel: store.getCurrentChannel(),
    isChannelLoading: loadingStore.isChannelLoading,
    isApiLoading: loadingStore.isApiLoading,
  };
};
