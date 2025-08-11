import React from "react";
import { Button } from "antd";
import { Trash2, FolderOpen } from "lucide-react";
import FileCard from "./FileCard";
import { UploadedFilesListProps } from "@/types/upload";

const UploadedFilesList = ({
  files,
  onRemoveFile,
  onClearAll,
}: UploadedFilesListProps) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">
            업로드된 파일 ({files.length}개)
          </span>
        </div>
        <Button
          type="text"
          size="small"
          icon={<Trash2 className="w-3 h-3" />}
          onClick={onClearAll}
          className="text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          전체 삭제
        </Button>
      </div>

      {/* 파일 목록 */}
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {files.map((file) => (
          <FileCard key={file.uid} file={file} onRemove={onRemoveFile} />
        ))}
      </div>
    </div>
  );
};

export default UploadedFilesList;
