import { Button } from "antd";
import { X } from "lucide-react";
import { FileCardProps } from "@/types/upload";
import { getFileIconInfo, formatFileSize } from "@/utils/fileUtils";

const FileCard = ({ file, onRemove }: FileCardProps) => {
  const { Icon, className } = getFileIconInfo(file.name);

  return (
    <div className="flex items-center justify-between bg-white/70 rounded-lg p-2 border border-gray-200 hover:border-purple-300 transition-colors group">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <Icon className={className} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">
            {file.name}
          </p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>
      </div>
      <Button
        type="text"
        size="small"
        icon={<X className="w-3 h-3" />}
        onClick={() => onRemove(file.uid)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50 border-0"
        style={{ minWidth: "24px", width: "24px", height: "24px" }}
      />
    </div>
  );
};

export default FileCard;
