'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, signOut } from '@/lib/supabase'
import OrganizerNav from '@/components/organizer/OrganizerNav'
import type { Profile, EventSummary } from '@/types'
import { format } from 'date-fns'
import { Users, PlusCircle, ChevronRight, Eye, BarChart2 } from 'lucide-react'

export default function OrganizerPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [events, setEvents]     = useState<EventSummary[]>([])
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState({
    totalEvents: 0, totalRegistrations: 0,
    pendingPayments: 0, approvedRegistrations: 0,
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles').select('*, college:colleges(*)')
        .eq('id', user.id).single()

      if (!prof) { router.push('/onboarding'); return }
      if (!prof.is_verified) { router.push('/pending'); return }
      if (prof.role !== 'organizer') { router.push('/student'); return }

      setProfile(prof)

      // Fetch organizer's events
      const { data: evs } = await supabase
        .from('event_summary')
        .select('*')
        .eq('organizer_id', user.id)
        .order('created_at', { ascending: false })

      const evList = evs ?? []
      setEvents(evList)

      // Fetch registration stats
      if (evList.length > 0) {
        const eventIds = evList.map(e => e.id)

        const { data: regs } = await supabase
          .from('registrations')
          .select('status, payment_status')
          .in('event_id', eventIds)

        const allRegs = regs ?? []
        setStats({
          totalEvents: evList.length,
          totalRegistrations: allRegs.length,
          pendingPayments: allRegs.filter(r => r.payment_status === 'pending').length,
          approvedRegistrations: allRegs.filter(r => r.status === 'approved').length,
        })
      } else {
        setStats(s => ({ ...s, totalEvents: evList.length }))
      }

      setLoading(false)
    }
    init()
  }, [router])

  const activeEvents  = events.filter(e => e.is_active &&
    new Date(e.registration_expires) >= new Date())
  const pastEvents    = events.filter(e => !e.is_active ||
    new Date(e.registration_expires) < new Date())

  return (
    <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>

      <div style={{ height: '3px', background: 'var(--accent)' }} />

      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px',
                          background: 'var(--accent)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 'bold',
                             fontFamily: 'var(--font-display)' }}>C</span>
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '17px',
                           color: 'var(--primary)', lineHeight: 1 }}>
                {profile?.org_name ?? 'My Events'}
              </h1>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {profile?.college?.short_code} · Organizer
              </p>
            </div>
          </div>
          <button onClick={() => router.push('/organizer/create')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px',
                     background: 'var(--accent)', border: 'none', cursor: 'pointer',
                     color: '#fff', padding: '8px 14px', borderRadius: '10px',
                     fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-body)' }}>
            <PlusCircle style={{ width: '16px', height: '16px' }} />
            New
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Stats row */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px', marginBottom: '20px' }}
               className="animate-fade-up">
            {[
              { label: 'Total Events',     value: stats.totalEvents,          icon: '📅' },
              { label: 'Registrations',    value: stats.totalRegistrations,   icon: '👥' },
              { label: 'Pending Payments', value: stats.pendingPayments,      icon: '⏳',
                alert: stats.pendingPayments > 0 },
              { label: 'Approved',         value: stats.approvedRegistrations, icon: '✅' },
            ].map(stat => (
              <div key={stat.label} className="card-elevated"
                style={{ padding: '14px',
                         border: stat.alert ? '1.5px solid rgba(230,81,0,0.4)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'center',
                              justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '20px' }}>{stat.icon}</span>
                  {stat.alert && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%',
                                   background: 'var(--warning)' }} />
                  )}
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '28px',
                            color: stat.alert ? 'var(--warning)' : 'var(--primary)',
                            lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--muted)',
                            marginTop: '4px', fontWeight: '600',
                            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '16px' }} />
              ))}
            </div>
            {[1,2].map(i => (
              <div key={i} className="card" style={{ padding: '16px' }}>
                <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '10px' }} />
                <div className="skeleton" style={{ height: '14px', width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {/* No events */}
        {!loading && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px',
                         color: 'var(--primary)', marginBottom: '8px' }}>
              No events yet
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
              Create your first campus event and start getting registrations.
            </p>
            <button className="btn-primary" onClick={() => router.push('/organizer/create')}
              style={{ width: 'auto', padding: '12px 28px' }}>
              ＋ Create Event
            </button>
          </div>
        )}

        {/* Active events */}
        {!loading && activeEvents.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>
              Active Events ({activeEvents.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeEvents.map(ev => (
                <OrganizerEventCard key={ev.id} event={ev}
                  onClick={() => router.push(`/organizer/event/${ev.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Past events */}
        {!loading && pastEvents.length > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>
              Past Events ({pastEvents.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pastEvents.map(ev => (
                <OrganizerEventCard key={ev.id} event={ev} past
                  onClick={() => router.push(`/organizer/event/${ev.id}`)} />
              ))}
            </div>
          </div>
        )}

      </div>

      <OrganizerNav />
    </div>
  )
}

// ── Organizer Event Card ──────────────────────────────────────
function OrganizerEventCard({ event, past = false, onClick }:
  { event: EventSummary; past?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', textAlign: 'left', background: 'none',
               border: 'none', padding: 0, cursor: 'pointer' }}>
      <div className="card" style={{ padding: '14px', opacity: past ? 0.7 : 1,
                                      display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Poster */}
        <div style={{ width: '56px', height: '56px', borderRadius: '10px',
                      overflow: 'hidden', flexShrink: 0, background: 'var(--elevated)' }}>
          {event.main_poster_url
            ? <img src={event.main_poster_url} alt=""
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                📅
              </div>
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--primary)',
                       marginBottom: '4px', overflow: 'hidden',
                       textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.title}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
            {format(new Date(event.event_date), 'dd MMM yyyy')} · {event.venue}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`badge ${event.scope === 'global' ? 'badge-global' : 'badge-internal'}`}>
              {event.scope}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted)',
                           display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users style={{ width: '12px', height: '12px' }} />
              {event.registration_count}
              {event.max_registrations ? ` / ${event.max_registrations}` : ''}
            </span>
            {event.is_paid && (
              <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>
                ₹{event.price}
              </span>
            )}
          </div>
        </div>

        <ChevronRight style={{ width: '16px', height: '16px',
                                color: 'var(--muted)', flexShrink: 0 }} />
      </div>
    </button>
  )
}