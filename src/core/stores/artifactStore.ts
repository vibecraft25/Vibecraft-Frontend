/**
 * VibeCraft Artifact Store
 * Manages artifact (preview system) state with Zustand
 * Similar to Claude Artifacts or OpenAI Canvas
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface ArtifactState {
  // Artifact visibility and URL
  isVisible: boolean;
  currentUrl: string | null;
  artifactMessageId: string | null;

  // Artifact metadata
  title?: string;
  description?: string;

  // Actions
  showArtifact: (url: string, messageId: string, title?: string, description?: string) => void;
  hideArtifact: () => void;
  updateUrl: (url: string) => void;
  clearArtifact: () => void;
}

export const useArtifactStore = create<ArtifactState>()(
  devtools(
    (set) => ({
      // Initial state
      isVisible: false,
      currentUrl: null,
      artifactMessageId: null,
      title: undefined,
      description: undefined,

      // Show artifact with URL
      showArtifact: (url, messageId, title, description) => {
        set({
          isVisible: true,
          currentUrl: url,
          artifactMessageId: messageId,
          title,
          description,
        });
      },

      // Hide artifact
      hideArtifact: () => {
        set({
          isVisible: false,
        });
      },

      // Update artifact URL (for refresh)
      updateUrl: (url) => {
        set({ currentUrl: url });
      },

      // Clear artifact completely
      clearArtifact: () => {
        set({
          isVisible: false,
          currentUrl: null,
          artifactMessageId: null,
          title: undefined,
          description: undefined,
        });
      },
    }),
    {
      name: "vibecraft-artifact-store",
    }
  )
);

// Helper hooks for common operations
export const useArtifactActions = () => {
  const store = useArtifactStore();
  return {
    showArtifact: store.showArtifact,
    hideArtifact: store.hideArtifact,
    updateUrl: store.updateUrl,
    clearArtifact: store.clearArtifact,
  };
};

export const useArtifactState = () => {
  const store = useArtifactStore();
  return {
    isVisible: store.isVisible,
    currentUrl: store.currentUrl,
    artifactMessageId: store.artifactMessageId,
    title: store.title,
    description: store.description,
  };
};
