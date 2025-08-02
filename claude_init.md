# VibeCraft 완성된 실시간 SSE 채팅 시스템 가이드

## 📋 프로젝트 개요

VibeCraft는 자연어 프롬프트를 통해 데이터 시각화 대시보드를 생성하는 시스템으로, **완성된 실시간 SSE 채팅 시스템**을 포함합니다. React/TypeScript 클라이언트와 Python Flask SSE 서버로 구성되어 있습니다.

## 🏗 프로젝트 구조

### 클라이언트 (React/TypeScript)
```
client/src/
├── pages/
│   ├── MainPage.tsx      # 메인 페이지 (Intro 컴포넌트 포함)
│   ├── ChatPage.tsx      # 채팅 전용 페이지
│   └── CraftPage.tsx     # 데이터 시각화 페이지
├── components/
│   ├── Layout.tsx        # 레이아웃 + 사이드바
│   ├── Sidebar.tsx       # 사이드바 컴포넌트  
│   ├── Chattings.tsx     # 채팅 목록 (개선된 스타일)
│   ├── ChatView.tsx      # 통합된 채팅 UI
│   ├── PromptBox.tsx     # 메시지 입력창
│   └── Intro.tsx         # 최초 방문 소개 화면
├── hooks/
│   └── useSSE.ts         # SSE 연결 & 세션 관리 훅
├── types/
│   └── session.ts        # 세션 상태 타입 정의
└── styles/
    └── index.css         # CSS 유틸리티 (line-clamp)
```

### 서버 (Python Flask)
```
server/
├── sse_server.py         # SSE 서버 구현체
├── requirements.txt      # 의존성
└── venv/                 # 가상환경
```

## 🎯 완성된 핵심 기능

### 1. **완전한 SSE 스트리밍 채팅 시스템**
- ✅ EventSource 기반 실시간 메시지 수신
- ✅ 자동 세션 생성 및 관리
- ✅ 순차적 메시지 스트리밍 처리
- ✅ 연결 오류 처리 및 재연결

### 2. **세션 상태 관리 시스템**
- ✅ `FIRST_VISIT`: 최초 방문 시 Intro 표시
- ✅ `IDLE`: 새 채팅 시작 시 빈 화면 표시  
- ✅ `READY/TYPING/SENDING/RECEIVING`: 채팅 진행 상태
- ✅ localStorage 기반 세션 영속성

### 3. **채팅 목록 관리**
- ✅ 기존 세션 선택 시 해당 세션에 메시지 추가
- ✅ 새 채팅 시작 기능
- ✅ 개선된 채팅 목록 UI (카드 스타일, 텍스트 말줄임)
- ✅ 중복 ChatItem 생성 방지

### 4. **메시지 처리 시스템**
- ✅ 사용자 메시지 즉시 표시
- ✅ 서버 응답 실시간 스트리밍
- ✅ 메시지 히스토리 localStorage 저장
- ✅ 세션별 메시지 관리

## 🔄 데이터 플로우

### 새 채팅 시작
```
1. startNewChat() → 상태 초기화 (IDLE)
2. 사용자 메시지 입력 → sendMessage()
3. POST /chat (sessionId: null) → 서버에서 새 세션 생성
4. setupEventSource() → SSE 연결 시작
5. 실시간 응답 수신 → ChatView 업데이트
6. ChatItem 생성 → 채팅 목록에 추가
```

### 기존 채팅 선택
```
1. 채팅 목록 클릭 → connect(sessionId)
2. localStorage에서 메시지 로드 → ChatView 표시
3. 새 메시지 입력 → 기존 세션에 추가
4. ChatItem 업데이트 (새 항목 생성 안함)
```

## 🔧 핵심 컴포넌트 구조

### useSSE Hook
```typescript
export interface UseSSEReturn {
  connectionState: SSEConnectionState;
  sessionState: SessionState;
  sessionId: string;
  messages: SSEMessage[];
  chatItems: ChatItem[];
  sendMessage: (message: string) => Promise<boolean>;
  connect: (sessionId: string) => void;
  startNewChat: () => void;
  // ...기타 함수들
}
```

