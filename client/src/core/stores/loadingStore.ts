/**
 * VibeCraft Loading Store
 * Centralized loading state management
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type LoadingType =
  | "channel"
  | "api"
  | "data"
  | "export"
  | "import"
  | "cleanup"
  | "connection";

interface LoadingState {
  // Loading states
  isChannelLoading: boolean;
  isApiLoading: boolean;
  isDataLoading: boolean;
  isExportLoading: boolean;
  isImportLoading: boolean;
  isCleanupLoading: boolean;
  isConnectionLoading: boolean;

  // Generic loading with custom keys
  customLoading: Record<string, boolean>;

  // Progress tracking
  progressStates: Record<
    string,
    {
      current: number;
      total: number;
      message?: string;
    }
  >;

  // Actions
  setLoading: (type: LoadingType, loading: boolean) => void;
  setCustomLoading: (key: string, loading: boolean) => void;

  // Progress actions
  setProgress: (
    key: string,
    current: number,
    total: number,
    message?: string
  ) => void;
  updateProgress: (key: string, current: number, message?: string) => void;
  clearProgress: (key: string) => void;

  // Utility actions
  setMultipleLoading: (states: Partial<Record<LoadingType, boolean>>) => void;
  clearAllLoading: () => void;

  // Query helpers
  isAnyLoading: () => boolean;
  getLoadingStatus: (type: LoadingType) => boolean;
  getAllLoadingStates: () => Record<LoadingType | string, boolean>;
}

export const useLoadingStore = create<LoadingState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isChannelLoading: false,
      isApiLoading: false,
      isDataLoading: false,
      isExportLoading: false,
      isImportLoading: false,
      isCleanupLoading: false,
      isConnectionLoading: false,
      customLoading: {},
      progressStates: {},

      // Set specific loading state
      setLoading: (type, loading) => {
        set((state) => ({
          [`is${type.charAt(0).toUpperCase() + type.slice(1)}Loading`]: loading,
        }));
      },

      // Set custom loading state
      setCustomLoading: (key, loading) => {
        set((state) => ({
          customLoading: {
            ...state.customLoading,
            [key]: loading,
          },
        }));
      },

      // Set progress with full state
      setProgress: (key, current, total, message) => {
        set((state) => ({
          progressStates: {
            ...state.progressStates,
            [key]: { current, total, message },
          },
        }));
      },

      // Update progress current value
      updateProgress: (key, current, message) => {
        set((state) => {
          const existing = state.progressStates[key];
          if (!existing) return state;

          return {
            progressStates: {
              ...state.progressStates,
              [key]: {
                ...existing,
                current,
                message: message || existing.message,
              },
            },
          };
        });
      },

      // Clear progress state
      clearProgress: (key) => {
        set((state) => {
          const newProgressStates = { ...state.progressStates };
          delete newProgressStates[key];
          return { progressStates: newProgressStates };
        });
      },

      // Set multiple loading states at once
      setMultipleLoading: (states) => {
        const updates: any = {};
        Object.entries(states).forEach(([type, loading]) => {
          updates[`is${type.charAt(0).toUpperCase() + type.slice(1)}Loading`] =
            loading;
        });
        set(updates);
      },

      // Clear all loading states
      clearAllLoading: () => {
        set({
          isChannelLoading: false,
          isApiLoading: false,
          isDataLoading: false,
          isExportLoading: false,
          isImportLoading: false,
          isCleanupLoading: false,
          isConnectionLoading: false,
          customLoading: {},
          progressStates: {},
        });
      },

      // Check if any loading is active
      isAnyLoading: () => {
        const state = get();
        return (
          state.isChannelLoading ||
          state.isApiLoading ||
          state.isDataLoading ||
          state.isExportLoading ||
          state.isImportLoading ||
          state.isCleanupLoading ||
          state.isConnectionLoading ||
          Object.values(state.customLoading).some(Boolean)
        );
      },

      // Get specific loading status
      getLoadingStatus: (type) => {
        const state = get();
        const key = `is${
          type.charAt(0).toUpperCase() + type.slice(1)
        }Loading` as keyof LoadingState;
        return state[key] as boolean;
      },

      // Get all loading states
      getAllLoadingStates: () => {
        const state = get();
        return {
          channel: state.isChannelLoading,
          api: state.isApiLoading,
          data: state.isDataLoading,
          export: state.isExportLoading,
          import: state.isImportLoading,
          cleanup: state.isCleanupLoading,
          connection: state.isConnectionLoading,
          ...state.customLoading,
        };
      },
    }),
    {
      name: "vibecraft-loading-store",
    }
  )
);

// Helper hooks for common patterns
export const useLoadingActions = () => {
  const store = useLoadingStore();
  return {
    setLoading: store.setLoading,
    setCustomLoading: store.setCustomLoading,
    setProgress: store.setProgress,
    updateProgress: store.updateProgress,
    clearProgress: store.clearProgress,
    setMultipleLoading: store.setMultipleLoading,
    clearAllLoading: store.clearAllLoading,
  };
};

export const useLoadingState = () => {
  const store = useLoadingStore();
  return {
    isChannelLoading: store.isChannelLoading,
    isApiLoading: store.isApiLoading,
    isDataLoading: store.isDataLoading,
    isExportLoading: store.isExportLoading,
    isImportLoading: store.isImportLoading,
    isCleanupLoading: store.isCleanupLoading,
    isConnectionLoading: store.isConnectionLoading,
    customLoading: store.customLoading,
    progressStates: store.progressStates,
    isAnyLoading: store.isAnyLoading(),
    getAllLoadingStates: store.getAllLoadingStates(),
  };
};

// Specific loading hooks for convenience
export const useChannelLoading = () => {
  return useLoadingStore((state) => state.isChannelLoading);
};

export const useApiLoading = () => {
  return useLoadingStore((state) => state.isApiLoading);
};

export const useAnyLoading = () => {
  return useLoadingStore((state) => state.isAnyLoading());
};

// Hook for progress tracking
export const useProgress = (key: string) => {
  const progressState = useLoadingStore((state) => state.progressStates[key]);
  const setProgress = useLoadingStore((state) => state.setProgress);
  const updateProgress = useLoadingStore((state) => state.updateProgress);
  const clearProgress = useLoadingStore((state) => state.clearProgress);

  return {
    progress: progressState,
    setProgress: (current: number, total: number, message?: string) =>
      setProgress(key, current, total, message),
    updateProgress: (current: number, message?: string) =>
      updateProgress(key, current, message),
    clearProgress: () => clearProgress(key),
    percentage: progressState
      ? Math.round((progressState.current / progressState.total) * 100)
      : 0,
  };
};
