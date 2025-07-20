# MCP 시스템 기술 가이드

## 📋 시스템 개요

Python MCP Client(PMC)와 웹페이지 간 실시간 대화 시스템 구현 가이드입니다.

### 시스템 아키텍처

```
웹 클라이언트 <--WebSocket--> Node.js 서버 <--stdin/stdout--> Python MCP Client
                                                                      ↓
                                                               MCP Servers
                                                            (DB, Git, File 등)
```

## 🛠 기술 스택 및 요구사항

### 프론트엔드
- **필수**: React 18+ with TypeScript + Vite
- **통신**: WebSocket Client
- **UI**: Ant Design + TailwindCSS
- **상태관리**: React Hooks
- **아이콘**: Lucide React

### 백엔드
- **서버**: Node.js 18+ with TypeScript + Express
- **통신**: WebSocket Server (ws 라이브러리)
- **프로세스**: child_process.spawn()
- **스트림**: stdin/stdout 처리

## 🔧 핵심 구현 가이드

### 1. 프로세스 관리 (Node.js)

```typescript
// MCP 클라이언트 생성
const process = spawn('python', [this.pythonScriptPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});
```

### 2. WebSocket 이벤트 정의

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `join_chat` | Client → Server | 채팅 세션 참여 |
| `chat_message` | Client → Server | 메시지 전송 |
| `leave_chat` | Client → Server | 채팅 나가기 |
| `joined` | Server → Client | 참여 완료 |
| `chat_response` | Server → Client | AI 응답 수신 |
| `left` | Server → Client | 나가기 완료 |
| `error` | Server → Client | 오류 발생 |
| `session_created` | Server → Client | 새 세션 생성 |

### 3. 상태 관리

**연결 상태**:
- `DISCONNECTED`: 연결 끊김
- `CONNECTING`: 연결 중
- `CONNECTED`: 연결 완료
- `RECONNECTING`: 재연결 중
- `ERROR`: 연결 오류

**MCP 상태**:
- `IDLE`: 유휴 상태
- `STARTING`: 시작 중
- `READY`: 준비 완료
- `PROCESSING`: 처리 중
- `ERROR`: 오류 상태

**메시지 상태**:
- `SENDING`: 전송 중
- `SENT`: 전송 완료
- `DELIVERED`: 전달 완료
- `ERROR`: 전송 실패

## 🏗 개발 프로세스

### Phase 1: 기본 구조 ✅ 완료
1. Node.js 서버 설정 (Express + WebSocket)
2. React 프론트엔드 설정 (TypeScript + Vite + WebSocket Client)
3. MCP 프로세스 생성 및 관리

### Phase 2: 통신 구현 ✅ 완료
1. WebSocket 연결 구현
2. MCP stdin/stdout 처리
3. 이벤트 기반 메시지 전달

### Phase 3: UI/UX 구현 ✅ 완료
1. 채팅 인터페이스 구현
2. 실시간 상태 표시
3. 오류 처리 및 재시도 메커니즘

### Phase 4: 최적화 ✅ 완료
1. 연결 안정성 개선 (자동 재연결)
2. 오류 복구 메커니즘 (다단계 복구)
3. 성능 최적화 (Rate limiting, 메모리 관리)

## 📁 파일 구조

### 서버 (`server/`)
```
server/
├── websocket-server.ts      # WebSocket 메인 서버
├── chat-session-manager.ts  # 채팅 세션 관리자
├── mcp-client.ts           # MCP 클라이언트 관리
├── types.ts                # TypeScript 타입 정의
├── tsconfig.json           # TypeScript 설정
└── package.json            # 의존성 및 스크립트
```

### 클라이언트 (`client/src/`)
```
client/src/
├── components/
│   ├── ChatComponent.tsx     # 메인 채팅 컴포넌트
│   ├── MessageList.tsx       # 메시지 목록
│   ├── MessageInput.tsx      # 메시지 입력
│   ├── MessageItem.tsx       # 개별 메시지
│   ├── Layout.tsx           # 메인 레이아웃
│   └── Sidebar.tsx          # 세션 사이드바
├── hooks/
│   └── useWebSocket.ts       # WebSocket 훅
├── pages/
│   └── ChatPage.tsx          # 채팅 페이지
├── types/
│   └── chat.types.ts         # 채팅 관련 타입
└── styles/
    └── index.css             # 글로벌 스타일
```

## ⚠️ 주요 고려사항

### 안정성
- ✅ MCP 프로세스 재시작 메커니즘
- ✅ WebSocket 재연결 처리 (최대 5회, 3초 간격)
- ✅ 오류 상황 복구 (다단계 에러 처리)

### 성능
- ✅ 메시지 큐잉 시스템 (연결 끊김 시 대기)
- ✅ 하트비트 최적화 (30초 간격)
- ✅ 메모리 관리 (세션별 자동 정리)

### 보안
- ✅ Rate limiting (분당 30개 메시지)
- ✅ 입력 검증 및 메시지 길이 제한
- ✅ CORS 설정 (localhost만 허용)

## 🚀 실행 가이드

### 개발 환경 실행
```bash
# 서버 실행 (포트 8080)
cd server
npm install
npm run dev:ts

# 클라이언트 실행 (포트 5173)
cd client
npm install
npm run dev

# 브라우저 접속
http://localhost:5173/chat
```

### API 엔드포인트
- **WebSocket**: `ws://localhost:8080/ws`
- **헬스체크**: `http://localhost:8080/health`
- **세션 통계**: `http://localhost:8080/sessions`
- **연결 상태**: `http://localhost:8080/connections`

## 🔍 모니터링

### 서버 통계 확인
```bash
# 서버 상태
curl http://localhost:8080/health

# 세션 정보
curl http://localhost:8080/sessions

# 연결 상태
curl http://localhost:8080/connections
```

### 로그 모니터링
- 서버 콘솔에서 실시간 로그 확인
- WebSocket 연결/해제 로그
- MCP 프로세스 상태 로그
- 에러 및 복구 로그

## 🐛 문제 해결

### 연결 문제
1. 서버가 8080 포트에서 실행 중인지 확인
2. 방화벽 설정 확인
3. WebSocket 연결 로그 확인

### MCP 클라이언트 문제
1. Python 스크립트 경로 확인 (`pmc_client.py`)
2. Python 의존성 설치 확인
3. 서버 로그에서 MCP 에러 확인

### 성능 문제
1. 메모리 사용량 모니터링
2. 세션 수 확인
3. Rate limiting 상태 확인

---

*마지막 업데이트: 2025-07-20*