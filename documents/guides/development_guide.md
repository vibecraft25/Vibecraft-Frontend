# VibeCraft 개발 가이드

## 📋 프로젝트 규칙

### 1. 개발 및 진행 규칙

- 모든 작업 및 커뮤니케이션은 한국어로 진행한다.
- 주요 변경사항, 결정사항, 진행상황은 이 문서에 기록한다.
- 각 단계별로 명확한 목표와 산출물을 정의한다.
- 작업 전 반드시 본 문서를 참고한다.

### 2. 프로젝트 주요 프로세스

1. **주제 기반 데이터 수집 및 수집된 데이터 확인**
   - 사용자는 인증이 필요 없는 공개 샘플 데이터(csv 등)를 sample 폴더에 저장하도록 assistant에게 명령함.
   - assistant는 다음과 같이 진행함:
     1. 사용자가 원하는 데이터 장르(예: 대한민국 식물상 데이터)로 공개 샘플 데이터 다운로드 시도
     2. 인증 또는 직접 다운로드가 필요한 경우, 대체로 인증이 필요 없는 공개 샘플 데이터(예: 표 데이터, 항공여행 데이터 등)를 sample 폴더에 직접 생성하여 저장
     3. sample 폴더 내 csv 파일을 데이터 관리 및 후속 작업(시각화, DB 생성 등)에 활용
   - 데이터 예시: sample/sample_data.csv, sample/airtravel.csv

2. **DB 생성 및 사용자 커스텀 기능**
   - 수집 데이터 기반 DB 생성
   - DB 시각화 및 사용자 커스텀을 위한 프론트엔드 뷰 제공

3. **웹 프론트엔드 제작**
   - Claude, Cursor 등 LLM 활용
   - 사용자 친화적 UI/UX 설계

4. **Git Workflow 자동화**
   - LLM을 활용한 git workflow 자동화

5. **Vercel 자동 배포**
   - git 소스 push 이후 Vercel 자동화

6. **(선택) 사용자 완성 페이지 확인 기능**

### 3. 기술 스택 및 도구

**현재 기술 스택**:
- **LLM**: Gemini, Claude, 기타 필요시 추가
- **프론트엔드**: React 18 + TypeScript + Vite
- **UI 라이브러리**: Ant Design + TailwindCSS
- **백엔드**: Node.js + TypeScript + Express
- **실시간 통신**: WebSocket (ws 라이브러리)
- **배포**: Vercel
- **버전 관리**: Git, GitHub

### 4. 샘플 데이터 관리

- 인증이 필요 없는 공개 샘플 데이터(csv 등)는 sample 폴더에 저장하여 관리한다.
- 예시: sample/sample_data.csv, sample/airtravel.csv
- 데이터 활용 시 출처 또는 생성 방식을 명시한다.

### 5. 개발 환경 설정

**Claude Code 설정**:
- WSL을 사용하여 claude code 실행
- Node.js 22.x 설치:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs
sudo npm install -g @anthropic-ai/claude-code
```

**현재 구현된 기능**:
1. **WebSocket Hook** (`client/src/hooks/useWebSocket.ts`):
   - WebSocket 클라이언트 연결 관리
   - 자동 재연결 및 상태 관리 (DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, ERROR)
   - 메시지 송수신 처리

2. **채팅 컴포넌트들**:
   - `ChatComponent.tsx`: 메인 MCP 채팅 인터페이스
   - `MessageList.tsx`: 날짜별 메시지 그룹화 및 자동 스크롤
   - `MessageInput.tsx`: 실시간 메시지 입력 컴포넌트
   - `MessageItem.tsx`: 개별 메시지 아이템

3. **서버 시스템**:
   - WebSocket 서버 (포트 8080)
   - 채팅 세션별 독립적인 MCP 클라이언트 관리
   - LangChain 메모리 통합

**실행 방법**:
```bash
# 서버 실행
cd server && npm run dev:ts

# 클라이언트 실행
cd client && npm run dev

# 브라우저 접속
http://localhost:5173/chat
```

---

## 👨‍💻 어시스턴트 가이드

### 목적
- 프로젝트 진행 시 이전 작업과의 충돌을 방지하고, 전체 구조와 컨텍스트를 명확히 파악하기 위한 가이드입니다.
- assistant가 일관성 있게 작업을 이어갈 수 있도록 참고용으로 사용합니다.

### 참고 문서
- 반드시 이 개발 가이드를 최우선으로 참고한다.
- 주요 결정, 규칙, 프로세스, 기술 스택 등은 이 문서에 기록되어 있으니, 변경/추가 시 동기화한다.

### 작업 진행 원칙

1. **컨텍스트 유지**
   - 이전 작업 내역, 결정사항, 규칙을 항상 인지하고 반영한다.
   - 작업 전, 관련 문서와 기존 코드/구조를 확인한다.

2. **충돌 방지**
   - 새로운 작업이 기존 코드, 규칙, 구조와 충돌하지 않도록 주의한다.
   - 변경이 필요한 경우, 반드시 사유와 변경 내역을 문서에 기록한다.

3. **구조 파악**
   - 프로젝트의 전체 구조(폴더, 파일, 주요 흐름 등)를 파악하고, 작업 시 구조를 해치지 않도록 한다.
   - 구조 변경 시, 변경 전후 구조를 명확히 문서화한다.

4. **일관성 유지**
   - 코드 스타일, 네이밍, 문서화 등에서 일관성을 유지한다.
   - 기존 규칙과 다를 경우, 반드시 사유를 명시한다.

5. **문서화**
   - 주요 작업, 결정, 변경사항은 반드시 문서로 남긴다.
   - 문서화는 해당 문서 또는 work history에 기록한다.

### assistant의 기본 행동 지침
- 작업 전 항상 이 개발 가이드를 확인한다.
- 새로운 작업, 구조 변경, 규칙 변경 시 반드시 문서에 기록한다.
- 충돌 가능성이 있는 경우, 우선 사용자에게 확인을 요청한다.
- 컨텍스트를 잃지 않도록, 이전 작업 내역과 규칙을 항상 참고한다.

### 샘플 데이터 관리 지침
- 인증이 필요 없는 공개 샘플 데이터는 sample 폴더에 저장한다.
- 외부 다운로드가 불가하거나 인증이 필요한 경우, assistant가 직접 임의의 샘플 csv 파일을 생성하여 활용할 수 있다.
- 샘플 데이터 생성 및 활용 내역은 이 문서에 기록한다.

---

*마지막 업데이트: 2025-07-20*