import React from 'react'
import { useNavigate } from 'react-router-dom'
import ReactFullpage from '@fullpage/react-fullpage'
import { Typography, Card } from 'antd'
import { Database, BarChart3, Zap, Globe } from 'lucide-react'
import PromptBox from '../components/PromptBox'

const { Title, Paragraph } = Typography

const MainPage: React.FC = () => {
  const navigate = useNavigate()

  const handlePromptSubmit = (text: string) => {
    // 프롬프트 텍스트를 상태로 전달하면서 Craft 페이지로 이동
    navigate('/craft', { state: { initialPrompt: text } })
  }

  const guidesections = [
    {
      title: 'Topic',
      subtitle: '주제 설정',
      description: '자연어로 원하는 데이터 분석 주제를 입력하세요',
      icon: <Database className="w-16 h-16 text-white" />,
      example: '"매출 데이터와 계절별 트렌드 분석"',
      color: 'from-blue-500 to-purple-600'
    },
    {
      title: 'Data',
      subtitle: '데이터 수집',
      description: 'AI가 자동으로 관련 데이터를 수집하고 정제합니다',
      icon: <BarChart3 className="w-16 h-16 text-white" />,
      example: 'CSV, JSON, API 등 다양한 소스 지원',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Build',
      subtitle: '시각화 구축',
      description: '맞춤형 차트와 대시보드를 자동으로 생성합니다',
      icon: <Zap className="w-16 h-16 text-white" />,
      example: '차트, 지도, 통계 분석 자동 생성',
      color: 'from-pink-500 to-red-500'
    },
    {
      title: 'Deploy',
      subtitle: '배포 완료',
      description: '완성된 대시보드를 즉시 배포하고 공유하세요',
      icon: <Globe className="w-16 h-16 text-white" />,
      example: '원클릭 배포로 즉시 공유 가능',
      color: 'from-red-500 to-orange-500'
    }
  ]

  return (
    <div className="relative h-screen">
      <ReactFullpage
        licenseKey={'YOUR_KEY_HERE'}
        scrollingSpeed={1000}
        navigation={true}
        navigationPosition="right"
        render={() => (
          <ReactFullpage.Wrapper>
            {/* Hero Section */}
            <div className="section">
              <div className="wave-animation h-full flex items-center justify-center relative">
                <div className="text-center text-white z-10 px-4">
                  <Title level={1} className="text-white mb-6 text-4xl md:text-6xl font-bold">
                    VibeCraft
                  </Title>
                  <Paragraph className="text-white/90 text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
                    LLM과 MCP 기반으로 자연어 프롬프트만으로 
                    <br />
                    10분 안에 맞춤형 데이터 시각화 대시보드를 만들어보세요
                  </Paragraph>
                  <div className="text-white/80 text-lg">
                    아래로 스크롤하여 더 자세한 가이드를 확인하세요 ↓
                  </div>
                </div>
              </div>
            </div>

            {/* Guide Sections */}
            {guidesections.map((section, index) => (
              <div key={index} className="section">
                <div className={`bg-gradient-to-br ${section.color} h-full flex items-center justify-center px-4`}>
                  <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                    <div className="text-center md:text-left">
                      <div className="flex justify-center md:justify-start mb-6">
                        {section.icon}
                      </div>
                      <Title level={2} className="text-white mb-4">
                        {section.title}
                      </Title>
                      <Title level={3} className="text-white/90 mb-6 font-normal">
                        {section.subtitle}
                      </Title>
                      <Paragraph className="text-white/80 text-lg mb-6">
                        {section.description}
                      </Paragraph>
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                        <Paragraph className="text-white/90 text-sm mb-0">
                          예시: {section.example}
                        </Paragraph>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <Card 
                        className="w-80 h-60 bg-white/10 backdrop-blur-md border-white/20"
                        bodyStyle={{ 
                          padding: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%'
                        }}
                      >
                        <div className="text-center text-white">
                          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <div className="text-2xl">🎯</div>
                          </div>
                          <Paragraph className="text-white/90 mb-0">
                            Sample GIF Placeholder
                          </Paragraph>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ReactFullpage.Wrapper>
        )}
      />
      
      {/* Fixed Prompt Box */}
      <PromptBox onSubmit={handlePromptSubmit} />
    </div>
  )
}

export default MainPage