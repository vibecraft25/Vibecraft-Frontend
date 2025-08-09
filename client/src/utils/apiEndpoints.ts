import { ProcessStatus } from "@/types/session";

// API 엔드포인트 구성
export interface ApiEndpoint {
  path: string;
  method: "GET" | "POST";
  params?: Record<string, string>;
}

// ProcessStatus별 API 엔드포인트 매핑
export const API_ENDPOINTS: Record<ProcessStatus, ApiEndpoint> = {
  TOPIC: {
    path: "/workflow/stream/set-topic",
    method: "GET",
    params: {
      use_langchain: "true",
    },
  },
  DATA: {
    path: "/workflow/stream/set-data",
    method: "GET",
  },
  BUILD: {
    path: "/workflow/stream/set-data",
    method: "GET",
  },
  DEPLOY: {
    path: "/workflow/stream/set-data",
    method: "GET",
  },
};

export const API_OPTIONS_ENDPOINTS: Record<
  ProcessStatus,
  Record<string, ApiEndpoint>
> = {
  TOPIC: {
    "1": {
      path: "/workflow/stream/set-data",
      method: "GET",
    },
    "2": {
      path: "/chat/stream/load-chat",
      method: "GET",
    },
    "3": {
      path: "/workflow/stream/set-topic",
      method: "GET",
    },
  },
  DATA: {},
  BUILD: {},
  DEPLOY: {},
};

// HTTP 헤더 구성
export const getStreamHeaders = (): HeadersInit => ({
  Accept: "text/event-stream",
  "Cache-Control": "no-cache",
});

// API 생성 함수
export const getApiResponse = (
  message: string,
  serverUrl: string,
  endpoint: ApiEndpoint,
  additionalParams?: Record<string, string>
): Promise<Response> => {
  const params = new URLSearchParams({
    query: message,
    ...endpoint.params,
    ...additionalParams,
  });

  const apiUrl = `${serverUrl}${endpoint.path}?${params.toString()}`;

  return fetch(apiUrl, {
    method: endpoint.method,
    headers: getStreamHeaders(),
  });
};
