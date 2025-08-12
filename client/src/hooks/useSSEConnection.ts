import { useState, useCallback } from "react";
import { ThreadState, SSEConnectionState } from "@/types/session";
import { ProcessStatus } from "@/utils/processStatus";
import { API_ENDPOINTS, getApiResponse, getStreamApiResponse } from "@/utils/apiEndpoints";
import { readStream, StreamSSEEvent } from "@/utils/streamProcessor";

export interface UseSSEConnectionConfig {
  serverUrl: string;
  onStreamEvent?: (event: StreamSSEEvent, channelId: string) => Promise<void>;
}

export interface UseSSEConnectionReturn {
  threadState: ThreadState;
  connectionState: SSEConnectionState;
  setThreadState: (state: ThreadState) => void;
  setConnectionState: (state: SSEConnectionState) => void;
  sendStreamMessage: (
    message: string,
    processStatus: ProcessStatus,
    channelId: string,
    additionalParams?: Record<string, string>
  ) => Promise<boolean>;
  sendApiMessage: (
    message: string,
    processStatus: ProcessStatus,
    additionalParams?: Record<string, string>
  ) => Promise<any>;
}

export const useSSEConnection = (config: UseSSEConnectionConfig): UseSSEConnectionReturn => {
  const { serverUrl, onStreamEvent } = config;
  
  const [threadState, setThreadState] = useState<ThreadState>("IDLE");
  const [connectionState, setConnectionState] = useState<SSEConnectionState>("DISCONNECTED");

  const sendStreamMessage = useCallback(
    async (
      _message: string,
      processStatus: ProcessStatus,
      channelId: string,
      additionalParams?: Record<string, string>
    ): Promise<boolean> => {
      try {
        const { isStream, api } = API_ENDPOINTS[processStatus];

        if (!isStream) {
          throw new Error("This endpoint does not support streaming");
        }

        setThreadState("SENDING");

        const response = await getStreamApiResponse(serverUrl, api, additionalParams);

        setThreadState("RECEIVING");
        setConnectionState("CONNECTED");

        if (!response.body) {
          throw new Error("응답 스트림을 받을 수 없습니다.");
        }

        if (onStreamEvent) {
          await readStream(response, (event) => onStreamEvent(event, channelId));
        }

        return true;
      } catch (error) {
        console.error("❌ 스트림 처리 오류:", error);
        setConnectionState("ERROR");
        setThreadState("ERROR");
        return false;
      }
    },
    [serverUrl, onStreamEvent]
  );

  const sendApiMessage = useCallback(
    async (
      _message: string,
      processStatus: ProcessStatus,
      additionalParams?: Record<string, string>
    ): Promise<any> => {
      try {
        const { isStream, api } = API_ENDPOINTS[processStatus];

        if (isStream) {
          throw new Error("This endpoint requires streaming");
        }

        setThreadState("SENDING");

        const response = await getApiResponse(serverUrl, api, additionalParams);

        setThreadState("READY");
        setConnectionState("CONNECTED");

        return response;
      } catch (error) {
        console.error("❌ API 호출 오류:", error);
        setConnectionState("ERROR");
        setThreadState("ERROR");
        throw error;
      }
    },
    [serverUrl]
  );

  return {
    threadState,
    connectionState,
    setThreadState,
    setConnectionState,
    sendStreamMessage,
    sendApiMessage,
  };
};