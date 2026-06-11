// ============================================================
// CAMPUS LOOP | Global TypeScript Types
// ============================================================

export type UserRole = 'student' | 'organizer'
export type EventScope = 'internal' | 'global'
export type RegistrationStatus = 'pending' | 'approved' | 'rejected'
export type PaymentStatus = 'none' | 'pending' | 'verified' | 'failed'
export type RegistrationType = 'individual' | 'group'

// ── College ─────────────────────────────────────────────────
export interface College {
  id: number
  name: string
  short_code: string
  city: string
  logo_url?: string
  created_at: string
}

// ── Profile ──────────────────────────────────────────────────
export interface Profile {
  id: string
  role: UserRole
  name: string
  email: string
  phone: string
  college_id: number
  college?: College

  // Student fields
  roll_number?: string
  section?: string
  branch?: string
  year_of_study?: number
  gender?: string

  // Organizer fields
  org_name?: string
  org_role?: string

  is_verified: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
}

// ── Event ────────────────────────────────────────────────────
export interface CustomField {
  label: string
  type: 'text' | 'select' | 'number' | 'textarea'
  options?: string[]   // Only for type: 'select'
  required?: boolean
}

export interface Event {
  id: string
  organizer_id: string
  college_id: number
  scope: EventScope
  title: string
  description: string
  venue: string
  event_date: string
  registration_expires: string
  main_poster_url: string
  media_urls: string[]
  max_registrations?: number
  custom_fields: CustomField[]
  is_paid: boolean
  price: number
  upi_id?: string
  upi_qr_url?: string
  // Registration type
  registration_type: RegistrationType
  min_team_size?: number
  max_team_size?: number
  max_teams?: number

  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Event Summary (from view) ────────────────────────────────
export interface EventSummary extends Event {
  college_name: string
  college_short_code: string
  organizer_name: string
  organizer_avatar?: string
  registration_count: number
}

// ── Team Member Data ─────────────────────────────────────────
export interface TeamMemberData {
  roll_number: string
  name?: string
  email?: string
  phone?: string
  branch?: string
  year_of_study?: number
  profile_id?: string
}

// ── Registration ─────────────────────────────────────────────
export interface Registration {
  id: string
  event_id: string
  student_id: string
  custom_responses: Record<string, string>
  status: RegistrationStatus
  payment_status: PaymentStatus
  utr_number?: string
  payment_screenshot_url?: string
  payment_amount?: number
  payment_submitted_at?: string
  payment_verified_at?: string
  payment_verified_by?: string
  rejection_reason?: string
  // Group registration fields
  is_team_leader: boolean
  team_name?: string
  team_members?: TeamMemberData[]
  attended: boolean
  attended_at?: string
  created_at: string
  updated_at: string
  // Joined
  event?: EventSummary
  student?: Profile
}

// ── Onboarding Forms ─────────────────────────────────────────
export interface StudentOnboardingForm {
  name: string
  phone: string
  college_id: number
  branch: string
  section: string
  year_of_study: number
  gender: string
}

export interface OrganizerOnboardingForm {
  name: string
  phone: string
  college_id: number
  org_name: string
  org_role: string
}

// ── Auth ─────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  email: string
}