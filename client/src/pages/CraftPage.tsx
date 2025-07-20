import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Typography, Progress, Card, Button, List } from 'antd'
import { Check, Database, BarChart3, Zap, Globe, Clock } from 'lucide-react'
import PromptBox from '../components/PromptBox'

const { Title, Paragraph } = Typography

interface Section {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  status: 'pending' | 'active' | 'completed'
  color: string
  description: string
}

const CraftPage: React.FC = () => {
  const location = useLocation()
  const initialPrompt = location.state?.initialPrompt || ''
  
  const [sections, setSections] = useState<Section[]>([
    {
      id: 'topic',
      title: 'Topic',
      subtitle: '주제 분석',
      icon: <Database className="w-12 h-12" />,
      status: 'active',
      color: 'from-blue-500 to-purple-600',
      description: '입력된 주제를 분석하고 필요한 데이터 유형을 파악합니다'
    },
    {
      id: 'data',
      title: 'Data',
      subtitle: '데이터 수집',
      icon: <BarChart3 className="w-12 h-12" />,
      status: 'pending',
      color: 'from-purple-500 to-pink-500',
      description: '관련 데이터를 자동으로 수집하고 정제합니다'
    },
    {
      id: 'build',
      title: 'Build',
      subtitle: '시각화 구축',
      icon: <Zap className="w-12 h-12" />,
      status: 'pending',
      color: 'from-pink-500 to-red-500',
      description: '최적의 차트와 대시보드를 생성합니다'
    },
    {
      id: 'deploy',
      title: 'Deploy',
      subtitle: '배포 완료',
      icon: <Globe className="w-12 h-12" />,
      status: 'pending',
      color: 'from-red-500 to-orange-500',
      description: '완성된 대시보드를 배포하고 공유링크를 생성합니다'
    }
  ])

  const [currentStep, setCurrentStep] = useState(0)
  const [promptHistory, setPromptHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialPrompt) {
      setPromptHistory([initialPrompt])
      // 첫 번째 섹션 시작
      simulateProgress()
    }
  }, [initialPrompt])

  const simulateProgress = async () => {
    setLoading(true)
    
    // Topic 섹션 완료
    await new Promise(resolve => setTimeout(resolve, 2000))
    updateSectionStatus(0, 'completed')
    setCurrentStep(1)
    updateSectionStatus(1, 'active')
    
    // Data 섹션 완료
    await new Promise(resolve => setTimeout(resolve, 3000))
    updateSectionStatus(1, 'completed')
    setCurrentStep(2)
    updateSectionStatus(2, 'active')
    
    // Build 섹션 완료
    await new Promise(resolve => setTimeout(resolve, 4000))
    updateSectionStatus(2, 'completed')
    setCurrentStep(3)
    updateSectionStatus(3, 'active')
    
    // Deploy 섹션 완료
    await new Promise(resolve => setTimeout(resolve, 2000))
    updateSectionStatus(3, 'completed')
    
    setLoading(false)
  }

  const updateSectionStatus = (index: number, status: 'pending' | 'active' | 'completed') => {
    setSections(prev => prev.map((section, i) => 
      i === index ? { ...section, status } : section
    ))
  }

  const handlePromptSubmit = (text: string) => {
    setPromptHistory(prev => [...prev, text])
    // 새로운 프롬프트 처리 로직
  }

  const getSectionStyle = (section: Section, index: number) => {
    const baseClasses = "w-32 h-32 md:w-40 md:h-40 rounded-full flex flex-col items-center justify-center text-white transition-all duration-500 cursor-pointer transform hover:scale-105"
    
    switch (section.status) {
      case 'completed':
        return `${baseClasses} bg-gradient-to-br from-green-400 to-green-600 section-circle`
      case 'active':
        return `${baseClasses} bg-gradient-to-br ${section.color} section-circle animate-pulse`
      default:
        return `${baseClasses} bg-gray-300 opacity-50`
    }
  }

  const ConnectorDots = ({ active }: { active: boolean }) => (
    <div className="flex items-center gap-2 mx-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            active 
              ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
              : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  )

  return (
    <div className="min-h-full bg-gray-50 pb-32 overflow-y-auto">
      {/* Header */}
      <div className="bg-white shadow-sm p-6">
        <div className="max-w-6xl mx-auto">
          <Title level={2} className="mb-2">VibeCraft Dashboard</Title>
          <Progress 
            percent={((currentStep + 1) / sections.length) * 100} 
            strokeColor={{
              '0%': '#667eea',
              '100%': '#764ba2',
            }}
            className="mb-4"
          />
          <Paragraph className="text-gray-600 mb-0">
            현재 진행 상황: {sections[currentStep]?.subtitle || '완료'}
          </Paragraph>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Workflow Sections */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
          {sections.map((section, index) => (
            <React.Fragment key={section.id}>
              <div className="flex flex-col items-center">
                <div className={getSectionStyle(section, index)}>
                  {section.status === 'completed' ? (
                    <Check className="w-16 h-16 text-white mb-2" />
                  ) : (
                    <div className="text-center">
                      {section.icon}
                    </div>
                  )}
                  <div className="text-center mt-2">
                    <div className="font-bold text-sm">{section.title}</div>
                    <div className="text-xs opacity-90">{section.subtitle}</div>
                  </div>
                </div>
                
                {/* Section Status Card */}
                <Card 
                  className="mt-4 w-64" 
                  size="small"
                  bodyStyle={{ padding: '12px' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      section.status === 'completed' ? 'bg-green-500' :
                      section.status === 'active' ? 'bg-blue-500 animate-pulse' :
                      'bg-gray-300'
                    }`} />
                    <span className="font-medium text-sm">
                      {section.status === 'completed' ? '완료' :
                       section.status === 'active' ? '진행 중' : '대기 중'}
                    </span>
                    {section.status === 'active' && (
                      <Clock className="w-4 h-4 text-blue-500 ml-auto" />
                    )}
                  </div>
                  <Paragraph className="text-xs text-gray-600 mb-0">
                    {section.description}
                  </Paragraph>
                </Card>
              </div>
              
              {/* Connector */}
              {index < sections.length - 1 && (
                <div className="hidden md:block">
                  <ConnectorDots active={index < currentStep} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Prompt History */}
        {promptHistory.length > 0 && (
          <Card 
            title="프롬프트 히스토리" 
            className="mb-6"
            extra={
              <Button 
                type="link" 
                size="small"
                onClick={() => setPromptHistory([])}
              >
                지우기
              </Button>
            }
          >
            <List
              dataSource={promptHistory}
              renderItem={(item, index) => (
                <List.Item>
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <Paragraph className="mb-0 text-sm">{item}</Paragraph>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* Current Step Details */}
        {currentStep < sections.length && (
          <Card 
            title={`현재 단계: ${sections[currentStep].title}`}
            className="mb-6"
          >
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${sections[currentStep].color} flex items-center justify-center`}>
                {sections[currentStep].icon}
              </div>
              <div className="flex-1">
                <Title level={4} className="mb-2">
                  {sections[currentStep].subtitle}
                </Title>
                <Paragraph className="mb-0">
                  {sections[currentStep].description}
                </Paragraph>
              </div>
              {loading && currentStep < sections.length && (
                <div className="text-blue-500">
                  <Clock className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Fixed Prompt Box */}
      <PromptBox 
        onSubmit={handlePromptSubmit}
        placeholder="추가 요청이나 수정사항을 입력하세요..."
      />
    </div>
  )
}

export default CraftPage