'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signInWithEmail, signInWithGoogle, getProfile } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await signInWithEmail(email, password)
      if (authError) { setError(authError.message); return }
      if (!data.user) { setError('Something went wrong. Please try again.'); return }

      const { data: profile } = await getProfile(data.user.id)

      if (!profile) { router.push('/onboarding'); return }

      if (profile.role === 'student') router.push('/student')
      else if (profile.role === 'organizer') {
        router.push(profile.is_verified ? '/organizer' : '/pending')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await signInWithGoogle()
  }

  return (
    <div className="page flex flex-col min-h-dvh">

      {/* Decorative top bar */}
      <div className="h-1 w-full" style={{ background: 'var(--accent)' }} />

      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">

        {/* Brand */}
        <div className="mb-10 animate-fade-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                 style={{ background: 'var(--accent)', boxShadow: '0 4px 14px rgba(201,94,26,0.3)' }}>
              <span className="text-white font-bold text-xl" style={{ fontFamily: 'var(--font-display)' }}>
                C
              </span>
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--primary)' }}>
                Campus Loop
              </h1>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px' }}>
                Your campus events, all in one place
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                       color: 'var(--primary)', marginBottom: '6px' }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
            Sign in to your account
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label className="input-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '14px', top: '50%',
                               transform: 'translateY(-50%)', width: '16px', height: '16px',
                               color: 'var(--muted)', pointerEvents: 'none' }} />
                <input type="email" className="input" style={{ paddingLeft: '42px' }}
                  placeholder="you@college.edu" value={email}
                  onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" inputMode="email" />
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
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" />
                <button type="button"
                  style={{ position: 'absolute', right: '14px', top: '50%',
                           transform: 'translateY(-50%)', color: 'var(--muted)',
                           background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff style={{ width: '16px', height: '16px' }} />
                                : <Eye style={{ width: '16px', height: '16px' }} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(198,40,40,0.08)', border: '1px solid rgba(198,40,40,0.2)',
                            borderRadius: '10px', padding: '12px 14px',
                            color: 'var(--error)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={loading}>
              {loading
                ? <span className="animate-pulse-soft">Signing in...</span>
                : <><span>Sign In</span><ArrowRight style={{ width: '16px', height: '16px' }} /></>}
            </button>

          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Google */}
          <button type="button" className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
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

        {/* Signup link */}
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px',
                    marginTop: '24px' }} className="animate-fade-up">
          Don't have an account?{' '}
          <Link href="/signup"
            style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>

      </div>
    </div>
  )
}