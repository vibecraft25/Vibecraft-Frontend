/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_HOST: string
  readonly VITE_API_PORT: string
  readonly VITE_CLIENT_HOST: string
  readonly VITE_CLIENT_PORT: string
  readonly VITE_NODE_ENV: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}