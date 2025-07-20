# VibeCraft 프로젝트 구조

## 전체 프로젝트 아키텍처

```
VibeCraft/
├── client/                     # React 프론트엔드
├── server/                     # Node.js TypeScript 서버
├── documents/                  # 프로젝트 문서
├── pmc_client.py              # Python MCP 클라이언트
└── sample/                    # 샘플 데이터
```

## 1. 클라이언트 구조 (`client/`)

### 페이지 구성

**Main Page (`/`)**:
- Gradation wave background with FullPage.js
- Landing page with scrollable guide sections
- Fixed prompt box at bottom
- Four guide sections with sample content (Topic → Data → Build → Deploy)

**Craft Page (`/craft`)**:
- Four sequential workflow sections: Topic - Data - Build - Deploy
- Large circular design connected by gradient circles (make.com style)
- Sequential execution (next section unlocks after previous completion)
- Fixed prompt box with input history
- Integrated with sidebar layout

**Chat Page (`/chat`)**: ✨ **새로 추가**
- Real-time MCP communication interface
- WebSocket-based bidirectional communication
- Session-based independent MCP client management
- Responsive chat UI with message management

### 컴포넌트 구조

```
src/
├── components/
│   ├── Layout.tsx              # Main layout with sidebar
│   ├── Sidebar.tsx             # Session-based chat log sidebar
│   ├── PromptBox.tsx           # Fixed prompt input box
│   ├── ChatComponent.tsx       # Main MCP chat component
│   ├── MessageList.tsx         # Message list with date grouping
│   ├── MessageInput.tsx        # Message input component
│   └── MessageItem.tsx         # Individual message item
├── hooks/
│   └── useWebSocket.ts         # WebSocket client hook
├── pages/
│   ├── MainPage.tsx            # Landing page
│   ├── CraftPage.tsx           # Workflow page
│   └── ChatPage.tsx            # MCP chat page
├── types/
│   └── chat.types.ts           # Chat-related TypeScript types
└── styles/
    └── index.css               # Global styles
```

### 기술 구성

- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: Ant Design + TailwindCSS
- **Design Reference**: make.com style
- **Routing**: React Router
- **Real-time**: WebSocket (ws library)
- **State Management**: React Hooks
- **Icons**: Lucide React

## 2. 서버 구조 (`server/`)

### 아키텍처 패턴

```
WebSocket Server (포트 8080)
├── Session Manager: 채팅 세션별 독립적 관리
├── MCP Client Manager: Python 프로세스 관리
└── Real-time Communication: 양방향 WebSocket 통신
```

### 파일 구조

```
server/
├── websocket-server.ts         # Main WebSocket server
├── chat-session-manager.ts     # Chat session lifecycle manager
├── mcp-client.ts              # MCP client process manager
├── types.ts                   # TypeScript type definitions
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies and scripts
```

### 핵심 기능

**WebSocket Server**:
- Express + WebSocket integration
- Connection pooling and rate limiting (30 msg/min)
- Session mapping and broadcasting
- Automatic reconnection handling

**Session Manager**:
- Independent session state management
- LangChain ConversationBufferMemory integration
- Automatic memory cleanup (token-based)
- Inactive session cleanup (1-hour timeout)

**MCP Client Manager**:
- Per-session independent MCP client creation
- Python process spawn and stdio communication
- Automatic restart and error recovery
- Heartbeat-based health checking

### API 엔드포인트

- `GET /health`: Server status and statistics
- `GET /sessions`: Session statistics
- `GET /connections`: Connection status
- `WebSocket /ws`: Real-time communication

## 3. 통신 프로토콜

### WebSocket 메시지 타입

```typescript
// Client → Server
interface WebSocketMessage {
  type: 'join_chat' | 'chat_message' | 'leave_chat';
  sessionId: string;
  content?: string;
  userId?: string;
}

// Server → Client
interface WebSocketResponse {
  type: 'joined' | 'chat_response' | 'left' | 'error' | 'session_created';
  sessionId: string;
  content?: string;
  message?: string;
  timestamp?: string;
}
```

### 데이터 플로우

```
1. User Input → React Component
2. WebSocket → Node.js Server
3. Session Manager → MCP Client
4. Python Process → MCP Servers
5. Response → Session Manager
6. WebSocket → React Component
7. UI Update → User Interface
```

## 4. 상태 관리

### Connection States
- `DISCONNECTED`: 연결 끊김
- `CONNECTING`: 연결 중
- `CONNECTED`: 연결 완료
- `RECONNECTING`: 재연결 중
- `ERROR`: 연결 오류

### Session States
- `ACTIVE`: 활성 세션
- `INACTIVE`: 비활성 세션
- `EXPIRED`: 만료된 세션

### Message States
- `SENDING`: 전송 중
- `SENT`: 전송 완료
- `DELIVERED`: 전달 완료
- `ERROR`: 전송 실패

## 5. 반응형 디자인

### 브레이크포인트
- **Mobile**: < 1024px (Drawer sidebar)
- **Desktop**: ≥ 1024px (Collapsible sidebar)

### 레이아웃 특징
- **Sidebar**: 16px ↔ 320px (collapsible)
- **Mobile**: Drawer with overlay
- **Chat UI**: Fully responsive message interface
- **Prompt Box**: Fixed positioning across all pages

## 6. 성능 최적화

### 클라이언트
- React.memo for component optimization
- useCallback for function memoization
- Virtual scrolling preparation for large message lists
- Message caching per session

### 서버
- Connection pooling
- Rate limiting (30 messages/minute)
- Memory usage monitoring
- Message queuing and backpressure handling

## 7. 에러 처리

### 다단계 복구 메커니즘
1. **Retry**: 메시지 재전송
2. **Reconnect**: WebSocket 재연결
3. **Restart**: MCP 클라이언트 재시작
4. **Session Reset**: 세션 초기화

### 사용자 피드백
- Connection status indicators
- Message status icons
- Error notifications with retry options
- Loading states and animations

---

*마지막 업데이트: 2025-07-20*
