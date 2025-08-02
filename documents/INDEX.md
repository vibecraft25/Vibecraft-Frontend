# VibeCraft 문서 인덱스

## 📖 프로젝트 개요

VibeCraft는 자연어 프롬프트를 통해 10분 내에 맞춤형 통계 및 그래프 대시보드를 생성하는 온프레미스 LLM 및 MCP 기반 오픈소스 프로젝트입니다.

---

## 📁 문서 구조

### 🎯 프로젝트 핵심 문서
- **[project_intro.md](./project_intro.md)** - 프로젝트 소개 및 목표 (독립 문서)

### 📚 가이드 문서 (`guides/`)
- **[development_guide.md](./guides/development_guide.md)** - 개발 규칙 및 어시스턴트 가이드
  - 프로젝트 규칙 및 개발 프로세스
  - 기술 스택 및 환경 설정
  - 어시스턴트 작업 지침

### 🛠 기술 문서 (`technical/`)
- **[mcp_system_guide.md](./technical/mcp_system_guide.md)** - MCP 시스템 기술 가이드
  - 시스템 아키텍처 및 구현 방법
  - SSE (Server-Sent Events) 통신 프로토콜
  - 파일 구조 및 실행 가이드
- **[project_structure.md](./technical/project_structure.md)** - 프로젝트 구조 명세서

### 📝 작업 이력 (`history/`)
- **[client_work_history.md](./history/client_work_history.md)** - 클라이언트 개발 작업 히스토리
- **[server_work_history.md](./history/server_work_history.md)** - 서버 개발 작업 히스토리

### 🌐 외부 참조 (`external/`)
- **[claude_code_guide.md](./external/claude_code_guide.md)** - Claude Code 활용 가이드

---

## 🚀 빠른 시작

### 1. 개발 환경 설정
```bash
# Node.js 22.x 설치
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt update && sudo apt install -y nodejs

# Claude Code 설치
sudo npm install -g @anthropic-ai/claude-code
```

### 2. 프로젝트 실행
```bash
# 서버 실행 (포트 8080)
cd server && npm run dev:ts

# 클라이언트 실행 (포트 5173)
cd client && npm run dev

# 브라우저 접속
http://localhost:5173/chat
```

---

## 📋 주요 기능

### ✅ 구현 완료
- **반응형 웹 애플리케이션**: TailwindCSS + Ant Design
- **실시간 채팅 시스템**: SSE 기반 MCP 통신
- **세션 관리**: 독립적인 채팅 세션별 MCP 클라이언트
- **자동 재연결**: 연결 끊김 시 자동 복구
- **사이드바**: 세션 기반 채팅 로그 관리

### 🔄 진행 중
- 데이터 시각화 대시보드 개발
- 온프레미스 배포 환경 최적화

---

## 🎯 문서 업데이트 규칙

1. **우선순위**: `guides/development_guide.md`를 최우선으로 참고
2. **일관성**: 모든 변경사항은 관련 문서에 동기화
3. **한국어**: 모든 문서는 한국어로 작성
4. **버전 관리**: 주요 변경사항은 Git을 통해 관리

## 📂 현재 폴더 구조

```
documents/
├── INDEX.md                    # 이 파일 (문서 인덱스)
├── project_intro.md             # 프로젝트 소개 (독립 문서)
├── guides/
│   └── development_guide.md     # 통합 개발 가이드
├── technical/
│   ├── mcp_system_guide.md      # MCP 시스템 기술 가이드
│   └── project_structure.md     # 프로젝트 구조
├── history/
│   ├── client_work_history.md   # 클라이언트 작업 이력
│   └── server_work_history.md   # 서버 작업 이력
└── external/
    └── claude_code_guide.md     # Claude Code 가이드
```

## 🔗 관련 링크

- **Repository**: [VibeCraft GitHub](https://github.com/your-username/vibecraft)
- **Deployment**: 온프레미스 (로컬 서버)
- **Technology Stack**: React 18 + TypeScript + Node.js + SSE

---

## 📞 지원

문서 내용에 대한 질문이나 수정 요청은 개발팀에 문의하시기 바랍니다.

---

*마지막 업데이트: 2025-07-20*