import { createClient } from '@supabase/supabase-js'

const envUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) ||
  ''

const envKey =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) ||
  ''

export const rawSupabaseUrl = (envUrl || '').trim()
export const rawSupabaseAnonKey = (envKey || '').trim()

export const isSupabaseConfigured =
  Boolean(rawSupabaseUrl) &&
  Boolean(rawSupabaseAnonKey) &&
  rawSupabaseUrl.startsWith('http') &&
  !rawSupabaseUrl.includes('placeholder') &&
  !rawSupabaseUrl.includes('your-supabase') &&
  !rawSupabaseAnonKey.includes('placeholder') &&
  !rawSupabaseAnonKey.includes('your-supabase')

if (isSupabaseConfigured) {
  console.log('[Supabase Client Initialized]: Connection configured successfully.', {
    url: rawSupabaseUrl,
    keyFormat: rawSupabaseAnonKey.startsWith('eyJ') ? 'JWT' : rawSupabaseAnonKey.startsWith('sb_') ? 'Publishable' : 'Standard'
  })
} else {
  console.error(
    '[Supabase Startup Configuration Error]: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid in your environment (.env).\n' +
    'Please verify that VITE_SUPABASE_URL starts with "https://" and VITE_SUPABASE_ANON_KEY contains your valid Supabase project key.'
  )
}

const supabaseUrl = isSupabaseConfigured ? rawSupabaseUrl : 'https://placeholder-project.supabase.co'
const supabaseAnonKey = isSupabaseConfigured ? rawSupabaseAnonKey : 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const AVATAR_BUCKET = 'avatars'

