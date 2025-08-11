/**
 * 환경변수 설정 관리
 */

// API 서버 설정
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:22041',
  HOST: import.meta.env.VITE_API_HOST || 'localhost',
  PORT: import.meta.env.VITE_API_PORT || '22041',
} as const;

// 클라이언트 설정
export const CLIENT_CONFIG = {
  HOST: import.meta.env.VITE_CLIENT_HOST || 'localhost',
  PORT: import.meta.env.VITE_CLIENT_PORT || '5173',
} as const;

// 환경 설정
export const ENV_CONFIG = {
  NODE_ENV: import.meta.env.VITE_NODE_ENV || 'development',
  IS_DEVELOPMENT: import.meta.env.VITE_NODE_ENV === 'development',
  IS_PRODUCTION: import.meta.env.VITE_NODE_ENV === 'production',
} as const;

// 전체 설정 export
export const CONFIG = {
  API: API_CONFIG,
  CLIENT: CLIENT_CONFIG,
  ENV: ENV_CONFIG,
} as const;

// 개발 모드에서 설정 값 로깅
if (ENV_CONFIG.IS_DEVELOPMENT) {
  console.group('🔧 Environment Configuration');
  console.log('API Base URL:', API_CONFIG.BASE_URL);
  console.log('Client Host:', CLIENT_CONFIG.HOST);
  console.log('Environment:', ENV_CONFIG.NODE_ENV);
  console.groupEnd();
}