// 프로젝트 진행 상태
export type ProcessStatus =
  | "TOPIC" // 주제 입력 단계
  | "DATA" // 데이터 수집 단계
  | "DATA_PROCESS" // 데이터 가공 단계
  | "BUILD" // 대시보드 구축 단계
  | "DEPLOY"; // 배포 단계

// ProcessStatus 순서 유틸리티
export const PROCESS_STATUS_ORDER: ProcessStatus[] = [
  "TOPIC",
  "DATA",
  "DATA_PROCESS",
  "BUILD",
  "DEPLOY",
];

export const getNextProcessStatus = (current: ProcessStatus): ProcessStatus => {
  const currentIndex = PROCESS_STATUS_ORDER.indexOf(current);
  const nextIndex = currentIndex + 1;

  // 마지막 단계인 경우 그대로 유지
  if (nextIndex >= PROCESS_STATUS_ORDER.length) {
    return current;
  }

  return PROCESS_STATUS_ORDER[nextIndex];
};

// 프로세스 상태 타입 정의
export type ProcessStepState = "completed" | "current" | "editing" | "pending";

// 프로세스 단계별 상태 계산 유틸리티
export const getProcessStepState = (
  stepStatus: ProcessStatus,
  currentStatus: ProcessStatus
): ProcessStepState => {
  const stepIndex = PROCESS_STATUS_ORDER.indexOf(stepStatus);
  const currentIndex = PROCESS_STATUS_ORDER.indexOf(currentStatus);

  if (stepIndex < currentIndex) {
    return "completed";
  } else if (stepIndex === currentIndex) {
    return "current";
  } else {
    return "pending";
  }
};

// 프로세스 단계 클릭 가능 여부 확인
export const isProcessStepClickable = (
  stepStatus: ProcessStatus,
  currentStatus: ProcessStatus
): boolean => {
  const stepIndex = PROCESS_STATUS_ORDER.indexOf(stepStatus);
  const currentIndex = PROCESS_STATUS_ORDER.indexOf(currentStatus);

  // 현재 단계 또는 이전 완료된 단계만 클릭 가능
  return stepIndex <= currentIndex;
};

export const isLastProcessStatus = (status: ProcessStatus): boolean => {
  return status === PROCESS_STATUS_ORDER[PROCESS_STATUS_ORDER.length - 1];
};
