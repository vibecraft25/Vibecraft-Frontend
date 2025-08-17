import { DashboardStatus } from "@/core";
import { API_CONFIG } from "@/config/env";

// API 엔드포인트 구성
export interface ApiEndpoint {
  path: string;
  method: "GET" | "POST";
  params?: Record<string, string>;
}

// ProcessStatus별 API 엔드포인트 매핑
export const API_ENDPOINTS: Record<
  DashboardStatus,
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
  DashboardStatus,
  Record<string, { isStream: boolean; api: ApiEndpoint }>
> = {
  TOPIC: {
    "1": {
      isStream: true,
      api: {
        path: "/workflow/stream/set-data",
        method: "GET",
      },
    },
    "2": {
      isStream: true,
      api: {
        path: "/chat/stream/load-chat",
        method: "GET",
      },
    },
    "3": {
      isStream: true,
      api: {
        path: "/workflow/stream/set-topic",
        method: "GET",
      },
    },
  },
  DATA: {
    "1": {
      isStream: true,
      api: {
        path: "/workflow/stream/process-data-selection",
        method: "GET",
      },
    },
    "2": {
      isStream: true,
      api: {
        path: "/workflow/stream/process-data-selection",
        method: "GET",
      },
    },
    "3": {
      isStream: false,
      api: {
        path: "/workflow/visualization-type",
        method: "GET",
      },
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

// stream API 생성 함수
export const getStreamApiResponse = (
  endpoint: ApiEndpoint,
  additionalParams?: Record<string, string>
): Promise<Response> => {
  const params = new URLSearchParams({
    ...endpoint.params,
    ...additionalParams,
  });

  const apiUrl = `${API_CONFIG.BASE_URL}${endpoint.path}?${params.toString()}`;

  return fetch(apiUrl, {
    method: endpoint.method,
    headers: getStreamHeaders(),
  });
};

// API 생성 함수
export const getApiResponse = async (
  endpoint: ApiEndpoint,
  additionalParams?: Record<string, string>
) => {
  const params = new URLSearchParams({
    ...endpoint.params,
    ...additionalParams,
  });

  const apiUrl = `${API_CONFIG.BASE_URL}${endpoint.path}?${params.toString()}`;

  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API 호출 실패: ${response.status}`);
  }

  return response.json();
};
