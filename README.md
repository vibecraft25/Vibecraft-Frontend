# VibeCraft

LLM과 MCP(Model Context Protocol) 기반으로 자연어 프롬프트만으로 10분 안에 맞춤형 데이터 시각화 대시보드를 생성하는 오픈소스 프로젝트입니다.

## 🚀 주요 기능

- **자연어 기반 요청**: "우리 회사 매출과 날씨의 상관관계를 보여줘"와 같은 자연어로 대시보드 생성
- **자동 데이터 수집**: CSV, JSON, API, 데이터베이스 등 다양한 소스에서 자동 데이터 수집
- **AI 기반 시각화**: 최적의 차트와 지도 시각화를 자동으로 생성
- **실시간 대시보드**: 10분 안에 완성되는 인터랙티브 대시보드
- **온프레미스 보안**: 모든 처리가 로컬 환경에서 실행되어 데이터 보안 보장

## 🛠 기술 스택

### Frontend

- **React 18** + TypeScript + Vite
- **UI Framework**: Ant Design + Tailwind CSS
- **Visualization**: Recharts + React Leaflet
- **Routing**: React Router
- **Real-time**: Socket.IO Client

### Backend

- **Node.js** + TypeScript + Express
- **WebSocket**: ws 라이브러리 (포트 8080)
- **Session Management**: 채팅 세션별 독립적인 MCP 클라이언트 관리
- **Process Management**: child_process로 Python MCP 클라이언트 관리
- **Real-time Communication**: 양방향 실시간 통신 및 자동 재연결

### Python MCP Client

- **Python 3.8+**
- **MCP Protocol**: Model Context Protocol
- **Data Processing**: Pandas, NumPy (예정)

## 📦 설치 및 실행

### 사전 요구사항

- Node.js 18 이상
- Python 3.8 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/MilkLotion/vibecraft.git
cd vibecraft

# 서버 설치 및 실행
cd server
npm install
npm start

# 새 터미널에서 클라이언트 실행
cd ../client
npm install
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

### MCP 채팅 테스트

```bash
# MCP WebSocket 서버 실행 (새 터미널)
cd server
npm run dev:ts

# 클라이언트에서 채팅 페이지 접속
http://localhost:5173/chat
```

## 🏗 프로젝트 구조

```
VibeCraft/
├── client/                  # React 프론트엔드
│   ├── src/
│   │   ├── components/      # 재사용 가능한 컴포넌트
│   │   │   ├── Layout.tsx      # 메인 레이아웃 (사이드바 포함)
│   │   │   ├── Sidebar.tsx     # 세션별 채팅 로그 사이드바
│   │   │   ├── PromptBox.tsx   # 프롬프트 입력 박스
│   │   │   ├── ChatComponent.tsx # MCP 채팅 메인 컴포넌트
│   │   │   ├── MessageList.tsx   # 메시지 목록 (날짜 그룹화)
│   │   │   ├── MessageInput.tsx  # 메시지 입력 컴포넌트
│   │   │   └── MessageItem.tsx   # 개별 메시지 아이템
│   │   ├── hooks/           # 커스텀 React 훅
│   │   │   └── useWebSocket.ts # WebSocket 클라이언트 훅
│   │   ├── pages/           # 페이지 컴포넌트
│   │   │   ├── MainPage.tsx    # 랜딩 페이지
│   │   │   ├── CraftPage.tsx   # 워크플로우 페이지
│   │   │   └── ChatPage.tsx    # MCP 채팅 페이지
│   │   ├── types/           # TypeScript 타입 정의
│   │   │   └── chat.types.ts   # 채팅 관련 타입
│   │   └── styles/          # 스타일 파일
│   └── package.json
├── server/                  # Node.js TypeScript 서버
│   ├── websocket-server.ts     # WebSocket 메인 서버
│   ├── chat-session-manager.ts # 채팅 세션 관리자
│   ├── mcp-client.ts          # MCP 클라이언트 관리
│   ├── types.ts               # TypeScript 타입 정의
│   ├── tsconfig.json          # TypeScript 설정
│   └── package.json
├── pmc_client.py           # Python MCP Client
├── sample/                 # 샘플 데이터
│   ├── sample_data.csv
│   └── airtravel.csv
├── documents/              # 프로젝트 문서
│   ├── project_front_guide.md
│   └── ...
└── CLAUDE.md              # Claude Code 가이드
```

## 🎯 사용 방법

### 1. 메인 페이지 (`/`)

- 그라데이션 웨이브 배경의 랜딩 페이지
- 스크롤로 4단계 가이드 섹션 확인
- 하단 고정 프롬프트 박스에 원하는 데이터 분석 주제 입력

### 2. Craft 페이지 (`/craft`)

- **Topic**: 입력된 주제 분석 및 데이터 유형 파악
- **Data**: 관련 데이터 자동 수집 및 정제
- **Build**: 최적의 차트와 대시보드 생성
- **Deploy**: 완성된 대시보드 배포 및 공유

### 3. MCP 채팅 페이지 (`/chat`)

- 독립적인 채팅 세션별 MCP 클라이언트 관리
- WebSocket 기반 실시간 양방향 통신
- 자동 재연결 및 세션 관리
- 반응형 채팅 UI 및 사이드바 세션 관리

## 🔧 개발 명령어

### 클라이언트 (React)

```bash
cd client
npm run dev          # 개발 서버 시작
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run lint         # ESLint 실행
npm run type-check   # TypeScript 타입 체크
```

### 서버 (Node.js)

```bash
cd server
npm start           # 서버 시작
npm run dev         # nodemon으로 개발 서버 시작
```

### Python MCP Client

```bash
python pmc_client.py  # 직접 실행 (테스트용)
```

## 🌐 시스템 아키텍처

```
웹 클라이언트 <--WebSocket--> Node.js 서버 <--stdin/stdout--> Python MCP Client
                                                                      ↓
                                                               MCP Servers
                                                            (DB, Git, File 등)
```

### 통신 프로토콜

- **Frontend ↔ Backend**: WebSocket (ws 라이브러리)
- **Backend ↔ MCP**: stdin/stdout
- **MCP ↔ MCP Servers**: MCP Protocol

### 상태 관리

- **Connection States**: DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, ERROR
- **MCP States**: IDLE, STARTING, READY, PROCESSING, ERROR
- **Session Management**: 독립적인 세션별 MCP 인스턴스

## 🎨 디자인 시스템

- **컬러 팔레트**: Purple to Blue 그라데이션 기반
- **UI 컴포넌트**: Ant Design 5.x
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React
- **애니메이션**: CSS transitions + FullPage.js

## 🚀 배포

- **플랫폼**: Vercel (권장)
- **자동 배포**: GitHub 연동 시 자동 배포
- **환경 변수**: LLM API 키 및 MCP 설정

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 문의

- 프로젝트 링크: [https://github.com/MilkLotion/vibecraft](https://github.com/MilkLotion/vibecraft)
- 이슈 보고: [GitHub Issues](https://github.com/MilkLotion/vibecraft/issues)

---

**VibeCraft** - AI 시대의 데이터 시각화 혁신 🎨✨
