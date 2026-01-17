/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_SITE_NAME: string;
  readonly VITE_MONETAG_TAG_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
