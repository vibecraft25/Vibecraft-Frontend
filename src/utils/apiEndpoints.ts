import { API_CONFIG } from "@/config/env";

// API 엔드포인트 구성
export interface ApiEndpoint {
  path: string;
  method: "GET" | "POST";
  params?: Record<string, string>;
}

// 스트림 엔드포인트 정의
export interface StreamEndpoint {
  isStream: boolean;
  api: ApiEndpoint;
}

// 액션 기반 API 엔드포인트
export const API_ENDPOINTS = {
  // 채팅 관련
  NEW_CHAT: {
    isStream: true,
    api: {
      path: "/chat/stream/new-chat",
      method: "GET" as const,
      params: {
        use_langchain: "true",
      },
    },
  },
  LOAD_CHAT: {
    isStream: true,
    api: {
      path: "/chat/stream/load-chat",
      method: "GET" as const,
      params: {
        use_langchain: "true",
      },
    },
  },

  // 워크플로우 관련
  TOPIC: {
    isStream: true,
    api: {
      path: "/workflow/stream/topic",
      method: "GET" as const,
      params: {
        use_langchain: "true",
      },
    },
  },
  RUN: {
    isStream: true,
    api: {
      path: "/workflow/stream/run",
      method: "GET" as const,
    },
  },
} as const;

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
): Promise<Response> => {
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

  return response;
};
