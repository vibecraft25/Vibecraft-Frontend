/**
 * VibeCraft Services
 * Central export for all services
 */

export { StorageService } from "./storageService";
export { VibeCraftSSEService, sseService } from "./sseService";
export { MessageService } from "./messageService";
export { StreamService } from "./streamService";
export { DataService } from "./dataService";
export type { MessageParams, StreamEndpoint } from "./messageService";
export type { StreamEventHandler, ProcessedDataEvent } from "./streamService";
export type { ChannelData } from "./dataService";

// Service configuration
export const initializeServices = async () => {
  try {
    // Initialize storage service (check IndexedDB support)
    if (!window.indexedDB) {
      console.warn(
        "IndexedDB not supported, falling back to localStorage only"
      );
    }

    // Cleanup old data on startup (optional)
    const { StorageService } = await import("./storageService");
    await StorageService.cleanupOldData(30); // 30 days retention

    console.log("VibeCraft services initialized successfully");
  } catch (error) {
    console.error("Failed to initialize services:", error);
  }
};
