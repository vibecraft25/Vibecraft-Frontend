/**
 * VibeCraft Storage Hook
 * React hook for storage operations and management
 */

import { useState, useEffect, useCallback } from "react";
import { StorageService } from "@/core/services/storageService";

interface StorageStats {
  localStorage: number;
  indexedDB: number;
  total: number;
}

interface UseStorageOptions {
  enableAutoCleanup?: boolean;
  retentionDays?: number;
  monitorUsage?: boolean;
}

export const useStorage = (options: UseStorageOptions = {}) => {
  const [stats, setStats] = useState<StorageStats>({
    localStorage: 0,
    indexedDB: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load storage stats
  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const storageStats = await StorageService.getStorageStats();
      setStats(storageStats);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load storage stats";
      setError(errorMessage);
      console.error("Storage stats error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Clear all storage data
  const clearAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await StorageService.clearAllData();
      await loadStats(); // Refresh stats after clearing

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear storage";
      setError(errorMessage);
      console.error("Clear storage error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadStats]);

  // Cleanup old data
  const cleanupOldData = useCallback(
    async (retentionDays?: number) => {
      try {
        setIsLoading(true);
        setError(null);

        const days = retentionDays || options.retentionDays || 30;
        await StorageService.cleanupOldData(days);
        await loadStats(); // Refresh stats after cleanup

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to cleanup old data";
        setError(errorMessage);
        console.error("Cleanup error:", err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [options.retentionDays, loadStats]
  );

  // Export data (for backup purposes)
  const exportData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const channelIds = StorageService.getAllChannelIds();
      const exportData: any = {
        timestamp: new Date().toISOString(),
        version: "1.0",
        channels: {},
        config: StorageService.loadAppConfig(),
      };

      // Export channel metadata and history
      for (const channelId of channelIds) {
        const meta = StorageService.loadChannelMeta(channelId);
        const history = await StorageService.loadChannelHistory(channelId);

        if (meta) {
          exportData.channels[channelId] = {
            meta,
            history: history?.messages || [],
          };
        }
      }

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vibecraft-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to export data";
      setError(errorMessage);
      console.error("Export error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Import data (from backup file)
  const importData = useCallback(
    async (file: File) => {
      try {
        setIsLoading(true);
        setError(null);

        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate import data structure
        if (!importData.version || !importData.channels) {
          throw new Error("Invalid backup file format");
        }

        // Clear existing data
        await StorageService.clearAllData();

        // Import channels
        for (const [channelId, channelData] of Object.entries(
          importData.channels as any
        )) {
          const { meta, history } = channelData as any;

          // Import metadata
          if (meta) {
            StorageService.saveChannelMeta(meta);
          }

          // Import history
          if (history && Array.isArray(history)) {
            await StorageService.saveChannelHistory({
              channelId,
              messages: history,
              lastUpdated: new Date().toISOString(),
            });
          }
        }

        // Import config
        if (importData.config) {
          StorageService.saveAppConfig(importData.config);
        }

        await loadStats(); // Refresh stats after import
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to import data";
        setError(errorMessage);
        console.error("Import error:", err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [loadStats]
  );

  // Monitor storage usage if enabled
  useEffect(() => {
    if (options.monitorUsage) {
      loadStats();

      // Set up periodic monitoring
      const interval = setInterval(loadStats, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [options.monitorUsage, loadStats]);

  // Auto-cleanup if enabled
  useEffect(() => {
    if (options.enableAutoCleanup) {
      cleanupOldData();
    }
  }, [options.enableAutoCleanup, cleanupOldData]);

  // Storage quota monitoring
  const checkStorageQuota = useCallback(async () => {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = Math.round((estimate.usage || 0) / (1024 * 1024));
        const quotaMB = Math.round((estimate.quota || 0) / (1024 * 1024));
        const usagePercent = quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0;

        return {
          used: usedMB,
          quota: quotaMB,
          available: quotaMB - usedMB,
          usagePercent,
          isNearLimit: usagePercent > 80,
        };
      } catch (error) {
        console.error("Failed to check storage quota:", error);
        return null;
      }
    }
    return null;
  }, []);

  return {
    // State
    stats,
    isLoading,
    error,

    // Actions
    loadStats,
    clearAllData,
    cleanupOldData,
    exportData,
    importData,
    checkStorageQuota,

    // Utilities
    formatBytes: (bytes: number) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    // Computed values
    hasData: stats.total > 0,
    isStorageHealthy: error === null && stats.total > 0,
  };
};
