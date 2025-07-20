import React, { useState, useEffect } from 'react'
import { Button } from 'antd'
import { Menu, X } from 'lucide-react'
import Sidebar, { ChatSession } from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  className?: string
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showSidebar = true,
  className = '' 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // 샘플 채팅 세션 데이터
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: '매출 데이터 분석',
      messages: 12,
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
      preview: '지난 분기 매출 트렌드를 분석해주세요',
      isActive: true
    },
    {
      id: '2',
      title: '고객 행동 패턴',
      messages: 8,
      lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1일 전
      preview: '고객 구매 패턴을 시각화하고 싶어요'
    },
    {
      id: '3',
      title: '날씨와 매출 상관관계',
      messages: 15,
      lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3일 전
      preview: '날씨 데이터와 매출의 연관성을 분석해주세요'
    },
    {
      id: '4',
      title: '제품별 성과 분석',
      messages: 6,
      lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1주일 전
      preview: '제품 카테고리별 판매 성과를 비교해주세요'
    }
  ])
  
  const [activeSessionId, setActiveSessionId] = useState('1')

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true) // 데스크톱에서는 기본적으로 사이드바 열림
      } else {
        setSidebarOpen(false) // 모바일에서는 기본적으로 사이드바 닫힘
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSessionSelect = (sessionId: string) => {
    setActiveSessionId(sessionId)
    setChatSessions(prev => 
      prev.map(session => ({
        ...session,
        isActive: session.id === sessionId
      }))
    )
  }

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '새로운 채팅',
      messages: 0,
      lastActivity: new Date(),
      preview: '',
      isActive: true
    }
    
    setChatSessions(prev => [newSession, ...prev.map(s => ({ ...s, isActive: false }))])
    setActiveSessionId(newSession.id)
  }

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId))
    if (activeSessionId === sessionId && chatSessions.length > 1) {
      const remainingSessions = chatSessions.filter(s => s.id !== sessionId)
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id)
      }
    }
  }

  const handleArchiveSession = (sessionId: string) => {
    // 아카이브 로직 구현 (여기서는 간단히 삭제로 처리)
    handleDeleteSession(sessionId)
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex ${className}`}>
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
          sessions={chatSessions}
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onArchiveSession={handleArchiveSession}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        {showSidebar && isMobile && (
          <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <Button
              type="text"
              icon={sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              onClick={handleSidebarToggle}
              className="flex items-center justify-center"
            />
            <h1 className="text-lg font-semibold text-gray-800">VibeCraft</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

      {/* Mobile Overlay */}
      {showSidebar && isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleSidebarToggle}
        />
      )}
    </div>
  )
}

export default Layout