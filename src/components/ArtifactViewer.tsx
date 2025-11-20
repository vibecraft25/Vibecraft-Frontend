import { useState, useRef, useEffect } from "react";
import { Maximize2, RefreshCw, X } from "lucide-react";

interface ArtifactViewerProps {
  targetUrl: string;
  title?: string;
  description?: string;
  isVisible: boolean;
  onClose: () => void;
}

const ArtifactViewer = ({
  targetUrl,
  title = "Preview System",
  description,
  isVisible,
  onClose,
}: ArtifactViewerProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  // URL 변경 시 로딩 상태 초기화
  useEffect(() => {
    setLoading(true);
  }, [targetUrl]);

  // iframe 로드 완료 핸들러
  const handleLoad = () => {
    setLoading(false);
    console.log("🔗 Artifact system loaded:", targetUrl);
  };

  // 새로고침 기능
  const handleRefresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = targetUrl;
    }
  };

  // 전체화면 토글
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      iframeRef.current?.requestFullscreen().catch((err) => {
        console.error("❌ Fullscreen request failed:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full w-full md:w-1/2 border-l border-gray-200 bg-white shadow-lg transition-all duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800 truncate">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {description}
            </p>
          )}
          <div className="text-xs text-gray-400 mt-1 truncate">
            {targetUrl}
          </div>
        </div>

        {/* 컨트롤 버튼 */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
            title="새로고침"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-500 hover:text-gray-700 transition-colors"
            title="전체화면"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-50 rounded-md text-gray-500 hover:text-red-500 transition-colors"
            title="닫기"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iframe 컨테이너 */}
      <div className="relative flex-1 w-full bg-gray-50 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-500" />
              <p className="text-sm text-gray-600">로딩 중...</p>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={targetUrl}
          className="w-full h-full border-none"
          onLoad={handleLoad}
          onError={() => {
            setLoading(false);
            console.error("❌ Failed to load artifact:", targetUrl);
          }}
          title={title || "Artifact Viewer"}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
};

export default ArtifactViewer;
