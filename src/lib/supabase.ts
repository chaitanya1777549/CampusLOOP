// ============================================================
// CAMPUS LOOP | Supabase Client
// ============================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client — used in all client components
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// ── Auth helpers ─────────────────────────────────────────────

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/onboarding`,
    },
  })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Profile helpers ──────────────────────────────────────────

export async function getProfile(userId: string) {
  return supabase
    .from('profiles')
    .select('*, college:colleges(*)')
    .eq('id', userId)
    .single()
}

export async function createProfile(profile: {
  id: string
  role: 'student' | 'organizer'
  name: string
  email: string
  phone: string
  college_id: number
  section?: string
  branch?: string
  year_of_study?: number
  gender?: string
  org_name?: string
  org_role?: string
}) {
  // Students are verified immediately, organizers go through gatekeeper
  const is_verified = profile.role === 'student'
  return supabase.from('profiles').insert({ ...profile, is_verified })
}

// ── College helpers ──────────────────────────────────────────

export async function getColleges() {
  return supabase
    .from('colleges')
    .select('*')
    .order('name')
}