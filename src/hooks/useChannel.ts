/**
 * VibeCraft Channel Hook
 * React hook for channel management operations
 */

import { useCallback, useEffect } from "react";
import { useChannelActions, useChannelState } from "@/core/stores/channelStore";

interface UseChannelOptions {
  autoLoad?: boolean;
  onChannelSwitch?: (channelId: string) => void;
  testMode?: boolean; // 테스트 모드
}

export const useChannel = (options: UseChannelOptions = {}) => {
  const {
    createChannel,
    switchChannel,
    deleteChannel,
    loadChannels,
  } = useChannelActions();

  const channelState = useChannelState();

  // Auto-load channels on mount
  useEffect(() => {
    if (options.autoLoad !== false) {
      loadChannels();
    }
  }, [options.autoLoad, loadChannels]);

  // Handle channel switch callback
  useEffect(() => {
    if (channelState.currentChannelId && options.onChannelSwitch) {
      options.onChannelSwitch(channelState.currentChannelId);
    }
  }, [channelState.currentChannelId, options.onChannelSwitch]);

  const createNewChannel = useCallback(
    async (name: string, description: string) => {
      try {
        const channelId = await createChannel(name, description);

        // Auto-switch to new channel
        await switchChannel(channelId);

        return channelId;
      } catch (error) {
        console.error("Failed to create channel:", error);
        throw error;
      }
    },
    [createChannel, switchChannel]
  );

  const deleteChannelWithConfirm = useCallback(
    async (channelId: string, skipConfirm = false) => {
      if (!skipConfirm) {
        const channel = channelState.channels.find(
          (c) => c.meta.channelId === channelId
        );
        const confirmed = window.confirm(
          `Are you sure you want to delete channel "${
            channel?.meta.channelName || "Unknown"
          }"? This action cannot be undone.`
        );

        if (!confirmed) {
          return false;
        }
      }

      try {
        await deleteChannel(channelId);
        return true;
      } catch (error) {
        console.error("Failed to delete channel:", error);
        throw error;
      }
    },
    [deleteChannel, channelState.channels]
  );


  const switchToChannel = useCallback(
    async (channelId: string) => {
      try {
        await switchChannel(channelId);
        return true;
      } catch (error) {
        console.error("Failed to switch channel:", error);
        return false;
      }
    },
    [switchChannel]
  );

  return {
    // State
    ...channelState,

    // Enhanced actions
    createChannel: createNewChannel,
    switchChannel: switchToChannel,
    deleteChannel: deleteChannelWithConfirm,

    // Computed values
    hasChannels: channelState.channels.length > 0,
    activeChannelName: channelState.currentChannel?.meta.channelName,
    isChannelCompleted: channelState.currentChannel?.meta.isCompleted ?? false,
    isChannelLoading: channelState.isChannelLoading, // 채널 전환 중 로딩 상태
    isApiLoading: channelState.isApiLoading, // API 응답 대기 상태

    // Channel statistics
    stats: {
      total: channelState.channels.length,
      completed: channelState.channels.filter((c) => c.meta.isCompleted).length,
      inProgress: channelState.channels.filter((c) => !c.meta.isCompleted)
        .length,
    },
  };
};
