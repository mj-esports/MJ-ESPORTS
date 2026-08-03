import { createClient } from '@supabase/supabase-js'

const envUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL
    : typeof process !== 'undefined' && process.env
    ? process.env.VITE_SUPABASE_URL
    : ''

const envKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : typeof process !== 'undefined' && process.env
    ? process.env.VITE_SUPABASE_ANON_KEY
    : ''

export const rawSupabaseUrl = envUrl || ''
export const rawSupabaseAnonKey = envKey || ''

export const isSupabaseConfigured =
  Boolean(rawSupabaseUrl) &&
  Boolean(rawSupabaseAnonKey) &&
  rawSupabaseAnonKey.trim().startsWith('eyJ') &&
  !rawSupabaseUrl.includes('placeholder') &&
  !rawSupabaseUrl.includes('your-supabase') &&
  !rawSupabaseAnonKey.includes('placeholder') &&
  !rawSupabaseAnonKey.includes('your-supabase')

const supabaseUrl = isSupabaseConfigured ? rawSupabaseUrl : 'https://placeholder-project.supabase.co'
const supabaseAnonKey = isSupabaseConfigured ? rawSupabaseAnonKey : 'placeholder-anon-key'

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase Configuration Alert]: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or contains placeholders in your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const AVATAR_BUCKET = 'avatars'

