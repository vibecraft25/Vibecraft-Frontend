import React, { useState } from 'react'
import { Drawer, List, Button, Typography, Badge, Menu, Tooltip } from 'antd'
import { 
  MessageSquare, 
  Plus, 
  Archive, 
  Trash2, 
  Calendar,
  Search,
  Settings,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const { Title, Text } = Typography

export interface ChatSession {
  id: string
  title: string
  messages: number
  lastActivity: Date
  isActive?: boolean
  preview?: string
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  sessions: ChatSession[]
  activeSessionId?: string
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (sessionId: string) => void
  onArchiveSession: (sessionId: string) => void
  className?: string
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  sessions = [],
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onArchiveSession,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.preview?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '오늘'
    if (diffDays === 2) return '어제'
    if (diffDays <= 7) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  const SessionActions = ({ session }: { session: ChatSession }) => (
    <Menu
      items={[
        {
          key: 'archive',
          label: '보관하기',
          icon: <Archive className="w-4 h-4" />,
          onClick: () => onArchiveSession(session.id)
        },
        {
          key: 'delete',
          label: '삭제하기',
          icon: <Trash2 className="w-4 h-4" />,
          danger: true,
          onClick: () => onDeleteSession(session.id)
        }
      ]}
    />
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isOpen ? 'w-80' : 'w-16'
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {isOpen && (
            <Title level={4} className="mb-0 text-gray-800">
              채팅 세션
            </Title>
          )}
          <Button
            type="text"
            icon={isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            onClick={onToggle}
            className="flex items-center justify-center"
          />
        </div>

        {isOpen ? (
          <>
            {/* New Chat Button */}
            <div className="p-4 border-b border-gray-100">
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={onNewSession}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 border-0 rounded-lg"
              >
                새 채팅 시작
              </Button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="채팅 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto">
              {filteredSessions.length > 0 ? (
                <List
                  dataSource={filteredSessions}
                  renderItem={(session) => (
                    <List.Item
                      className={`cursor-pointer transition-all duration-200 border-0 hover:bg-gray-50 ${
                        session.id === activeSessionId 
                          ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-r-2 border-purple-500' 
                          : ''
                      }`}
                      onClick={() => onSessionSelect(session.id)}
                      actions={[
                        <Tooltip title="더보기">
                          <Button
                            type="text"
                            icon={<MoreVertical className="w-4 h-4" />}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              // 드롭다운 메뉴 표시 로직
                            }}
                          />
                        </Tooltip>
                      ]}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <Text 
                            strong={session.id === activeSessionId}
                            className={`text-sm truncate ${
                              session.id === activeSessionId ? 'text-purple-700' : 'text-gray-800'
                            }`}
                          >
                            {session.title}
                          </Text>
                          <Badge 
                            count={session.messages} 
                            size="small"
                            className="ml-2"
                            style={{ backgroundColor: session.id === activeSessionId ? '#8b5cf6' : '#6b7280' }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Text type="secondary" className="text-xs truncate mr-2">
                            {session.preview || '새로운 채팅'}
                          </Text>
                          <div className="flex items-center text-xs text-gray-400">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(session.lastActivity)}
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <Text type="secondary">
                    {searchTerm ? '검색 결과가 없습니다' : '아직 채팅 세션이 없습니다'}
                  </Text>
                  {!searchTerm && (
                    <div className="mt-4">
                      <Button
                        type="link"
                        onClick={onNewSession}
                        className="text-purple-600 hover:text-purple-700"
                      >
                        첫 번째 채팅을 시작해보세요
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="p-4 border-t border-gray-200">
              <Button
                type="text"
                icon={<Settings className="w-4 h-4" />}
                className="w-full justify-start text-gray-600 hover:text-gray-800"
              >
                설정
              </Button>
            </div>
          </>
        ) : (
          /* Collapsed State */
          <div className="flex flex-col items-center py-4 space-y-4">
            <Tooltip title="새 채팅 시작" placement="right">
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={onNewSession}
                className="bg-gradient-to-r from-purple-500 to-blue-500 border-0"
                shape="circle"
              />
            </Tooltip>
            <Tooltip title="채팅 목록" placement="right">
              <Button
                type="text"
                icon={<MessageSquare className="w-4 h-4" />}
                className="text-gray-600"
              />
            </Tooltip>
            <Tooltip title="설정" placement="right">
              <Button
                type="text"
                icon={<Settings className="w-4 h-4" />}
                className="text-gray-600"
              />
            </Tooltip>
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      <Drawer
        title="채팅 세션"
        placement="left"
        width={320}
        onClose={onToggle}
        open={isOpen}
        className="lg:hidden"
        headerStyle={{ 
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 24px'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div className="flex flex-col h-full">
          {/* New Chat Button */}
          <div className="p-4 border-b border-gray-100">
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                onNewSession()
                onToggle() // 모바일에서는 새 채팅 시작 후 닫기
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 border-0 rounded-lg"
            >
              새 채팅 시작
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="채팅 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto">
            {filteredSessions.length > 0 ? (
              <List
                dataSource={filteredSessions}
                renderItem={(session) => (
                  <List.Item
                    className={`cursor-pointer transition-all duration-200 border-0 hover:bg-gray-50 ${
                      session.id === activeSessionId 
                        ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-r-2 border-purple-500' 
                        : ''
                    }`}
                    onClick={() => {
                      onSessionSelect(session.id)
                      onToggle() // 모바일에서는 세션 선택 후 닫기
                    }}
                  >
                    <div className="flex-1 min-w-0 px-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <Text 
                          strong={session.id === activeSessionId}
                          className={`text-sm truncate ${
                            session.id === activeSessionId ? 'text-purple-700' : 'text-gray-800'
                          }`}
                        >
                          {session.title}
                        </Text>
                        <Badge 
                          count={session.messages} 
                          size="small"
                          className="ml-2"
                          style={{ backgroundColor: session.id === activeSessionId ? '#8b5cf6' : '#6b7280' }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Text type="secondary" className="text-xs truncate mr-2">
                          {session.preview || '새로운 채팅'}
                        </Text>
                        <div className="flex items-center text-xs text-gray-400">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(session.lastActivity)}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <div className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <Text type="secondary">
                  {searchTerm ? '검색 결과가 없습니다' : '아직 채팅 세션이 없습니다'}
                </Text>
                {!searchTerm && (
                  <div className="mt-4">
                    <Button
                      type="link"
                      onClick={() => {
                        onNewSession()
                        onToggle()
                      }}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      첫 번째 채팅을 시작해보세요
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </>
  )
}

export default Sidebar