# VibeCraft 프로젝트 현황 가이드

## 📋 프로젝트 개요

VibeCraft는 자연어 프롬프트를 통해 데이터 시각화 대시보드를 생성하는 시스템입니다. **React/TypeScript 클라이언트 중심**으로 개발되고 있으며, 고급 SSE 스트리밍 채팅 시스템과 이벤트 기반 AI 응답 처리를 포함합니다.

## 🚫 서버 폴더 사용 중단

**중요**: `server/` 폴더는 현재 사용하지 않습니다.
- 기존 Python Flask SSE 서버 코드는 유지하지만 활용하지 않음
- 모든 개발은 `client/` 폴더에서 진행
- 향후 다른 백엔드 솔루션으로 대체 예정

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

### ~~서버 (사용 중단)~~
```
server/                   # ❌ 사용 중단된 폴더
├── sse_server.py         # 기존 Flask SSE 서버
├── requirements.txt      # Python 의존성
└── venv/                 # 가상환경
```
**⚠️ 현재 사용하지 않음**: 코드는 유지하되 개발에서 제외

## 🎯 완성된 핵심 기능

### 1. **고급 SSE 이벤트 스트리밍 시스템**
- ✅ EventSource 기반 실시간 메시지 수신
- ✅ **새로운**: SSE 이벤트 파싱 (`event:`, `data:` 형식)
- ✅ **새로운**: AI 응답 실시간 수집 및 마크다운 일괄 표시
- ✅ 자동 세션 생성 및 관리
- ✅ 연결 오류 처리 및 재연결

### 2. **이벤트 기반 AI 응답 처리**
- ✅ **신규**: `event: ai` - 실시간 AI 응답 수집
- ✅ **신규**: `event: complete` - 응답 완료 처리
- ✅ **신규**: `event: menu` - 메뉴 이벤트 (현재 무시)
- ✅ **신규**: AIResponse 상태 관리
- ✅ 진행 중인 응답 실시간 표시

### 3. **세션 상태 관리 시스템**
- ✅ `FIRST_VISIT`: 최초 방문 시 Intro 표시
- ✅ `IDLE`: 새 채팅 시작 시 빈 화면 표시  
- ✅ `READY/TYPING/SENDING/RECEIVING`: 채팅 진행 상태
- ✅ localStorage 기반 세션 영속성

### 4. **채팅 목록 관리**
- ✅ 기존 세션 선택 시 해당 세션에 메시지 추가
- ✅ 새 채팅 시작 기능
- ✅ 개선된 채팅 목록 UI (카드 스타일, 텍스트 말줄임)
- ✅ 중복 ChatItem 생성 방지

### 5. **마크다운 응답 처리 시스템**
- ✅ AI 응답 실시간 누적 표시
- ✅ 완료 시 마크다운 형태로 일괄 변환
- ✅ `whitespace-pre-wrap`으로 포맷팅 유지
- ✅ 응답 중/완료 상태 구분 표시

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
  threadState: ThreadState;
  threadId: string;
  messages: SSEMessage[];
  aiResponse: AIResponse;        // 🆕 AI 응답 상태
  chatItems: ChatItem[];
  sendMessage: (message: string) => Promise<boolean>;
  connect: (threadId: string) => void;
  startNewChat: () => void;
  // ...기타 함수들
}

// 🆕 새로운 AI 응답 타입
export interface AIResponse {
  content: string;
  isComplete: boolean;
  threadId?: string;
}
```

### ThreadState 타입
```typescript
export type ThreadState =
  | "FIRST_VISIT"   // 최초 방문, Intro 표시
  | "IDLE"          // 빈 채팅 화면
  | "CONNECTING"    // 서버 연결 중
  | "READY"         // 입력 가능
  | "TYPING"        // 사용자 입력 중
  | "SENDING"       // 메시지 전송 중
  | "RECEIVING"     // 응답 수신 중
  | "ERROR";        // 오류 상태
