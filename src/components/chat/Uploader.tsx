import { useCallback } from "react";
import { Upload, message as antMessage } from "antd";
import { Upload as UploadIcon, FileText, Trash2 } from "lucide-react";
import { SUPPORTED_FILE_EXTENSIONS } from "@/types/upload";
import { validateFile } from "@/utils/fileUtils";
import { useFileUpload } from "@/hooks/useFileUpload";

// 🚩 TEMPORARY: Single file mode flag
// Set to false to enable multiple file uploads
const SINGLE_FILE_MODE = true;

const Uploader = () => {
  // 파일 업로드 훅 사용
  const { files, updateFiles } = useFileUpload();

  // const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(
    (info: any) => {
      const { fileList } = info;
      // 실제 File 객체들 추출하여 전역 store 업데이트
      const rawFiles = fileList
        .map((item: any) => item.originFileObj || item)
        .filter(Boolean);
      updateFiles(rawFiles);
    },
    [files]
  );

  // 파일 삭제 핸들러
  const handleFileRemove = useCallback(
    (indexToRemove: number) => {
      const updatedFiles = files.filter((_, index) => index !== indexToRemove);

      // 실제 File 객체들 추출하여 전역 store 업데이트
      const rawFiles = updatedFiles
        .map((item: any) => item.originFileObj || item)
        .filter(Boolean);
      updateFiles(rawFiles);

      antMessage.success("파일이 삭제되었습니다.");
    },
    [files]
  );

  // 파일 업로드 전 검증
  const beforeUpload = (file: File) => {
    const validation = validateFile(file, 10);

    if (!validation.isValid) {
      antMessage.error(validation.error);
      return false;
    }

    // 🚩 SINGLE FILE MODE: Show message when replacing file
    if (SINGLE_FILE_MODE && files.length > 0) {
      antMessage.info("기존 파일이 새 파일로 교체됩니다.");
    }

    return false; // 자동 업로드 방지
  };

  return (
    <div className="space-y-4">
      <div className="text-gray-800">
        <p className="mb-3">
          📊 <strong>데이터 수집</strong>
        </p>
        <p className="text-sm text-gray-600 mb-3">
          분석할 데이터를 제공해주세요. 다음 중 하나의 방법을 선택하세요:
        </p>
        <div className="text-sm text-gray-600 mb-3 space-y-1">
          <p>
            • <strong>요구사항 입력:</strong> 데이터 소스 URL 혹은 요청 사항을
            입력해주세요
          </p>
          <p>
            • <strong>파일 업로드:</strong> 데이터 파일 직접 업로드
          </p>
        </div>
      </div>

      <Upload.Dragger
        multiple={!SINGLE_FILE_MODE} // 🚩 SINGLE FILE MODE: Disable multiple uploads
        beforeUpload={beforeUpload}
        onChange={handleFileUpload}
        accept={SUPPORTED_FILE_EXTENSIONS.join(",")}
        className="bg-white/50 border-dashed border-gray-300 hover:border-green-400 transition-colors"
        style={{ minHeight: "90px" }}
        showUploadList={false}
      >
        <div className="py-3">
          <UploadIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1 font-medium">
            데이터 파일 업로드
          </p>
          <p className="text-xs text-gray-500">
            {SINGLE_FILE_MODE
              ? "CSV, SQL, JSON, XLSX, XLS, TXT 파일 1개를 드래그하거나 클릭 (최대 10MB)"
              : "CSV, SQL, JSON, XLSX, XLS, TXT 파일을 드래그하거나 클릭 (최대 10MB)"}
          </p>
        </div>
      </Upload.Dragger>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {SINGLE_FILE_MODE ? "업로드된 파일:" : "업로드된 파일:"}
          </p>
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center space-x-2 flex-1">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700">{file.name}</span>
                <span className="text-gray-500">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                onClick={() => handleFileRemove(idx)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="파일 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Uploader;
