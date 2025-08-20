/**
 * VibeCraft File Upload Store
 * Manages file upload state with Zustand
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { UploadedFile } from "@/types/upload";
import { API_CONFIG } from "@/config/env";
import { formatUploadedFiles } from "@/utils/fileUtils";

// 🚩 TEMPORARY: Single file mode flag
// Set to false to enable multiple file uploads
const SINGLE_FILE_MODE = true;

interface FileUploadState {
  // State
  files: UploadedFile[];
  rawFiles: File[]; // 실제 File 객체들 저장
  isUploading: boolean;
  uploadProgress: number;

  // Actions
  updateFiles: (newFiles: File[]) => void;
  addFiles: (newFiles: File[]) => void;
  removeFile: (fileUid: string) => void;
  removeFileByIndex: (index: number) => void;
  clearAllFiles: () => void;
  findFile: (fileUid: string) => UploadedFile | undefined;

  // Upload actions
  uploadFiles: (threadId: string) => Promise<any>;
  setUploading: (isUploading: boolean) => void;
  setUploadProgress: (progress: number) => void;

  // Computed values
  getFileStats: () => {
    count: number;
    totalSize: number;
  };
}

export const useFileUploadStore = create<FileUploadState>()(
  devtools(
    (set, get) => ({
      // Initial state
      files: [],
      rawFiles: [],
      isUploading: false,
      uploadProgress: 0,

      // Update entire file list
      updateFiles: (newFiles) => {
        // 🚩 SINGLE FILE MODE: Only keep the latest file
        const filesToProcess = SINGLE_FILE_MODE ? newFiles.slice(-1) : newFiles;
        const uploadedFiles = formatUploadedFiles(filesToProcess);
        set({ files: uploadedFiles, rawFiles: filesToProcess });
      },

      // Add new files to existing list
      addFiles: (newFiles) => {
        const newUploadedFiles = formatUploadedFiles(newFiles);

        if (SINGLE_FILE_MODE) {
          // 🚩 SINGLE FILE MODE: Replace existing files with new ones
          const filesToProcess = newFiles.slice(-1);
          const singleUploadedFile = formatUploadedFiles(filesToProcess);
          set({ files: singleUploadedFile, rawFiles: filesToProcess });
        } else {
          // Original multi-file behavior
          set((state) => ({
            files: [...state.files, ...newUploadedFiles],
            rawFiles: [...state.rawFiles, ...newFiles],
          }));
        }
      },

      // Remove file by UID
      removeFile: (fileUid) => {
        set((state) => {
          const fileIndex = state.files.findIndex(
            (file) => file.uid === fileUid
          );
          return {
            files: state.files.filter((file) => file.uid !== fileUid),
            rawFiles: state.rawFiles.filter((_, i) => i !== fileIndex),
          };
        });
      },

      // Remove file by index
      removeFileByIndex: (index) => {
        set((state) => ({
          files: state.files.filter((_, i) => i !== index),
          rawFiles: state.rawFiles.filter((_, i) => i !== index),
        }));
      },

      // Clear all files
      clearAllFiles: () => {
        set({ files: [], rawFiles: [], isUploading: false, uploadProgress: 0 });
      },

      // Find file by UID
      findFile: (fileUid) => {
        return get().files.find((file) => file.uid === fileUid);
      },

      // Set uploading state
      setUploading: (isUploading) => {
        set({ isUploading });
      },

      // Set upload progress
      setUploadProgress: (progress) => {
        set({ uploadProgress: progress });
      },

      // Upload files to server using globally stored files
      uploadFiles: async (threadId) => {
        try {
          const currentRawFiles = get().rawFiles;

          if (currentRawFiles.length === 0) {
            throw new Error("업로드할 파일이 없습니다.");
          }

          set({ isUploading: true, uploadProgress: 0 });

          // Create FormData for file upload
          const formData = new FormData();

          // 🚩 SINGLE FILE MODE: Replace existing files with new ones
          if (currentRawFiles.length !== 1) {
            throw new Error(
              `파일 업로드 실패: 1개의 파일만 업로드 가능합니다.`
            );
          }
          formData.append("file", currentRawFiles[0]);

          // Upload to server using custom fetch
          const apiUrl = `${
            API_CONFIG.BASE_URL
          }/contents/upload?thread_id=${encodeURIComponent(threadId)}`;

          const response = await fetch(apiUrl, {
            method: "POST",
            body: formData,
            // Don't set Content-Type header - let browser set it with boundary for FormData
          });

          if (!response.ok) {
            throw new Error(`파일 업로드 실패: ${response.status}`);
          }

          const result = await response.json();

          set({ isUploading: false, uploadProgress: 100 });

          return result;
        } catch (error) {
          set({ isUploading: false, uploadProgress: 0 });
          console.error("File upload error:", error);
          throw error;
        }
      },

      // Get file statistics
      getFileStats: () => {
        const files = get().files;
        return {
          count: files.length,
          totalSize: files.reduce((total, file) => total + file.size, 0),
        };
      },
    }),
    {
      name: "vibecraft-file-upload-store",
    }
  )
);

// Helper hooks for common operations
export const useFileUploadActions = () => {
  const store = useFileUploadStore();
  return {
    updateFiles: store.updateFiles,
    addFiles: store.addFiles,
    removeFile: store.removeFile,
    removeFileByIndex: store.removeFileByIndex,
    clearAllFiles: store.clearAllFiles,
    findFile: store.findFile,
    uploadFiles: store.uploadFiles,
    setUploading: store.setUploading,
    setUploadProgress: store.setUploadProgress,
  };
};

export const useFileUploadState = () => {
  const store = useFileUploadStore();
  return {
    files: store.files,
    rawFiles: store.rawFiles,
    fileStats: store.getFileStats(),
    isUploading: store.isUploading,
    uploadProgress: store.uploadProgress,
  };
};

// Backward compatibility - keep the original hook name
export const useFileUpload = () => {
  const actions = useFileUploadActions();
  const state = useFileUploadState();

  return {
    ...state,
    ...actions,
  };
};