### SessionState 타입
```typescript
export type SessionState =
  | "FIRST_VISIT"   // 최초 방문, Intro 표시
  | "IDLE"          // 빈 채팅 화면
  | "CONNECTING"    // 서버 연결 중
  | "READY"         // 입력 가능
  | "TYPING"        // 사용자 입력 중
  | "SENDING"       // 메시지 전송 중
  | "RECEIVING"     // 응답 수신 중
  | "ERROR";        // 오류 상태
```

## 🔧 서버 구현 상세

### 주요 엔드포인트
- `POST /chat`: 메시지 전송 및 세션 관리
- `GET /events/{sessionId}`: SSE 연결
- `GET /sessions/{sessionId}/messages`: 채팅 기록 조회

### SSE 응답 구조
```json
{
  "type": "chat_response",
  "messageId": "msg_1234567890",
  "sessionId": "session_uuid",
  "content": "AI 응답 내용",
  "timestamp": "2024-01-30T10:30:00Z",
  "sequence": 1,
  "total": 3,
  "originalMessage": "사용자 입력 메시지"
}
```

## 🎨 UI/UX 개선사항

### 채팅 목록 스타일링
- ✅ 카드 형태의 목록 아이템
- ✅ 적절한 패딩과 마진 (`mx-3 px-3 py-3`)
- ✅ 2줄 텍스트 말줄임 (`.line-clamp-2`)
- ✅ 호버 효과 및 선택 상태 표시

### 상태별 UI 피드백
- ✅ FIRST_VISIT: Intro 컴포넌트 표시
- ✅ IDLE: "새로운 채팅을 시작하세요" 안내
- ✅ CONNECTING: 연결 중 스피너
- ✅ ERROR: 오류 메시지 및 새로고침 버튼

## ⚡ 실행 방법

### 클라이언트 실행
```bash
cd client
npm install
npm run dev  # http://localhost:5173
```

### 서버 실행
```bash
cd server
# Windows venv 활성화
./venv/Scripts/python.exe sse_server.py
# 또는 Linux/Mac
source venv/bin/activate && python sse_server.py
```

## 🔍 주요 수정사항 (최근)

### 1. SSE 스트리밍 완전 구현
- ✅ EventSource 연결 및 실시간 메시지 처리
- ✅ 순차적 메시지 전송 시스템

### 2. 클라이언트 코드 대대적 정리
- ✅ 불필요한 코드 ~200줄 제거
- ✅ 중복 로직 제거 및 최적화
- ✅ 타입 안전성 개선

### 3. 채팅 목록 UI 완전 개선
- ✅ Ant Design List → 커스텀 div 구조
- ✅ 텍스트 오버플로우 처리
- ✅ 반응형 레이아웃

### 4. 세션 관리 로직 수정
- ✅ 기존 세션 중복 생성 방지
- ✅ ChatItem 업데이트 로직 개선
- ✅ 새 채팅 vs 기존 채팅 구분

## 🔧 문제 해결된 사항

### ❌ 기존 문제점들
1. 기존 채팅 선택 시 새 목록 생성
2. 채팅 목록 스타일 문제 (텍스트 겹침)
3. 새 채팅 버튼 미작동
4. Intro 표시 로직 오류

### ✅ 해결된 내용
1. `updateChatItem` 함수 개선으로 중복 방지
2. 커스텀 CSS로 깔끔한 목록 UI
3. `startNewChat` 함수 구현
4. SessionState 기반 정확한 Intro 표시

## 🚀 개발 가이드

### 새로운 기능 추가 시 주의사항
1. **세션 관리**: useSSE 훅의 세션 상태를 먼저 확인
2. **메시지 처리**: SSEMessage 타입 준수
3. **UI 상태**: SessionState에 따른 적절한 UI 표시
4. **로컬 저장**: localStorage 저장 로직 확인

### 디버깅
- 브라우저 콘솔에서 SSE 연결 상태 실시간 모니터링
- 서버 로그에서 세션 생성 및 메시지 처리 확인
- localStorage에서 저장된 세션 데이터 확인

## 🎯 핵심 성과

**완전한 실시간 채팅 시스템 구축 완료**: 
- 사용자가 메시지 입력 시 자동 세션 생성
- SSE를 통한 실시간 응답 수신
- 세션 기반 채팅 히스토리 관리
- 직관적인 채팅 목록 UI
- 안정적인 연결 관리 및 오류 처리

이제 다른 Claude 인스턴스에서도 즉시 작업을 이어받을 수 있는 완성된 상태입니다!