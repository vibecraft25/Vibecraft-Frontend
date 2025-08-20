# VibeCraft

LLM과 MCP(Model Context Protocol) 기반으로 자연어 프롬프트만으로 10분 안에 맞춤형 데이터 시각화 대시보드를 생성하는 오픈소스 프로젝트입니다.

## 🚀 주요 기능

- **자연어 기반 요청**: "우리 회사 매출과 날씨의 상관관계를 보여줘"와 같은 자연어로 대시보드 생성
- **자동 데이터 수집**: CSV, JSON, API, 데이터베이스 등 다양한 소스에서 자동 데이터 수집
- **AI 기반 시각화**: 최적의 차트와 지도 시각화를 자동으로 생성
- **실시간 대시보드**: 10분 안에 완성되는 인터랙티브 대시보드
- **온프레미스 보안**: 모든 처리가 로컬 환경에서 실행되어 데이터 보안 보장

## 🛠 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Ant Design + Tailwind CSS
- **Visualization**: Recharts + React Leaflet
- **Routing**: React Router
- **Real-time**: SSE (Server-Sent Events)
- **Animation**: FullPage.js

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 설치
```bash
# 저장소 클론
git clone https://github.com/your-username/vibecraft.git
cd vibecraft

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:22042 접속
```

### 빌드
```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 🏗 프로젝트 구조

```
VibeCraft/
├── src/
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   └── PromptBox.tsx   # 프롬프트 입력 컴포넌트
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── MainPage.tsx    # 메인 랜딩 페이지
│   │   └── CraftPage.tsx   # 대시보드 생성 페이지
│   ├── styles/             # 스타일 파일
│   │   └── index.css       # 글로벌 스타일
│   ├── types/              # TypeScript 타입 정의
│   ├── hooks/              # 커스텀 React 훅
│   └── utils/              # 유틸리티 함수
├── sample/                 # 샘플 데이터
│   ├── sample_data.csv
│   └── airtravel.csv
└── docs/                   # 프로젝트 문서
```

## 🎯 사용 방법

### 1. 메인 페이지
- 그라데이션 웨이브 배경의 랜딩 페이지
- 스크롤로 4단계 가이드 섹션 확인
- 하단 고정 프롬프트 박스에 원하는 데이터 분석 주제 입력

### 2. Craft 페이지
- **Topic**: 입력된 주제 분석 및 데이터 유형 파악
- **Data**: 관련 데이터 자동 수집 및 정제
- **Build**: 최적의 차트와 대시보드 생성
- **Deploy**: 완성된 대시보드 배포 및 공유

각 단계는 순차적으로 진행되며, 이전 단계 완료 후 다음 단계가 활성화됩니다.

## 🔧 개발 명령어

```bash
# 개발 서버 시작
npm run dev

# 타입 체크
npm run type-check

# ESLint 실행
npm run lint

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 🎨 디자인 시스템

- **컬러 팔레트**: Purple to Blue 그라데이션 기반
- **UI 컴포넌트**: Ant Design 5.x
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React
- **애니메이션**: CSS transitions + FullPage.js

## 📚 MCP 서버 설정

현재 프로젝트에 설정된 MCP 서버:
- **context7**: HTTP 기반 데이터 컨텍스트
- **filesystem**: 로컬 파일 시스템 접근
- **github**: GitHub API 연동
- **notion**: Notion API 연동

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

- 프로젝트 링크: [https://github.com/your-username/vibecraft](https://github.com/your-username/vibecraft)
- 이슈 보고: [GitHub Issues](https://github.com/your-username/vibecraft/issues)

---

**VibeCraft** - AI 시대의 데이터 시각화 혁신 🎨✨