```

## 🔧 새로운 SSE 이벤트 구조

### 지원하는 SSE 이벤트 형식

#### 1. **AI 응답 이벤트**
```
event: ai
data: 주제를 분석하고 있습니다.
```

#### 2. **완료 이벤트**
```
event: complete
data: thread-id-123
```

#### 3. **메뉴 이벤트** (현재 무시)
```
event: menu
data: 1. 데이터 로드\n2. 추가 수정\n3. 새 주제
```

### 기존 JSON 응답 구조 (하위 호환성 유지)
```json
{
  "type": "chat_response",
  "messageId": "msg_1234567890",
  "threadId": "thread_uuid",
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
- ✅ **신규**: AI 응답 중 실시간 표시 (스피너 + 진행 내용)

### 새로운 AI 응답 표시
- ✅ 응답 수신 중: 실시간으로 내용 누적 표시
- ✅ 완료 상태: 전체 응답을 마크다운 형태로 정리
- ✅ 상태 구분: 스피너와 "응답 중..." 텍스트로 진행 상태 표시

## ⚡ 실행 방법

### 클라이언트 실행 (메인)
```bash
cd client
npm install
npm run dev  # http://localhost:5173
```

### ~~서버 실행 (사용 중단)~~
```bash
# ❌ 현재 사용하지 않음
cd server
./venv/Scripts/python.exe sse_server.py
```
**⚠️ 참고**: 서버 코드는 유지하지만 현재 프로젝트에서 활용하지 않습니다.

## 🔍 주요 수정사항 (최근)

### 1. **이벤트 기반 SSE 시스템 구현** (🆕 최신)
- ✅ SSE 이벤트 파싱 로직 추가 (`event:`, `data:` 형식)
- ✅ AI 응답 실시간 수집 및 누적 표시
- ✅ `AIResponse` 상태 관리 시스템
- ✅ 마크다운 형태 일괄 응답 처리
- ✅ 기존 JSON 방식과의 하위 호환성 유지

### 2. **ChatView UI 개선** (🆕 최신)
- ✅ 진행 중인 AI 응답 실시간 표시
- ✅ 응답 완료/진행 중 상태 구분
- ✅ `aiResponse` prop 추가 및 연동
- ✅ 스피너와 진행 텍스트로 UX 개선

### 3. **useSSE 훅 대폭 개선** (🆕 최신)
- ✅ `AIResponse` 타입 및 상태 추가
- ✅ SSE 이벤트 파서 구현
- ✅ 이벤트별 처리 로직 분리
- ✅ React 상태 closure 문제 해결

### 4. 클라이언트 코드 대대적 정리
- ✅ 불필요한 코드 ~200줄 제거
- ✅ 중복 로직 제거 및 최적화
- ✅ 타입 안전성 개선

### 5. 채팅 목록 UI 완전 개선
- ✅ Ant Design List → 커스텀 div 구조
- ✅ 텍스트 오버플로우 처리
- ✅ 반응형 레이아웃

### 6. 세션 관리 로직 수정
- ✅ 기존 세션 중복 생성 방지
- ✅ ChatItem 업데이트 로직 개선
- ✅ 새 채팅 vs 기존 채팅 구분

## 🔧 문제 해결된 사항

### ❌ 기존 문제점들
1. 기존 채팅 선택 시 새 목록 생성
2. 채팅 목록 스타일 문제 (텍스트 겹침)
3. 새 채팅 버튼 미작동
4. Intro 표시 로직 오류
5. **신규**: SSE 메시지가 개별로 표시되어 산만함
6. **신규**: AI 응답을 마크다운으로 일괄 표시 필요

### ✅ 해결된 내용
1. `updateChatItem` 함수 개선으로 중복 방지
2. 커스텀 CSS로 깔끔한 목록 UI
3. `startNewChat` 함수 구현
4. ThreadState 기반 정확한 Intro 표시
5. **신규**: 이벤트 기반 SSE 파싱으로 AI 응답 실시간 수집
6. **신규**: 완료 시 마크다운 형태로 일괄 변환 표시

## 🚀 개발 가이드

### 새로운 기능 추가 시 주의사항
1. **스레드 관리**: useSSE 훅의 threadState를 먼저 확인
2. **메시지 처리**: SSEMessage 및 AIResponse 타입 준수
3. **UI 상태**: ThreadState에 따른 적절한 UI 표시
4. **로컬 저장**: localStorage 저장 로직 확인
5. **🆕 SSE 이벤트**: 새로운 이벤트 타입 추가 시 파서 로직 수정
6. **🆕 AI 응답**: aiResponse 상태 고려한 UI 설계

### 디버깅
- 브라우저 콘솔에서 SSE 연결 상태 실시간 모니터링
- **🆕**: SSE 이벤트 파싱 로그 확인 (`📨 SSE 이벤트 수신`)
- **🆕**: AI 응답 상태 변화 추적 (`aiResponse` 상태)
- localStorage에서 저장된 스레드 데이터 확인
- **⚠️**: 서버 로그는 현재 사용하지 않음 (server 폴더 비활성화)

## 🎯 핵심 성과

**고급 이벤트 기반 실시간 채팅 시스템 구축 완료**: 
- 사용자가 메시지 입력 시 자동 스레드 생성
- **🆕**: 이벤트 기반 SSE를 통한 실시간 AI 응답 수집
- **🆕**: 마크다운 형태로 일괄 응답 표시
- **🆕**: 진행 중인 AI 응답 실시간 피드백
- 스레드 기반 채팅 히스토리 관리
- 직관적인 채팅 목록 UI
- 안정적인 연결 관리 및 오류 처리

## 📝 프로젝트 현재 상태

**활성 개발**: `client/` 폴더에서 React/TypeScript 기반 개발 진행
**비활성**: `server/` 폴더는 유지하되 사용하지 않음
**완성도**: 이벤트 기반 SSE 시스템과 AI 응답 처리 완료

이제 다른 Claude 인스턴스에서도 최신 이벤트 기반 SSE 구조를 즉시 이해하고 작업을 이어받을 수 있습니다!