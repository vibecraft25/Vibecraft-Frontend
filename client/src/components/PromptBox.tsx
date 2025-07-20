import React, { useState } from 'react'
import { Input, Button } from 'antd'
import { Send, Sparkles } from 'lucide-react'

interface PromptBoxProps {
  onSubmit: (text: string) => void
  placeholder?: string
  loading?: boolean
}

const PromptBox: React.FC<PromptBoxProps> = ({ 
  onSubmit, 
  placeholder = "어떤 데이터를 시각화하고 싶으신가요? (예: 우리 회사 매출과 날씨의 상관관계를 보여줘)", 
  loading = false 
}) => {
  const [inputText, setInputText] = useState('')

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmit(inputText.trim())
      setInputText('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4 z-50">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl prompt-box-shadow p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <Input.TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              autoSize={{ minRows: 1, maxRows: 4 }}
              className="border-0 bg-transparent resize-none text-gray-700 placeholder-gray-400"
              style={{ 
                boxShadow: 'none',
                fontSize: '16px',
                lineHeight: '1.5'
              }}
            />
          </div>
          <div className="flex-shrink-0">
            <Button
              type="primary"
              icon={<Send className="w-4 h-4" />}
              onClick={handleSubmit}
              loading={loading}
              disabled={!inputText.trim()}
              className="h-10 px-4 bg-gradient-to-r from-purple-500 to-blue-500 border-0 rounded-xl hover:from-purple-600 hover:to-blue-600"
            >
              전송
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromptBox