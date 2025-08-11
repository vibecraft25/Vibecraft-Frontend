import { useState, useCallback } from "react";
import { UploadedFile } from "@/types/upload";

/**
 * 파일 업로드 상태 관리 커스텀 훅
 */
export const useFileUpload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // 파일 목록 업데이트
  const updateFiles = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles);
  }, []);

  // 파일 추가
  const addFiles = useCallback((newFiles: UploadedFile[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  // 특정 파일 제거
  const removeFile = useCallback((fileUid: string) => {
    setFiles((prev) => prev.filter((file) => file.uid !== fileUid));
  }, []);

  // 모든 파일 제거
  const clearAllFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // 특정 파일 찾기
  const findFile = useCallback((fileUid: string) => {
    return files.find((file) => file.uid === fileUid);
  }, [files]);

  // 파일 개수 및 총 크기 계산
  const fileStats = {
    count: files.length,
    totalSize: files.reduce((total, file) => total + file.size, 0),
  };

  return {
    // 상태
    files,
    fileStats,
    
    // 액션들
    updateFiles,
    addFiles,
    removeFile,
    clearAllFiles,
    findFile,
  };
};