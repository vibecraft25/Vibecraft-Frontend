import { ProcessStatus, ThreadState } from "@/types/session";

export const PromptBoxThreadMessage: Record<ThreadState, string> = {
  IDLE: "어떤 데이터를 시각화하고 싶으신가요? (예: 우리 회사 매출과 날씨의 상관관계를 보여줘)",
  CONNECTING: "서버에 연결하는 중...",
  TYPING: "입력 중... (계속 입력하세요)",
  SENDING: "메시지를 전송하는 중...",
  RECEIVING: "응답을 받는 중입니다...",
  RECONNECTING: "재연결 시도 중...",
  ERROR: "오류가 발생했습니다. 다시 시도해주세요.",
  // DEFAULT: "채팅 세션에 메시지를 입력하세요...",
  FIRST_VISIT: "채팅 세션에 메시지를 입력하세요...",
  READY: "채팅 세션에 메시지를 입력하세요...",
};

export const PromptBoxProcessMessage: Record<ProcessStatus, string> = {
  TOPIC:
    "어떤 주제의 대시보드를 만들고 싶으신가요? (예: 매출 분석, 고객 데이터, 웹사이트 트래픽 등)",
  DATA: "데이터에 대한 추가 정보나 요구사항을 입력하세요...",
  BUILD: "대시보드 구축에 대한 추가 요청사항을 입력하세요...",
  DEPLOY: "배포 관련 설정이나 요청사항을 입력하세요...",
};
