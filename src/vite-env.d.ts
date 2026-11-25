/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Publiczny adres aplikacji, do którego prowadzą tajne linki (patrz .env). */
  readonly VITE_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
