export interface ChatThread {
  id: string;
  title: string;
  lastMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  // threadId: string;
  content: string;
  type: "user" | "server";
  timestamp: Date;
}

// export type SSEConnectionState =
//   | "IDLE"
//   | "CREATING_THREAD"
//   | "CONNECTING"
//   | "CONNECTED"
//   | "RECONNECTING"
//   | "ERROR";

// SSE 연결 상태
export type SSEConnectionState =
  | "IDLE"
  | "CREATING_THREAD"
  | "DISCONNECTED"
  | "CONNECTING"
  | "PENDING"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR";

// export type ProcessStatus = "TOPIC" | "DATA" | "BUILD" | "DEPLOY";

export type ThreadState =
  | "FIRST_VISIT" // 최초 방문, 세션 기록 없음, Intro 표시
  | "IDLE" // 세션 없음, 빈 채팅 화면 표시
  | "CONNECTING" // 서버 연결 시도 중
  | "READY" // 세션 준비됨, 채팅 입력 가능
  | "TYPING" // 사용자가 입력 중 (typing indicator)
  | "SENDING" // 메시지 전송 중
  | "RECEIVING" // 서버 응답 수신 중
  | "RECONNECTING" // 연결 끊어져서 재연결 시도 중
  | "ERROR"; // 오류 상태, 재시도 가능

// 프로세스 상태 타입 정의 (구현은 utils/processStatus.ts로 이동)
export type ProcessStepState = "completed" | "current" | "editing" | "pending";
