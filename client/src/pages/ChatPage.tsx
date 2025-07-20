import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import { ArrowLeft, Share2, Download } from 'lucide-react';
import Layout from '../components/Layout';
import ChatComponent from '../components/ChatComponent';

const ChatPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string>();
  
  // URL 쿼리에서 세션 ID 추출
  const searchParams = new URLSearchParams(location.search);
  const initialSessionId = searchParams.get('sessionId') || undefined;

  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId);
    // URL 업데이트 (히스토리에 추가하지 않음)
    const newUrl = `${location.pathname}?sessionId=${newSessionId}`;
    window.history.replaceState(null, '', newUrl);
  };

  const handleError = (error: string) => {
    console.error('[ChatPage] 에러:', error);
  };

  const handleBack = () => {
    navigate('/craft');
  };

  const handleShare = () => {
    if (sessionId) {
      const shareUrl = `${window.location.origin}/chat?sessionId=${sessionId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        // 성공 알림 (간단한 구현)
        console.log('링크가 클립보드에 복사되었습니다');
      });
    }
  };

  const handleExport = () => {
    // 채팅 내역 내보내기 기능 (추후 구현)
    console.log('채팅 내역 내보내기');
  };

  return (
    <Layout showSidebar={true}>
      <div className="h-full flex flex-col bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                type="text"
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
                className="text-gray-600 hover:text-gray-800"
              >
                뒤로
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">
                  AI 채팅
                </h1>
                {sessionId && (
                  <p className="text-sm text-gray-500">
                    세션: {sessionId.slice(0, 8)}...
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Tooltip title="채팅 링크 공유">
                <Button
                  type="text"
                  icon={<Share2 className="w-4 h-4" />}
                  onClick={handleShare}
                  disabled={!sessionId}
                  className="text-gray-600 hover:text-gray-800"
                />
              </Tooltip>
              
              <Tooltip title="채팅 내역 내보내기">
                <Button
                  type="text"
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleExport}
                  disabled={!sessionId}
                  className="text-gray-600 hover:text-gray-800"
                />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 채팅 컴포넌트 */}
        <div className="flex-1 p-6">
          <div className="h-full max-w-4xl mx-auto">
            <ChatComponent
              sessionId={initialSessionId}
              onSessionChange={handleSessionChange}
              onError={handleError}
              height="100%"
              theme="light"
              className="h-full"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatPage;