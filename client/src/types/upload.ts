/**
 * 파일 업로드 관련 타입 정의
 */

// 업로드된 파일 정보
export interface UploadedFile {
  uid: string;
  name: string;
  size: number;
  type?: string;
}

// 지원되는 파일 확장자
export const SUPPORTED_FILE_EXTENSIONS = [".csv", ".sql", ".json", ".xlsx", ".xls", ".txt"] as const;
export type SupportedFileExtension = typeof SUPPORTED_FILE_EXTENSIONS[number];

// 파일 타입별 정보
export interface FileTypeInfo {
  extension: string;
  icon: string;
  color: string;
  description: string;
}

// 파일 업로드 상태
export type FileUploadStatus = "pending" | "uploading" | "success" | "error";

// 파일 업로드 결과
export interface FileUploadResult {
  file: UploadedFile;
  status: FileUploadStatus;
  message?: string;
}

// 파일 관리 콜백 함수 타입들
export interface FileManagementCallbacks {
  onUpdateUploadedFiles?: (files: UploadedFile[]) => void;
  onRemoveFile?: (fileUid: string) => void;
  onClearAllFiles?: () => void;
}

// Uploader 컴포넌트 Props
export interface UploaderProps extends FileManagementCallbacks {
  disabled?: boolean;
  maxFileSize?: number; // MB 단위
}

// FileCard 컴포넌트 Props
export interface FileCardProps {
  file: UploadedFile;
  onRemove: (fileUid: string) => void;
}

// UploadedFilesList 컴포넌트 Props
export interface UploadedFilesListProps {
  files: UploadedFile[];
  onRemoveFile: (fileUid: string) => void;
  onClearAll: () => void;
}

// 파일 크기 포맷팅 유틸리티 타입
export type FileSizeUnit = "B" | "KB" | "MB" | "GB";