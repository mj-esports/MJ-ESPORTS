// Global ambient type declarations for Deno runtime in Supabase Edge Functions
// Resolves IDE language-server diagnostics without affecting build or runtime.

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined
    set(key: string, value: string): void
    delete(key: string): void
    toObject(): { [key: string]: string }
  }
  export const env: Env
}

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export interface Handler {
    (request: Request): Response | Promise<Response>
  }
  export function serve(handler: Handler, options?: { port?: number; signal?: AbortSignal }): void
}

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}
