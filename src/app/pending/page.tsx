'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, signOut } from '@/lib/supabase'
import { Clock, Mail, LogOut, RefreshCw } from 'lucide-react'

export default function PendingPage() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [name, setName]       = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('name, email, is_verified, role').eq('id', user.id).single()

      if (!profile)              { router.push('/onboarding'); return }
      if (profile.is_verified)   { router.push('/organizer');  return }

      setEmail(profile.email)
      setName(profile.name)
    }
    init()
  }, [router])

  async function checkStatus() {
    setChecking(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('is_verified').eq('id', user.id).single()

    if (profile?.is_verified) router.push('/organizer')
    else setChecking(false)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="page flex items-center justify-center min-h-dvh px-6">

      <div style={{ height: '3px', background: 'var(--accent)',
                    position: 'fixed', top: 0, left: 0, right: 0 }} />

      <div style={{ width: '100%', maxWidth: '360px' }} className="animate-fade-up">

        {/* Icon */}
        <div style={{ width: '80px', height: '80px', borderRadius: '24px',
                      background: 'rgba(230,81,0,0.08)', border: '1px solid rgba(230,81,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 24px' }}>
          <Clock style={{ width: '40px', height: '40px', color: 'var(--warning)' }} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px',
                     color: 'var(--primary)', textAlign: 'center', marginBottom: '10px' }}>
          Pending Approval
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center',
                    lineHeight: 1.6, marginBottom: '6px' }}>
          Hi <strong style={{ color: 'var(--primary)' }}>{name}</strong>, your organizer
          request is under review.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center',
                    lineHeight: 1.6, marginBottom: '28px' }}>
          An approval email will be sent to{' '}
          <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{email}</span> shortly.
        </p>

        {/* Email hint card */}
        <div className="card" style={{ padding: '16px', display: 'flex',
                                        alignItems: 'flex-start', gap: '12px',
                                        marginBottom: '20px' }}>
          <Mail style={{ width: '20px', height: '20px', color: 'var(--accent)',
                         flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontWeight: '600', color: 'var(--primary)',
                        fontSize: '13px', marginBottom: '4px' }}>
              Check your inbox
            </p>
            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
              Once approved, you'll get a confirmation email and can log in to start
              creating events.
            </p>
          </div>
        </div>

        {/* Check status */}
        <button onClick={checkStatus} disabled={checking} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center',
                   justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          <RefreshCw style={{ width: '16px', height: '16px',
                              animation: checking ? 'spin 1s linear infinite' : 'none' }} />
          {checking ? 'Checking...' : 'Check Approval Status'}
        </button>

        {/* Sign out */}
        <button onClick={handleSignOut} className="btn-ghost"
          style={{ width: '100%', display: 'flex', alignItems: 'center',
                   justifyContent: 'center', gap: '8px', padding: '12px' }}>
          <LogOut style={{ width: '16px', height: '16px' }} />
          Sign out
        </button>

      </div>
    </div>
  )
}