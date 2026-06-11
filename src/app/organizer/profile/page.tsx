'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, signOut } from '@/lib/supabase'
import OrganizerNav from '@/components/organizer/OrganizerNav'
import type { Profile } from '@/types'
import { LogOut, User, Phone, Users, Briefcase } from 'lucide-react'

export default function OrganizerProfilePage() {
  const router  = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*, college:colleges(*)')
        .eq('id', user.id).single()

      if (!prof) { router.push('/onboarding'); return }
      setProfile(prof)
      setLoading(false)
    }
    init()
  }, [router])

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>
        <div style={{ height: '3px', background: 'var(--accent)' }} />
        <div style={{ padding: '16px' }}>
          <div className="skeleton" style={{ height: '120px', borderRadius: '16px',
                                             marginBottom: '16px' }} />
          <div className="skeleton" style={{ height: '200px', borderRadius: '16px' }} />
        </div>
        <OrganizerNav />
      </div>
    )
  }

  const college = (profile as any)?.college

  return (
    <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      <div style={{ padding: '16px 20px', background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                     color: 'var(--primary)' }}>
          My Profile
        </h1>
        <button onClick={handleSignOut}
          style={{ display: 'flex', alignItems: 'center', gap: '6px',
                   background: 'none', border: 'none', cursor: 'pointer',
                   color: 'var(--muted)', fontSize: '13px',
                   fontFamily: 'var(--font-body)' }}>
          <LogOut style={{ width: '16px', height: '16px' }} />
          Sign out
        </button>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Avatar card */}
        <div className="card" style={{ padding: '24px', textAlign: 'center',
                                        marginBottom: '16px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px',
                        background: 'rgba(201,94,26,0.1)',
                        border: '2px solid rgba(201,94,26,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '32px',
                           color: 'var(--accent)' }}>
              {profile?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                       color: 'var(--primary)', marginBottom: '4px' }}>
            {profile?.name}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' }}>
            {profile?.email}
          </p>
          <span className="badge badge-global"
            style={{ display: 'inline-block' }}>
            ✅ Verified Organizer
          </span>
        </div>

        {/* Org details */}
        <div className="card-elevated" style={{ padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                      letterSpacing: '0.1em', fontWeight: '600', marginBottom: '14px' }}>
            Organisation
          </p>
          {[
            { icon: Users,    label: 'Club / Society', value: profile?.org_name },
            { icon: Briefcase, label: 'Your Role',     value: profile?.org_role },
            { icon: User,     label: 'Full Name',      value: profile?.name },
            { icon: Phone,    label: 'Phone',          value: profile?.phone },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center',
                                      gap: '12px', padding: '12px 0',
                                      borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px',
                            background: 'rgba(201,94,26,0.08)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: '15px', height: '15px', color: 'var(--accent)' }} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--muted)',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            fontWeight: '600' }}>{label}</p>
                <p style={{ fontSize: '14px', color: 'var(--primary)',
                            fontWeight: '500', marginTop: '1px' }}>
                  {value ?? '—'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* College card */}
        <div className="card" style={{ padding: '16px', marginBottom: '16px',
                                        display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px',
                        background: 'rgba(201,94,26,0.1)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '20px' }}>🏫</span>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: '0.05em', fontWeight: '600', marginBottom: '3px' }}>
              College
            </p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
              {college?.name ?? '—'}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {college?.city}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut}
          style={{ width: '100%', padding: '14px', borderRadius: '12px',
                   background: 'rgba(198,40,40,0.08)',
                   border: '1px solid rgba(198,40,40,0.2)',
                   color: 'var(--error)', cursor: 'pointer',
                   fontSize: '15px', fontWeight: '600',
                   fontFamily: 'var(--font-body)',
                   display: 'flex', alignItems: 'center',
                   justifyContent: 'center', gap: '8px' }}>
          <LogOut style={{ width: '16px', height: '16px' }} />
          Sign Out
        </button>

      </div>

      <OrganizerNav />
    </div>
  )
}