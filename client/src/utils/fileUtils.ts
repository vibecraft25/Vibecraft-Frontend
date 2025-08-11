import { Table, Code, FileSpreadsheet, FileType, FileText } from "lucide-react";
import { SUPPORTED_FILE_EXTENSIONS } from "@/types/upload";

/**
 * 파일 확장자에 따른 아이콘 정보 반환
 */
export const getFileIconInfo = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "csv":
      return { Icon: Table, className: "w-4 h-4 text-green-500" };
    case "sql":
      return { Icon: Code, className: "w-4 h-4 text-blue-500" };
    case "json":
      return { Icon: Code, className: "w-4 h-4 text-yellow-500" };
    case "xlsx":
    case "xls":
      return { Icon: FileSpreadsheet, className: "w-4 h-4 text-green-600" };
    case "txt":
      return { Icon: FileType, className: "w-4 h-4 text-gray-500" };
    default:
      return { Icon: FileText, className: "w-4 h-4 text-blue-500" };
  }
};

/**
 * 파일 크기를 읽기 쉬운 형태로 포맷팅
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

/**
 * 파일 검증 (확장자 및 크기)
 */
export const validateFile = (
  file: File,
  maxSizeMB: number = 10
): { isValid: boolean; error?: string } => {
  const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

  // 확장자 검증
  if (!SUPPORTED_FILE_EXTENSIONS.includes(fileExtension as any)) {
    return {
      isValid: false,
      error: `지원하지 않는 파일 형식입니다. (${SUPPORTED_FILE_EXTENSIONS.join(
        ", "
      )}만 지원)`,
    };
  }

  // 파일 크기 검증
  const fileSizeMB = file.size / 1024 / 1024;
  if (fileSizeMB > maxSizeMB) {
    return {
      isValid: false,
      error: `파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`,
    };
  }

  return { isValid: true };
};

/**
 * 파일 배열을 UploadedFile 형태로 변환
 */
export const formatUploadedFiles = (fileList: any[]) => {
  return fileList.map((file: any) => ({
    uid: file.uid,
    name: file.name,
    size: file.size,
    type: file.type,
  }));
};
