// Removed invalid reference to vite/client to fix compilation error.
// The types for environment variables are explicitly defined below.

declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
