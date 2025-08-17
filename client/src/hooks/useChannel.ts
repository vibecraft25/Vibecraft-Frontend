/**
 * VibeCraft Channel Hook
 * React hook for channel management operations
 */

import { useCallback, useEffect } from "react";
import { useChannelActions, useChannelState } from "@/core/stores/channelStore";
import type { DashboardStatus } from "@/core/types";
import { PROCESS_STATUS_ORDER } from "@/core/types/channel";

interface UseChannelOptions {
  autoLoad?: boolean;
  onChannelSwitch?: (channelId: string) => void;
  onStatusChange?: (status: DashboardStatus) => void;
}

export const useChannel = (options: UseChannelOptions = {}) => {
  const {
    createChannel,
    switchChannel,
    deleteChannel,
    updateChannelStatus,
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

  // Handle status change callback
  useEffect(() => {
    if (
      channelState.currentChannel?.meta.currentStatus &&
      options.onStatusChange
    ) {
      options.onStatusChange(channelState.currentChannel.meta.currentStatus);
    }
  }, [channelState.currentChannel?.meta.currentStatus, options.onStatusChange]);

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

  const updateCurrentChannelStatus = useCallback(
    async (status: DashboardStatus) => {
      if (!channelState.currentChannelId) {
        throw new Error("No active channel to update");
      }

      try {
        await updateChannelStatus(channelState.currentChannelId, status);
      } catch (error) {
        console.error("Failed to update channel status:", error);
        throw error;
      }
    },
    [channelState.currentChannelId, updateChannelStatus]
  );

  const getNextProcessStatus = (current: DashboardStatus): DashboardStatus => {
    const currentIndex = PROCESS_STATUS_ORDER.indexOf(current);
    const nextIndex = currentIndex + 1;

    // 마지막 단계인 경우 그대로 유지
    if (nextIndex >= PROCESS_STATUS_ORDER.length) {
      return current;
    }

    return PROCESS_STATUS_ORDER[nextIndex];
  };

  const updateCurrentChannelNextStep = useCallback(() => {
    if (channelState.currentChannel) {
      const current = channelState.currentChannel.meta.lastStatus;

      const nextProcess = getNextProcessStatus(current);

      if (nextProcess !== current) {
        updateCurrentChannelStatus(nextProcess);
        console.log("📊 다음 프로세스 단계로 진행:", current, "→", nextProcess);
      }
    }
  }, [channelState.currentChannel]);

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

  const getChannelProgress = useCallback(() => {
    const currentChannel = channelState.currentChannel;
    if (!currentChannel) return null;

    const statusOrder: DashboardStatus[] = [
      "TOPIC",
      "DATA",
      "DATA_PROCESS",
      "BUILD",
      "DEPLOY",
    ];

    return {
      last: currentChannel.meta.currentStatus,
      current: currentChannel.meta.currentStatus,
      isCompleted: currentChannel.meta.isCompleted,
    };
  }, [channelState.currentChannel]);

  const getChannelsByStatus = useCallback(
    (status?: DashboardStatus) => {
      if (!status) return channelState.channels;

      return channelState.channels.filter(
        (channel) => channel.meta.currentStatus === status
      );
    },
    [channelState.channels]
  );

  return {
    // State
    ...channelState,

    // Enhanced actions
    createChannel: createNewChannel,
    switchChannel: switchToChannel,
    deleteChannel: deleteChannelWithConfirm,
    updateStatus: updateCurrentChannelStatus,
    updateNextStep: updateCurrentChannelNextStep,

    // Utility functions
    getChannelProgress,
    getChannelsByStatus,

    // Computed values
    hasChannels: channelState.channels.length > 0,
    activeChannelName: channelState.currentChannel?.meta.channelName,
    activeChannelStatus: channelState.currentChannel?.meta.currentStatus,
    isChannelCompleted: channelState.currentChannel?.meta.isCompleted ?? false,
    isChannelLoading: channelState.isChannelLoading, // 채널 전환 중 로딩 상태
    isApiLoading: channelState.isApiLoading, // API 응답 대기 상태

    // Channel statistics
    stats: {
      total: channelState.channels.length,
      completed: channelState.channels.filter((c) => c.meta.isCompleted).length,
      inProgress: channelState.channels.filter((c) => !c.meta.isCompleted)
        .length,
      byStatus: {
        TOPIC: getChannelsByStatus("TOPIC").length,
        DATA: getChannelsByStatus("DATA").length,
        DATA_PROCESS: getChannelsByStatus("DATA_PROCESS").length,
        BUILD: getChannelsByStatus("BUILD").length,
        DEPLOY: getChannelsByStatus("DEPLOY").length,
      },
    },
  };
};
