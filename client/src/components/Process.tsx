import { useCallback } from "react";
import { Typography, Badge } from "antd";
import {
  Target,
  Database,
  Wrench,
  Rocket,
  LucideIcon,
  Check,
} from "lucide-react";
import {
  ThreadState,
  ProcessStatus,
  ProcessStepState,
} from "@/types/session";
import {
  isProcessStepClickable,
  PROCESS_STATUS_ORDER,
} from "@/utils/processStatus";

const { Text } = Typography;

interface ProcessProps {
  threadState?: ThreadState;
  processStatus: ProcessStatus; // 현재 진행중인 단계 (고정)
  selectedStatus?: ProcessStatus; // 현재 선택된/수정중인 단계
  maxReachedStatus?: ProcessStatus; // 해당 채널이 도달한 최고 단계
  fetchProcess?: (status: ProcessStatus) => void;
  // onChangeProcess:
}

const StatusConfig: {
  status: ProcessStatus;
  icon: LucideIcon;
  text: string;
  color: string;
}[] = [
  { status: "TOPIC", icon: Target, text: "주제 설정", color: "#1890ff" },
  { status: "DATA", icon: Database, text: "데이터 수집", color: "#52c41a" },
  { status: "BUILD", icon: Wrench, text: "대시보드 구축", color: "#fa8c16" },
  { status: "DEPLOY", icon: Rocket, text: "배포", color: "#722ed1" },
];

// 색상에서 배경색 생성 (연한 버전)
const getLightBackgroundColor = (color: string): string => {
  const colorMap: { [key: string]: string } = {
    "#1890ff": "#e6f7ff", // 파란색 -> 연한 파란색
    "#52c41a": "#f6ffed", // 녹색 -> 연한 녹색
    "#fa8c16": "#fff2e8", // 주황색 -> 연한 주황색
    "#722ed1": "#f9f0ff", // 보라색 -> 연한 보라색
  };
  return colorMap[color] || "#f5f5f5";
};

// 새로운 프로세스 단계 상태 계산 함수
const getProcessStepStateNew = (
  stepStatus: ProcessStatus,
  currentProgressStatus: ProcessStatus, // 실제 진행중인 단계
  selectedStatus?: ProcessStatus // 현재 선택된 단계
): ProcessStepState => {
  const stepIndex = PROCESS_STATUS_ORDER.indexOf(stepStatus);
  const currentProgressIndex = PROCESS_STATUS_ORDER.indexOf(currentProgressStatus);
  // Logic simplified - maxReachedStatus not needed for current implementation

  // 현재 진행중인 단계
  if (stepIndex === currentProgressIndex) {
    return "current";
  }
  
  // 현재 선택된 단계인지 확인 (완료된 단계를 클릭한 경우만)
  if (selectedStatus && stepStatus === selectedStatus && stepIndex < currentProgressIndex) {
    return "editing"; // 완료된 단계 중 선택된 단계
  }
  
  // 완료된 단계
  if (stepIndex < currentProgressIndex) {
    return "completed";
  }
  
  // 대기중인 단계
  return "pending";
};

// 상태별 스타일 설정
const getStepStyles = (
  stepState: "completed" | "current" | "editing" | "pending",
  color: string
) => {
  switch (stepState) {
    case "completed":
      return {
        borderColor: color,
        backgroundColor: getLightBackgroundColor(color), // 각 단계 고유 색상의 연한 버전
        textColor: color,
        iconColor: color,
        opacity: "opacity-100",
        cursor: "cursor-pointer",
        badgeStatus: "success" as const,
      };
    case "current":
      return {
        borderColor: color,
        backgroundColor: "#fff",
        textColor: color,
        iconColor: color,
        opacity: "opacity-100",
        cursor: "cursor-pointer",
        badgeStatus: "processing" as const,
      };
    case "editing":
      return {
        borderColor: color,
        backgroundColor: "#fff",
        textColor: color,
        iconColor: color,
        opacity: "opacity-100",
        cursor: "cursor-pointer",
        badgeStatus: "warning" as const, // 수정중 표시
      };
    case "pending":
      return {
        borderColor: color,
        backgroundColor: "#fff",
        textColor: color,
        iconColor: color,
        opacity: "opacity-30", // 더 낮은 투명도로 비활성화 느낌 강화
        cursor: "cursor-not-allowed",
        badgeStatus: "default" as const,
      };
  }
};

const Process = ({
  processStatus,
  selectedStatus,
  maxReachedStatus,
  fetchProcess,
}: ProcessProps) => {
  // 클릭 가능 여부는 maxReachedStatus 기준으로
  const baseStatus = maxReachedStatus || processStatus;

  const handleProcessClick = useCallback(
    (status: ProcessStatus) => {
      const isClickable = isProcessStepClickable(status, maxReachedStatus || processStatus);
      if (fetchProcess && isClickable) {
        fetchProcess(status);
      }
    },
    [fetchProcess, maxReachedStatus, processStatus]
  );

  return (
    <div className="flex gap-4 p-4 border-b border-gray-100">
      {StatusConfig.map((config) => {
        const stepState = getProcessStepStateNew(
          config.status, 
          processStatus, 
          selectedStatus
        );
        const isClickable = isProcessStepClickable(config.status, baseStatus);
        const styles = getStepStyles(stepState, config.color);

        // 완료된 단계는 체크 아이콘, 수정중/현재/대기 단계는 원래 아이콘
        const IconComponent = stepState === "completed" ? Check : config.icon;

        return (
          <div
            key={config.status}
            className={`flex flex-1 justify-between items-center gap-2 px-4 py-3 rounded-lg transition-all duration-200
              ${styles.opacity}
              ${styles.cursor}
              ${
                isClickable && fetchProcess
                  ? "hover:shadow-md hover:scale-105"
                  : ""
              }
              ${stepState === "current" ? "border-2" : "border"}
            `}
            style={{
              borderColor: styles.borderColor,
              backgroundColor: styles.backgroundColor,
            }}
            onClick={() => handleProcessClick(config.status)}
          >
            <div className="flex items-center gap-2">
              <IconComponent
                className="w-5 h-5"
                style={{ color: styles.iconColor }}
              />
              <Text
                className="text-sm font-medium"
                style={{ color: styles.textColor }}
              >
                {config.text}
              </Text>
            </div>

            <div className="flex items-center gap-2">
              {/* 상태 텍스트 */}
              <Text className="text-xs" style={{ color: styles.textColor }}>
                {stepState === "completed"
                  ? "완료됨"
                  : stepState === "current"
                  ? "진행중"
                  : stepState === "editing"
                  ? "수정중"
                  : "대기중"}
              </Text>

              {/* 배지 */}
              <Badge
                status={styles.badgeStatus}
                color={config.color} // 모든 상태에서 각 단계의 고유 색상 사용
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Process;
