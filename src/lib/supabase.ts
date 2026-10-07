import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Normalizes Supabase project URL by removing any trailing /rest/v1 or trailing slashes.
 */
export function cleanSupabaseUrl(url?: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

// Read Supabase settings ONLY through import.meta.env
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = cleanSupabaseUrl(rawUrl);
export const supabaseAnonKey = (rawKey || '').trim();

/**
 * Validates that both required environment variables are present and well-formed.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project-ref')
  );
}

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isConfigured: isSupabaseConfigured(),
  };
}

// Global cache object to ensure single instance across Vite HMR and re-renders
const globalForSupabase = globalThis as unknown as {
  __deolive_supabase_instance__?: SupabaseClient;
};

/**
 * Creates or retrieves the single, shared SupabaseClient instance.
 * Guaranteed to execute createClient EXACTLY ONCE across the entire application lifecycle.
 */
function createSharedSupabaseClient(): SupabaseClient {
  if (globalForSupabase.__deolive_supabase_instance__) {
    return globalForSupabase.__deolive_supabase_instance__;
  }

  // If environment variables are missing, fallback to dummy values so the client can construct
  // without throwing an unhandled exception before React mounts the MissingEnvErrorScreen.
  const activeUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co';
  const activeKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key';

  const client = createClient(activeUrl, activeKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'deolive-auth-token',
    },
  });

  globalForSupabase.__deolive_supabase_instance__ = client;
  return client;
}

// Single shared client exported for the entire project
export const supabase: SupabaseClient = createSharedSupabaseClient();
