'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OrganizerNav from '@/components/organizer/OrganizerNav'
import type { Profile } from '@/types'

export default function OrganizerStatsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalRegistrations: 0,
    approvedRegistrations: 0,
    rejectedRegistrations: 0,
    pendingRegistrations: 0,
    pendingPayments: 0,
    verifiedPayments: 0,
    totalRevenue: 0,
    totalAttended: 0,
  })
  const [topEvents, setTopEvents] = useState<any[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*, college:colleges(*)')
        .eq('id', user.id).single()

      if (!prof || !prof.is_verified) { router.push('/pending'); return }
      setProfile(prof)

      // Fetch all organizer events
      const { data: events } = await supabase
        .from('event_summary').select('*')
        .eq('organizer_id', user.id)

      const evList = events ?? []

      if (evList.length > 0) {
        const eventIds = evList.map(e => e.id)

        // Fetch all registrations
        const { data: regs } = await supabase
          .from('registrations')
          .select('status, payment_status, payment_amount, attended, event_id')
          .in('event_id', eventIds)

        const allRegs = regs ?? []
        const now = new Date()

        // Calculate revenue from verified payments
        const revenue = allRegs
          .filter(r => r.payment_status === 'verified')
          .reduce((sum, r) => sum + (r.payment_amount ?? 0), 0)

        setStats({
          totalEvents: evList.length,
          activeEvents: evList.filter(e => e.is_active &&
            new Date(e.registration_expires) >= now).length,
          totalRegistrations: allRegs.length,
          approvedRegistrations: allRegs.filter(r => r.status === 'approved').length,
          rejectedRegistrations: allRegs.filter(r => r.status === 'rejected').length,
          pendingRegistrations: allRegs.filter(r => r.status === 'pending').length,
          pendingPayments: allRegs.filter(r => r.payment_status === 'pending').length,
          verifiedPayments: allRegs.filter(r => r.payment_status === 'verified').length,
          totalRevenue: revenue,
          totalAttended: allRegs.filter(r => r.attended).length,
        })

        // Top events by registrations
        const eventsWithCount = evList.map(ev => ({
          ...ev,
          regCount: allRegs.filter(r => r.event_id === ev.id).length,
        })).sort((a, b) => b.regCount - a.regCount).slice(0, 5)

        setTopEvents(eventsWithCount)
      } else {
        setStats(s => ({ ...s, totalEvents: 0 }))
      }

      setLoading(false)
    }
    init()
  }, [router])

  const StatCard = ({ icon, label, value, sub, alert = false }:
    { icon: string, label: string, value: string | number,
      sub?: string, alert?: boolean }) => (
    <div className="card-elevated" style={{
      padding: '16px',
      border: alert ? '1.5px solid rgba(230,81,0,0.35)' : undefined,
    }}>
      <span style={{ fontSize: '22px', display: 'block', marginBottom: '8px' }}>{icon}</span>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '28px',
                  color: alert ? 'var(--warning)' : 'var(--primary)', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px',
                  fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>
          {sub}
        </p>
      )}
    </div>
  )

  return (
    <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    position: 'sticky', top: 0, zIndex: 40 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                     color: 'var(--primary)' }}>
          Analytics
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
          {profile?.org_name ?? 'Your events'} · {profile?.college?.short_code}
        </p>
      </div>

      <div style={{ padding: '16px' }}>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '16px' }} />
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* Events stats */}
            <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>
              Events
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '10px', marginBottom: '20px' }}>
              <StatCard icon="📅" label="Total Events"  value={stats.totalEvents} />
              <StatCard icon="🟢" label="Active Events" value={stats.activeEvents}
                sub={`${stats.totalEvents - stats.activeEvents} ended`} />
            </div>

            {/* Registration stats */}
            <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>
              Registrations
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '10px', marginBottom: '20px' }}>
              <StatCard icon="👥" label="Total"    value={stats.totalRegistrations} />
              <StatCard icon="✅" label="Approved" value={stats.approvedRegistrations} />
              <StatCard icon="⏳" label="Pending"  value={stats.pendingRegistrations}
                alert={stats.pendingRegistrations > 0} />
              <StatCard icon="🎟️" label="Attended" value={stats.totalAttended}
                sub={`of ${stats.approvedRegistrations} approved`} />
            </div>

            {/* Payment stats */}
            <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>
              Payments
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '10px', marginBottom: '20px' }}>
              <StatCard icon="💰" label="Revenue Collected"
                value={`₹${stats.totalRevenue.toFixed(0)}`}
                sub={`${stats.verifiedPayments} payments`} />
              <StatCard icon="⏳" label="Pending Payments"
                value={stats.pendingPayments}
                alert={stats.pendingPayments > 0}
                sub={stats.pendingPayments > 0 ? 'Needs review' : 'All cleared'} />
            </div>

            {/* Top events */}
            {topEvents.length > 0 && (
              <>
                <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                            letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>
                  Top Events by Registrations
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topEvents.map((ev, i) => (
                    <button key={ev.id}
                      onClick={() => router.push(`/organizer/event/${ev.id}`)}
                      style={{ width: '100%', textAlign: 'left', background: 'none',
                               border: 'none', padding: 0, cursor: 'pointer' }}>
                      <div className="card" style={{ padding: '14px', display: 'flex',
                                                      alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                                       color: i === 0 ? 'var(--accent)' : 'var(--muted)',
                                       minWidth: '28px' }}>
                          #{i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: '600',
                                      color: 'var(--primary)', overflow: 'hidden',
                                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.title}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                            {ev.regCount} registration{ev.regCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {/* Mini bar */}
                        <div style={{ width: '60px', height: '6px',
                                      background: 'var(--elevated)', borderRadius: '99px',
                                      overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '99px',
                            background: 'var(--accent)',
                            width: `${topEvents[0].regCount > 0
                              ? (ev.regCount / topEvents[0].regCount) * 100 : 0}%`,
                          }} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {stats.totalEvents === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📊</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px',
                             color: 'var(--primary)', marginBottom: '8px' }}>
                  No data yet
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  Create events to start seeing analytics here.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <OrganizerNav />
    </div>
  )
}