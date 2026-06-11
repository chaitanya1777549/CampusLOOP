'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getColleges, createProfile } from '@/lib/supabase'
import type { College } from '@/types'
import { User, Phone, BookOpen, Hash, Calendar, Users, CreditCard } from 'lucide-react'

type Role = 'student' | 'organizer'

const BRANCHES = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Other',
]
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const YEARS   = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']

export default function OnboardingPage() {
  const router = useRouter()
  const [role, setRole]         = useState<Role | null>(null)
  const [colleges, setColleges] = useState<College[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [userId, setUserId]     = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Individual state for each field — prevents cursor jump
  const [name, setName]                   = useState('')
  const [phone, setPhone]                 = useState('')
  const [collegeId, setCollegeId]         = useState('')
  const [rollNumber, setRollNumber]       = useState('')
  const [branch, setBranch]               = useState('')
  const [section, setSection]             = useState('')
  const [yearOfStudy, setYearOfStudy]     = useState('')
  const [gender, setGender]               = useState('')
  const [orgName, setOrgName]             = useState('')
  const [orgRole, setOrgRole]             = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role, is_verified').eq('id', user.id).single()

      if (profile) {
        if (profile.role === 'student') router.push('/student')
        else if (profile.is_verified)   router.push('/organizer')
        else                             router.push('/pending')
        return
      }

      setUserId(user.id)
      setUserEmail(user.email ?? '')
      const storedRole = sessionStorage.getItem('signup_role') as Role | null
      setRole(storedRole || 'student')

      const { data: collegesData } = await getColleges()
      if (collegesData) setColleges(collegesData)
    }
    init()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate roll number uniqueness for students
      if (role === 'student') {
  if (!rollNumber.trim()) {
    setError('Roll number is required. Please enter your college roll number.')
    setLoading(false)
    return
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('roll_number', rollNumber.trim().toUpperCase())
    .single()

  if (existing) {
    setError('This roll number is already registered. Contact admin if this is a mistake.')
    setLoading(false)
    return
  }
}

      const profileData: any = {
        id: userId,
        role: role!,
        name: name.trim(),
        email: userEmail,
        phone: phone.trim(),
        college_id: parseInt(collegeId),
        is_verified: role === 'student',
      }

      if (role === 'student') {
        profileData.roll_number = rollNumber.trim().toUpperCase()
        profileData.branch      = branch
        profileData.section     = section.trim()
        profileData.year_of_study = parseInt(yearOfStudy)
        profileData.gender      = gender
      } else {
        profileData.org_name = orgName.trim()
        profileData.org_role = orgRole.trim()
      }

      const { error: insertError } = await supabase
        .from('profiles').insert(profileData)

      if (insertError) { setError(insertError.message); return }

      sessionStorage.removeItem('signup_role')
      router.push(role === 'student' ? '/student' : '/pending')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!role || colleges.length === 0) {
    return (
      <div className="page flex items-center justify-center min-h-dvh">
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px',
                        background: 'var(--accent)', margin: '0 auto 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}
               className="animate-pulse-soft">
            <span style={{ color: 'white', fontWeight: 'bold',
                           fontFamily: 'var(--font-display)', fontSize: '20px' }}>C</span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading...</p>
        </div>
      </div>
    )
  }

  const isStudent = role === 'student'

  return (
    <div className="page min-h-dvh">
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      <div style={{ padding: '32px 20px 40px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Header */}
        <div className="animate-fade-up" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px',
                          background: 'var(--accent)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 'bold',
                             fontFamily: 'var(--font-display)' }}>C</span>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px',
                           color: 'var(--primary)' }}>Campus Loop</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px',
                       color: 'var(--primary)', marginBottom: '6px' }}>
            {isStudent ? 'Set up your profile' : 'Organizer details'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
            {isStudent
              ? 'Tell us about yourself to personalise your campus feed'
              : 'Your details will be reviewed by the admin before activation'}
          </p>
        </div>

        {/* Role badge */}
        <div style={{ marginBottom: '24px' }}>
          <span className={`badge ${isStudent ? 'badge-global' : 'badge-pending'}`}>
            {isStudent ? '🎓 Student' : '⚡ Organizer — Pending Approval'}
          </span>
        </div>

        <form onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Personal Info */}
          <div className="card-elevated" style={{ padding: '20px', display: 'flex',
                                                   flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: '600' }}>Personal Info</p>

            <div>
              <label className="input-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '14px', top: '50%',
                               transform: 'translateY(-50%)', width: '16px', height: '16px',
                               color: 'var(--muted)', pointerEvents: 'none' }} />
                <input type="text" className="input" style={{ paddingLeft: '42px' }}
                  placeholder="Your full name" value={name}
                  onChange={e => setName(e.target.value)} required autoComplete="name" />
              </div>
            </div>

            <div>
              <label className="input-label">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone style={{ position: 'absolute', left: '14px', top: '50%',
                                transform: 'translateY(-50%)', width: '16px', height: '16px',
                                color: 'var(--muted)', pointerEvents: 'none' }} />
                <input type="tel" className="input" style={{ paddingLeft: '42px' }}
                  placeholder="10-digit mobile number" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required inputMode="tel" maxLength={10} />
              </div>
            </div>
          </div>

          {/* Institution */}
          <div className="card-elevated" style={{ padding: '20px', display: 'flex',
                                                   flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: '600' }}>Institution</p>

            <div>
              <label className="input-label">College</label>
              <select className="select" value={collegeId}
                onChange={e => setCollegeId(e.target.value)} required>
                <option value="" disabled>Select your college</option>
                {colleges.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.short_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student-specific */}
          {isStudent && (
            <>
              <div className="card-elevated" style={{ padding: '20px', display: 'flex',
                                                       flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                            letterSpacing: '0.1em', fontWeight: '600' }}>Academic Details</p>

                {/* Roll Number */}
                <div>
                  <label className="input-label">Roll Number *</label>
                  <div style={{ position: 'relative' }}>
                    <CreditCard style={{ position: 'absolute', left: '14px', top: '50%',
                                         transform: 'translateY(-50%)', width: '16px', height: '16px',
                                         color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input type="text" className="input" style={{ paddingLeft: '42px' }}
                      placeholder="e.g. 21B01A0501"
                      value={rollNumber}
                      onChange={e => setRollNumber(e.target.value.toUpperCase())}
                      required maxLength={20} />
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                    Used for group event registrations. Must be unique.
                  </p>
                </div>

                <div>
                  <label className="input-label">Branch / Department</label>
                  <div style={{ position: 'relative' }}>
                    <BookOpen style={{ position: 'absolute', left: '14px', top: '50%',
                                       transform: 'translateY(-50%)', width: '16px', height: '16px',
                                       color: 'var(--muted)', pointerEvents: 'none', zIndex: 1 }} />
                    <select className="select" style={{ paddingLeft: '42px' }}
                      value={branch} onChange={e => setBranch(e.target.value)} required>
                      <option value="" disabled>Select your branch</option>
                      {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="input-label">Section</label>
                    <div style={{ position: 'relative' }}>
                      <Hash style={{ position: 'absolute', left: '14px', top: '50%',
                                     transform: 'translateY(-50%)', width: '16px', height: '16px',
                                     color: 'var(--muted)', pointerEvents: 'none' }} />
                      <input type="text" className="input" style={{ paddingLeft: '42px' }}
                        placeholder="e.g. A" value={section}
                        onChange={e => setSection(e.target.value.toUpperCase())}
                        required maxLength={3} />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Year</label>
                    <div style={{ position: 'relative' }}>
                      <Calendar style={{ position: 'absolute', left: '14px', top: '50%',
                                         transform: 'translateY(-50%)', width: '16px', height: '16px',
                                         color: 'var(--muted)', pointerEvents: 'none', zIndex: 1 }} />
                      <select className="select" style={{ paddingLeft: '42px' }}
                        value={yearOfStudy}
                        onChange={e => setYearOfStudy(e.target.value)} required>
                        <option value="" disabled>Year</option>
                        {YEARS.map((y, i) => <option key={i} value={i + 1}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="input-label">Gender</label>
                  <select className="select" value={gender}
                    onChange={e => setGender(e.target.value)} required>
                    <option value="" disabled>Select gender</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Organizer-specific */}
          {!isStudent && (
            <div className="card-elevated" style={{ padding: '20px', display: 'flex',
                                                     flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                          letterSpacing: '0.1em', fontWeight: '600' }}>Organisation Details</p>

              <div>
                <label className="input-label">Club / Society Name</label>
                <div style={{ position: 'relative' }}>
                  <Users style={{ position: 'absolute', left: '14px', top: '50%',
                                  transform: 'translateY(-50%)', width: '16px', height: '16px',
                                  color: 'var(--muted)', pointerEvents: 'none' }} />
                  <input type="text" className="input" style={{ paddingLeft: '42px' }}
                    placeholder="e.g. IEEE ANITS Student Branch"
                    value={orgName} onChange={e => setOrgName(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="input-label">Your Role / Position</label>
                <input type="text" className="input"
                  placeholder="e.g. President, Event Coordinator"
                  value={orgRole} onChange={e => setOrgRole(e.target.value)} required />
              </div>

              <div style={{ background: 'rgba(230,81,0,0.06)',
                            border: '1px solid rgba(230,81,0,0.2)',
                            borderRadius: '10px', padding: '12px 14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--warning)', lineHeight: 1.6 }}>
                  ⏳ Your account will be reviewed before you can create events.
                  You'll receive an email once approved.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(198,40,40,0.08)',
                          border: '1px solid rgba(198,40,40,0.2)',
                          borderRadius: '10px', padding: '12px 14px',
                          color: 'var(--error)', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary"
            style={{ display: 'flex', alignItems: 'center',
                     justifyContent: 'center', gap: '8px' }}
            disabled={loading}>
            {loading
              ? <span className="animate-pulse-soft">Saving...</span>
              : isStudent ? '🎉 Enter Campus Loop' : '📋 Submit for Review'}
          </button>

        </form>
        <div style={{ height: '32px' }} />
      </div>
    </div>
  )
}