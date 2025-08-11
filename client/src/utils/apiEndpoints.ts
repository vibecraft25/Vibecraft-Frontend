import { ProcessStatus } from "./processStatus";

// API 엔드포인트 구성
export interface ApiEndpoint {
  path: string;
  method: "GET" | "POST";
  params?: Record<string, string>;
}

// ProcessStatus별 API 엔드포인트 매핑
export const API_ENDPOINTS: Record<
  ProcessStatus,
  { isStream: boolean; api: ApiEndpoint }
> = {
  TOPIC: {
    isStream: true,
    api: {
      path: "/workflow/stream/set-topic",
      method: "GET",
      params: {
        use_langchain: "true",
      },
    },
  },
  DATA: {
    isStream: true,
    api: {
      path: "/workflow/stream/set-data",
      method: "GET",
    },
  },
  DATA_PROCESS: {
    isStream: false,
    api: {
      path: "/workflow/visualization-type",
      method: "GET",
    },
  },
  BUILD: {
    isStream: true,
    api: {
      path: "",
      method: "GET",
    },
  },
  DEPLOY: {
    isStream: true,
    api: {
      path: "",
      method: "GET",
    },
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
  DATA: {
    "1": {
      path: "/workflow/stream/process-data-selection",
      method: "GET",
    },
    "2": {
      path: "/workflow/stream/process-data-selection",
      method: "GET",
    },
    "3": {
      path: "/workflow/visualization-type",
      method: "GET",
    },
  },
  DATA_PROCESS: {},
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
  serverUrl: string,
  endpoint: ApiEndpoint,
  additionalParams?: Record<string, string>
): Promise<Response> => {
  const params = new URLSearchParams({
    ...endpoint.params,
    ...additionalParams,
  });

  const apiUrl = `${serverUrl}${endpoint.path}?${params.toString()}`;

  return fetch(apiUrl, {
    method: endpoint.method,
    headers: getStreamHeaders(),
  });
};

// 테이블 메타데이터 API 호출 함수
export const fetchTableMetadata = async (
  serverUrl: string,
  threadId: string
) => {
  const url = `${serverUrl}/contents/meta?thread_id=${threadId}`;
  console.log("📡 메타데이터 API 호출:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`메타데이터 API 호출 실패: ${response.status}`);
  }

  return response.json();
};
