/**
 * VibeCraft Storage Service
 * Handles dual storage system: localStorage (metadata) + IndexedDB (chat history)
 */

import { get, set, del, clear } from "idb-keyval";
import type { ChannelMeta, ChannelHistory, ChatMessage } from "../types";

export class StorageService {
  private static readonly STOARGE = "vibecraft_channels";

  private static readonly DB_NAME = "vibecraft_db";
  private static readonly STORES = {
    CHANNEL_HISTORY: "channel_history",
    METADATA: "metadata",
  };

  // ===============================
  // Channel Metadata (localStorage)
  // ===============================

  /**
   * Save channel metadata to localStorage
   */
  static saveChannelMeta(channelMeta: ChannelMeta): void {
    try {
      const stored = localStorage.getItem(this.STOARGE) || "{}";
      const channels = JSON.parse(stored);
      channels[channelMeta.channelId] = channelMeta;
      localStorage.setItem(this.STOARGE, JSON.stringify(channels));
    } catch (error) {
      console.error("Failed to save channel metadata:", error);
      throw new Error("Storage quota exceeded or localStorage unavailable");
    }
  }

  /**
   * Load channel metadata from localStorage
   */
  static loadChannelMeta(channelId: string): ChannelMeta | null {
    try {
      const stored = localStorage.getItem(this.STOARGE) || "{}";
      const channels = JSON.parse(stored);
      return channels[channelId] || null;
    } catch (error) {
      console.error("Failed to load channel metadata:", error);
      return null;
    }
  }

  /**
   * Delete channel metadata
   */
  static deleteChannelMeta(channelId: string): void {
    try {
      const stored = localStorage.getItem(this.STOARGE) || "{}";
      const channels = JSON.parse(stored);
      delete channels[channelId];
      localStorage.setItem(this.STOARGE, JSON.stringify(channels));
    } catch (error) {
      console.error("Failed to delete channel metadata:", error);
    }
  }

  /**
   * Get all channel IDs from localStorage
   */
  static getAllChannelIds(): string[] {
    try {
      const stored = localStorage.getItem(this.STOARGE) || "{}";
      const channels = JSON.parse(stored);
      return Object.keys(channels);
    } catch (error) {
      console.error("Failed to get channel IDs:", error);
      return [];
    }
  }

  // ===============================
  // Channel History (IndexedDB)
  // ===============================

  /**
   * Save channel chat history to IndexedDB
   */
  static async saveChannelHistory(
    channelHistory: ChannelHistory
  ): Promise<void> {
    try {
      const key = `history_${channelHistory.channelId}`;
      await set(key, channelHistory);
    } catch (error) {
      console.error("Failed to save channel history:", error);
      throw new Error("IndexedDB storage failed");
    }
  }

  /**
   * Load channel chat history from IndexedDB
   */
  static async loadChannelHistory(
    channelId: string
  ): Promise<ChannelHistory | null> {
    try {
      const key = `history_${channelId}`;
      const history = await get(key);
      return history || null;
    } catch (error) {
      console.error("Failed to load channel history:", error);
      return null;
    }
  }

  /**
   * Delete channel history from IndexedDB
   */
  static async deleteChannelHistory(channelId: string): Promise<void> {
    try {
      const key = `history_${channelId}`;
      await del(key);
    } catch (error) {
      console.error("Failed to delete channel history:", error);
    }
  }

  /**
   * Add message to channel history
   */
  static async addMessageToHistory(
    channelId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      const existing = await this.loadChannelHistory(channelId);
      const history: ChannelHistory = existing || {
        channelId,
        messages: [],
        lastUpdated: new Date().toISOString(),
      };

      history.messages.push(message);
      history.lastUpdated = new Date().toISOString();

      await this.saveChannelHistory(history);
    } catch (error) {
      console.error("Failed to add message to history:", error);
      throw error;
    }
  }

  /**
   * Update message in channel history
   */
  static async updateMessageInHistory(
    channelId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ): Promise<void> {
    try {
      const history = await this.loadChannelHistory(channelId);
      if (!history) return;

      const messageIndex = history.messages.findIndex(
        (msg) => msg.id === messageId
      );
      if (messageIndex === -1) return;

      history.messages[messageIndex] = {
        ...history.messages[messageIndex],
        ...updates,
      };
      history.lastUpdated = new Date().toISOString();

      await this.saveChannelHistory(history);
    } catch (error) {
      console.error("Failed to update message in history:", error);
    }
  }

  // ===============================
  // Cleanup and Maintenance
  // ===============================

  /**
   * Clear all storage data
   */
  static async clearAllData(): Promise<void> {
    try {
      // Clear localStorage - remove vibecraft keys
      localStorage.removeItem(this.STOARGE);

      // Clear IndexedDB
      await clear();
    } catch (error) {
      console.error("Failed to clear all data:", error);
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    localStorage: number;
    indexedDB: number;
    total: number;
  }> {
    try {
      // Estimate localStorage usage
      let localStorageSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }

      // IndexedDB usage is harder to estimate precisely
      const indexedDBSize = 0; // Placeholder - would need more complex calculation

      return {
        localStorage: localStorageSize,
        indexedDB: indexedDBSize,
        total: localStorageSize + indexedDBSize,
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      return { localStorage: 0, indexedDB: 0, total: 0 };
    }
  }

  /**
   * Cleanup old data based on retention policy
   */
  static async cleanupOldData(retentionDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffTimestamp = cutoffDate.toISOString();

      // Get all channel IDs
      const channelIds = this.getAllChannelIds();

      for (const channelId of channelIds) {
        const meta = this.loadChannelMeta(channelId);

        // Delete channels older than retention period
        if (meta && meta.updatedAt < cutoffTimestamp) {
          this.deleteChannelMeta(channelId);
          await this.deleteChannelHistory(channelId);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old data:", error);
    }
  }
}
