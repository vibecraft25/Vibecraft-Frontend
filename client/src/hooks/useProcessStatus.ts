import { useState, useCallback } from "react";
import { ProcessStatus, getNextProcessStatus } from "@/utils/processStatus";

export interface UseProcessStatusReturn {
  processStatus: ProcessStatus;
  setProcessStatus: (status: ProcessStatus) => void;
  setNextProcessStatus: (onUpdate?: (status: ProcessStatus) => void) => void;
}

export const useProcessStatus = (
  initialStatus: ProcessStatus = "TOPIC"
): UseProcessStatusReturn => {
  const [processStatus, setProcessStatus] =
    useState<ProcessStatus>(initialStatus);

  const setNextProcessStatus = useCallback(() => {
    const nextProcess = getNextProcessStatus(processStatus);
    if (nextProcess !== processStatus) {
      setProcessStatus(nextProcess);
      console.log(
        "📊 다음 프로세스 단계로 진행:",
        processStatus,
        "→",
        nextProcess
      );
    }
  }, [processStatus]);

  return {
    processStatus,
    setProcessStatus,
    setNextProcessStatus,
  };
};
