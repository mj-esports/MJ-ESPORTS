import { createClient } from '@supabase/supabase-js'

// Known Production Project Reference (mjesports)
export const PRODUCTION_PROJECT_REF = 'fdhjqlejomtgwffqgmoq'

// Detect Active Mode (Vite mode: 'development', 'production', 'staging', etc.)
export const currentMode =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) || 'development'
export const isStagingMode = currentMode === 'staging'

const envUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)) ||
  ''

const envKey =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)) ||
  ''

export const rawSupabaseUrl = (envUrl || '').trim()
export const rawSupabaseAnonKey = (envKey || '').trim()

// Derive project reference without exposing keys or credentials
const projectRefMatch = rawSupabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co/)
export const activeProjectRef = projectRefMatch ? projectRefMatch[1] : 'unconfigured'

// Environment Safety Guard: Staging Mode Must NEVER Target Production Database
let isStagingSafetyViolated = false
if (isStagingMode && activeProjectRef === PRODUCTION_PROJECT_REF) {
  isStagingSafetyViolated = true
  console.error(
    '🚨 [CRITICAL ENVIRONMENT CONFIGURATION ERROR] 🚨\n' +
    'Staging mode is active, but VITE_SUPABASE_URL is pointing to the PRODUCTION project (mjesports: ' + PRODUCTION_PROJECT_REF + ')!\n' +
    'Supabase initialization has been blocked to protect production data integrity.\n' +
    'Please configure your separate staging credentials in .env.staging.'
  )
}

// Optional Expected Staging Project Ref Verification
const expectedStagingRef =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_EXPECTED_STAGING_PROJECT_REF) || ''
if (isStagingMode && expectedStagingRef && activeProjectRef !== expectedStagingRef && activeProjectRef !== 'unconfigured' && !isStagingSafetyViolated) {
  console.warn(
    `[Supabase Staging Notice]: Connected project ref "${activeProjectRef}" does not match VITE_EXPECTED_STAGING_PROJECT_REF "${expectedStagingRef}".`
  )
}

// Development & Staging Safe Environment Logger (Never prints secrets or keys)
if (typeof window !== 'undefined' && (import.meta.env?.DEV || isStagingMode)) {
  const envLabel = isStagingMode
    ? `STAGING (${activeProjectRef})`
    : activeProjectRef === PRODUCTION_PROJECT_REF
    ? `PRODUCTION (${PRODUCTION_PROJECT_REF})`
    : `DEV/CUSTOM (${activeProjectRef})`

  console.info(
    `%c[MJ ESPORTS ENV]%c Mode: ${currentMode.toUpperCase()} • Connected: ${envLabel}`,
    'background: #00f2ff; color: #000; font-weight: bold; padding: 2px 6px;',
    'color: #00ff9d; font-weight: bold; padding-left: 6px;'
  )
}

export const isSupabaseConfigured =
  !isStagingSafetyViolated &&
  Boolean(rawSupabaseUrl) &&
  Boolean(rawSupabaseAnonKey) &&
  rawSupabaseUrl.startsWith('http') &&
  !rawSupabaseUrl.includes('placeholder') &&
  !rawSupabaseUrl.includes('your-supabase') &&
  !rawSupabaseAnonKey.includes('placeholder') &&
  !rawSupabaseAnonKey.includes('your-supabase')

if (!isSupabaseConfigured && !isStagingSafetyViolated) {
  console.error(
    '[Supabase Startup Configuration Error]: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid in your environment.\n' +
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
export const PROFILE_PROOFS_BUCKET = 'profile-proofs'

