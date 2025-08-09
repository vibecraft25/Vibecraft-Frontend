import { ProcessStatus } from "@/types/session";
import { ComponentType } from "@/hooks/useSSE";

export const ProcessStatus_Component: Record<ProcessStatus, ComponentType> = {
  TOPIC: "DATA_UPLOAD",
  DATA: "DATA_UPLOAD",
  BUILD: "BUILD_RESULT",
  DEPLOY: "DEPLOY_STATUS",
};
