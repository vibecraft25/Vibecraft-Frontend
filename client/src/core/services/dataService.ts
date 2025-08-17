/**
 * VibeCraft Data Service
 * Handles data persistence and channel-specific data operations
 */

import { StorageService } from "./storageService";
import type { ChannelMeta, ChannelHistory, ChatMessage } from "../types";

export interface ChannelData {
  meta: ChannelMeta;
  history: ChannelHistory | null;
}

export class DataService {
  /**
   * Save complete channel data (meta + history)
   */
  static async saveChannelData(
    channelId: string,
    meta: ChannelMeta,
    messages: ChatMessage[]
  ): Promise<void> {
    try {
      // Save metadata
      StorageService.saveChannelMeta(meta);

      // Save history if there are messages
      if (messages.length > 0) {
        const history: ChannelHistory = {
          channelId,
          messages,
          lastUpdated: new Date().toISOString(),
        };
        await StorageService.saveChannelHistory(history);
      }
    } catch (error) {
      console.error("Failed to save channel data:", error);
      throw error;
    }
  }

  /**
   * Load complete channel data (meta + history)
   */
  static async loadChannelData(channelId: string): Promise<ChannelData> {
    try {
      const meta = StorageService.loadChannelMeta(channelId);
      const history = await StorageService.loadChannelHistory(channelId);

      if (!meta) {
        throw new Error(`Channel metadata not found: ${channelId}`);
      }

      return { meta, history };
    } catch (error) {
      console.error("Failed to load channel data:", error);
      throw error;
    }
  }

  /**
   * Update channel metadata with activity tracking
   */
  static async updateChannelActivity(
    channelId: string,
    updates: Partial<ChannelMeta>
  ): Promise<void> {
    try {
      const existingMeta = StorageService.loadChannelMeta(channelId);
      if (!existingMeta) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      const updatedMeta: ChannelMeta = {
        ...existingMeta,
        ...updates,
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };

      StorageService.saveChannelMeta(updatedMeta);
    } catch (error) {
      console.error("Failed to update channel activity:", error);
      throw error;
    }
  }

  /**
   * Delete complete channel data
   */
  static async deleteChannelData(channelId: string): Promise<void> {
    try {
      StorageService.deleteChannelMeta(channelId);
      await StorageService.deleteChannelHistory(channelId);
    } catch (error) {
      console.error("Failed to delete channel data:", error);
      throw error;
    }
  }

  /**
   * Get all available channels with basic info
   */
  static getAllChannels(): Array<{
    channelId: string;
    threadId?: string;
    name: string;
    description: string;
    status: string;
    lastActivity?: string;
    isCompleted: boolean;
  }> {
    try {
      const channelIds = StorageService.getAllChannelIds();
      const summaries = [];

      for (const channelId of channelIds) {
        const meta = StorageService.loadChannelMeta(channelId);
        if (meta) {
          summaries.push({
            channelId: meta.channelId,
            threadId: meta.threadId,
            name: meta.channelName,
            description: meta.description,
            status: meta.currentStatus,
            lastActivity: meta.lastActivity,
            isCompleted: meta.isCompleted,
          });
        }
      }

      // Sort by last activity (most recent first)
      return summaries.sort((a, b) => {
        const timeA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const timeB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error("Failed to get channel summaries:", error);
      return [];
    }
  }

  /**
   * Export channel data for backup
   */
  static async exportChannelData(channelId: string): Promise<{
    meta: ChannelMeta;
    history: ChannelHistory | null;
    exportedAt: string;
  }> {
    try {
      const channelData = await this.loadChannelData(channelId);
      return {
        ...channelData,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to export channel data:", error);
      throw error;
    }
  }

  /**
   * Import channel data from backup
   */
  static async importChannelData(data: {
    meta: ChannelMeta;
    history: ChannelHistory | null;
  }): Promise<void> {
    try {
      // Save metadata
      StorageService.saveChannelMeta(data.meta);

      // Save history if available
      if (data.history) {
        await StorageService.saveChannelHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to import channel data:", error);
      throw error;
    }
  }

  /**
   * Clean up old inactive channels
   */
  static async cleanupInactiveChannels(
    daysInactive: number = 30
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
      const cutoffTimestamp = cutoffDate.toISOString();

      const channelIds = StorageService.getAllChannelIds();
      let deletedCount = 0;

      for (const channelId of channelIds) {
        const meta = StorageService.loadChannelMeta(channelId);

        if (
          meta &&
          meta.lastActivity &&
          meta.lastActivity < cutoffTimestamp &&
          !meta.isCompleted
        ) {
          // Keep completed channels

          await this.deleteChannelData(channelId);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Failed to cleanup inactive channels:", error);
      return 0;
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getDataUsageStats(): Promise<{
    totalChannels: number;
    activeChannels: number;
    completedChannels: number;
    totalMessages: number;
    storageUsage: {
      localStorage: number;
      indexedDB: number;
      total: number;
    };
  }> {
    try {
      const channelIds = StorageService.getAllChannelIds();
      let activeChannels = 0;
      let completedChannels = 0;
      let totalMessages = 0;

      for (const channelId of channelIds) {
        const meta = StorageService.loadChannelMeta(channelId);
        if (meta) {
          if (meta.isCompleted) {
            completedChannels++;
          } else {
            activeChannels++;
          }

          const history = await StorageService.loadChannelHistory(channelId);
          if (history) {
            totalMessages += history.messages.length;
          }
        }
      }

      const storageUsage = await StorageService.getStorageStats();

      return {
        totalChannels: channelIds.length,
        activeChannels,
        completedChannels,
        totalMessages,
        storageUsage,
      };
    } catch (error) {
      console.error("Failed to get data usage stats:", error);
      return {
        totalChannels: 0,
        activeChannels: 0,
        completedChannels: 0,
        totalMessages: 0,
        storageUsage: { localStorage: 0, indexedDB: 0, total: 0 },
      };
    }
  }
}
