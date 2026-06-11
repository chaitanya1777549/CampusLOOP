'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUpWithEmail, signInWithGoogle } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, ArrowRight, GraduationCap, Users } from 'lucide-react'

type Role = 'student' | 'organizer'

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'details'>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleRoleSelect(r: Role) {
    setRole(r)
    setStep('details')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await signUpWithEmail(email, password)
      if (authError) { setError(authError.message); return }
      if (data.user) {
        sessionStorage.setItem('signup_role', role!)
        router.push('/onboarding')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    if (!role) return
    sessionStorage.setItem('signup_role', role)
    setLoading(true)
    await signInWithGoogle()
  }

  return (
    <div className="page flex flex-col min-h-dvh">

      {/* Top accent bar */}
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">

        {/* Brand */}
        <div className="mb-8 animate-fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px',
                          background: 'var(--accent)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 14px rgba(201,94,26,0.3)' }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '20px',
                             fontFamily: 'var(--font-display)' }}>C</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                         color: 'var(--primary)' }}>
              Campus Loop
            </h1>
          </div>
        </div>

        {/* ── STEP 1: Role Selection ── */}
        {step === 'role' && (
          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px',
                         color: 'var(--primary)', marginBottom: '6px' }}>
              Join Campus Loop
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px' }}>
              Choose how you want to use the platform
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Student */}
              <button type="button" onClick={() => handleRoleSelect('student')}
                className="card"
                style={{ padding: '20px', textAlign: 'left', display: 'flex',
                         alignItems: 'flex-start', gap: '16px', cursor: 'pointer',
                         border: '1.5px solid var(--border)', transition: 'all 0.2s',
                         background: 'var(--surface)', width: '100%' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px',
                              background: 'rgba(201,94,26,0.1)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <GraduationCap style={{ width: '24px', height: '24px', color: 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', fontSize: '16px', color: 'var(--primary)',
                               marginBottom: '4px' }}>I'm a Student</p>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Discover and register for events across your campus and beyond
                  </p>
                </div>
                <ArrowRight style={{ width: '18px', height: '18px', color: 'var(--muted)',
                                     alignSelf: 'center', flexShrink: 0 }} />
              </button>

              {/* Organizer */}
              <button type="button" onClick={() => handleRoleSelect('organizer')}
                className="card"
                style={{ padding: '20px', textAlign: 'left', display: 'flex',
                         alignItems: 'flex-start', gap: '16px', cursor: 'pointer',
                         border: '1.5px solid var(--border)', transition: 'all 0.2s',
                         background: 'var(--surface)', width: '100%' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px',
                              background: 'rgba(201,94,26,0.1)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users style={{ width: '24px', height: '24px', color: 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', fontSize: '16px', color: 'var(--primary)',
                               marginBottom: '4px' }}>I'm an Organizer</p>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Create and manage events for your college club or society
                  </p>
                </div>
                <ArrowRight style={{ width: '18px', height: '18px', color: 'var(--muted)',
                                     alignSelf: 'center', flexShrink: 0 }} />
              </button>

            </div>
          </div>
        )}

        {/* ── STEP 2: Email & Password ── */}
        {step === 'details' && (
          <div className="animate-fade-up">

            <button type="button" onClick={() => setStep('role')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px',
                       color: 'var(--muted)', fontSize: '13px', marginBottom: '24px',
                       background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Back
            </button>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px',
                         color: 'var(--primary)', marginBottom: '4px' }}>
              Create account
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
              Signing up as a{' '}
              <span style={{ color: 'var(--accent)', fontWeight: '600' }}>
                {role}
              </span>
            </p>

            <div className="card" style={{ padding: '24px' }}>
              <form onSubmit={handleSignup}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div>
                  <label className="input-label">Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: '14px', top: '50%',
                                   transform: 'translateY(-50%)', width: '16px', height: '16px',
                                   color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input type="email" className="input" style={{ paddingLeft: '42px' }}
                      placeholder="you@college.edu" value={email}
                      onChange={e => setEmail(e.target.value)}
                      required inputMode="email" autoComplete="email" />
                  </div>
                </div>

                <div>
                  <label className="input-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: '14px', top: '50%',
                                   transform: 'translateY(-50%)', width: '16px', height: '16px',
                                   color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input type={showPassword ? 'text' : 'password'} className="input"
                      style={{ paddingLeft: '42px', paddingRight: '42px' }}
                      placeholder="Min. 8 characters" value={password}
                      onChange={e => setPassword(e.target.value)}
                      required autoComplete="new-password" />
                    <button type="button"
                      style={{ position: 'absolute', right: '14px', top: '50%',
                               transform: 'translateY(-50%)', color: 'var(--muted)',
                               background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword
                        ? <EyeOff style={{ width: '16px', height: '16px' }} />
                        : <Eye style={{ width: '16px', height: '16px' }} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="input-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: '14px', top: '50%',
                                   transform: 'translateY(-50%)', width: '16px', height: '16px',
                                   color: 'var(--muted)', pointerEvents: 'none' }} />
                    <input type={showPassword ? 'text' : 'password'} className="input"
                      style={{ paddingLeft: '42px' }}
                      placeholder="Re-enter password" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required autoComplete="new-password" />
                  </div>
                </div>

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
                    ? <span className="animate-pulse-soft">Creating account...</span>
                    : <><ArrowRight style={{ width: '16px', height: '16px' }} /><span>Continue</span></>}
                </button>

              </form>

              <div style={{ display: 'flex', alignItems: 'center',
                            gap: '12px', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              <button type="button" className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center',
                         justifyContent: 'center', gap: '12px' }}
                onClick={handleGoogle} disabled={loading}>
                <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>

          </div>
        )}

        {/* Login link */}
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px',
                    marginTop: '24px' }}>
          Already have an account?{' '}
          <Link href="/login"
            style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  )
}