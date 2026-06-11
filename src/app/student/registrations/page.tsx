'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StudentNav from '@/components/student/StudentNav'
import { format } from 'date-fns'
import { Calendar, MapPin, ArrowRight, X, MapPin as Venue, Hash } from 'lucide-react'
import type { Registration, EventSummary } from '@/types'

export default function MyRegistrationsPage() {
  const router = useRouter()
  const [registrations, setRegistrations] = useState<(Registration & { event: EventSummary })[]>([])
  const [loading, setLoading] = useState(true)
  const [ticketReg, setTicketReg] = useState<(Registration & { event: EventSummary }) | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Step 1: fetch registrations
      const { data: regs } = await supabase
        .from('registrations')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (!regs || regs.length === 0) { setLoading(false); return }

      // Step 2: fetch events separately
      const eventIds = [...new Set(regs.map((r: any) => r.event_id))]
      const { data: events } = await supabase
        .from('event_summary')
        .select('*')
        .in('id', eventIds)

      const eventMap: Record<string, EventSummary> = Object.fromEntries(
        (events ?? []).map((e: any) => [e.id, e])
      )

      const merged = regs
        .map((r: any) => ({ ...r, event: eventMap[r.event_id] ?? null }))
        .filter((r: any) => r.event !== null)

      setRegistrations(merged)
      setLoading(false)
    }
    init()
  }, [router])

  const getStatusStyle = (reg: Registration) => {
    if (reg.status === 'approved') return { color: 'var(--success)', bg: 'rgba(46,125,50,0.08)', label: '✅ Approved' }
    if (reg.status === 'rejected') return { color: 'var(--error)', bg: 'rgba(198,40,40,0.08)', label: '❌ Rejected' }
    if (reg.payment_status === 'pending') return { color: 'var(--warning)', bg: 'rgba(230,81,0,0.08)', label: '⏳ Payment Review' }
    return { color: 'var(--warning)', bg: 'rgba(230,81,0,0.08)', label: '⏳ Pending' }
  }

  return (
    <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      <div style={{ padding: '16px 20px', background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    position: 'sticky', top: 0, zIndex: 40 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                     color: 'var(--primary)' }}>My Registrations</h1>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
          {registrations.length} event{registrations.length !== 1 ? 's' : ''} registered
        </p>
      </div>

      <div style={{ padding: '16px' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3].map(i => (
              <div key={i} className="card" style={{ padding: '16px' }}>
                <div className="skeleton" style={{ height: '18px', width: '70%', marginBottom: '10px' }} />
                <div className="skeleton" style={{ height: '14px', width: '50%', marginBottom: '6px' }} />
                <div className="skeleton" style={{ height: '14px', width: '40%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && registrations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🎟️</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px',
                         color: 'var(--primary)', marginBottom: '8px' }}>
              No registrations yet
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>
              Browse events on your campus and register!
            </p>
            <button className="btn-primary" onClick={() => router.push('/student')}
              style={{ width: 'auto', padding: '12px 24px' }}>
              Browse Events
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {registrations.map(reg => {
            const ev = reg.event
            const statusStyle = getStatusStyle(reg)

            return (
              <button key={reg.id}
                onClick={() => reg.status === 'approved'
                  ? setTicketReg(reg)
                  : router.push(`/student/event/${reg.event_id}`)
                }
                style={{ width: '100%', textAlign: 'left', background: 'none',
                         border: 'none', padding: 0, cursor: 'pointer' }}>
                <div className="card" style={{ padding: '16px', display: 'flex',
                                               alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '10px',
                                overflow: 'hidden', flexShrink: 0, background: 'var(--elevated)' }}>
                    {ev.main_poster_url
                      ? <img src={ev.main_poster_url} alt=""
                             style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex',
                                      alignItems: 'center', justifyContent: 'center',
                                      fontSize: '24px' }}>📅</div>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--primary)',
                                 marginBottom: '6px', overflow: 'hidden',
                                 textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                      <Calendar style={{ width: '12px', height: '12px', color: 'var(--muted)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {format(new Date(ev.event_date), 'dd MMM yyyy')}
                      </span>
                    </div>
                    {reg.is_team_leader && reg.team_name && (
                      <p style={{ fontSize: '11px', color: 'var(--accent)',
                                  fontWeight: '600', marginBottom: '4px' }}>
                        👑 Team: {reg.team_name}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center',
                                  justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 8px',
                                     borderRadius: '99px', fontSize: '11px', fontWeight: '600',
                                     background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                      {reg.status === 'approved' && (
                        <span style={{ fontSize: '11px', color: 'var(--accent)',
                                       fontWeight: '600' }}>
                          View Ticket →
                        </span>
                      )}
                    </div>
                  </div>

                  <ArrowRight style={{ width: '16px', height: '16px',
                                       color: 'var(--muted)', flexShrink: 0,
                                       alignSelf: 'center' }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Ticket Modal */}
      {ticketReg && (
        <TicketModal reg={ticketReg} onClose={() => setTicketReg(null)} />
      )}

      <StudentNav />
    </div>
  )
}

function TicketModal({ reg, onClose }: {
  reg: Registration & { event: EventSummary }
  onClose: () => void
}) {
  const ev = reg.event
  const shortId = reg.id.split('-')[0].toUpperCase()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100,
                  background: 'rgba(26,15,0,0.7)', backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', maxWidth: '480px',
                    background: 'var(--canvas)', borderRadius: '24px 24px 0 0',
                    padding: '0 0 40px', overflow: 'hidden' }}>

        {/* Ticket top strip */}
        <div style={{ height: '6px', background: 'var(--accent)' }} />

        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0' }}>
          <button onClick={onClose}
            style={{ background: 'var(--elevated)', border: 'none', cursor: 'pointer',
                     borderRadius: '50%', width: '32px', height: '32px',
                     display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: '16px', height: '16px', color: 'var(--muted)' }} />
          </button>
        </div>

        {/* Poster */}
        {ev.main_poster_url && (
          <div style={{ margin: '0 20px 20px', borderRadius: '16px',
                        overflow: 'hidden', height: '160px' }}>
            <img src={ev.main_poster_url} alt={ev.title}
                 style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ padding: '0 20px' }}>

          {/* Event name + college */}
          <div style={{ marginBottom: '20px' }}>
            <span className="badge badge-approved" style={{ marginBottom: '8px', display: 'inline-block' }}>
              ✅ Confirmed
            </span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                         color: 'var(--primary)', lineHeight: 1.3, marginBottom: '4px' }}>
              {ev.title}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {ev.college_name} · by {ev.organizer_name}
            </p>
          </div>

          {/* Dashed divider */}
          <div style={{ borderTop: '2px dashed var(--border)', marginBottom: '20px' }} />

          {/* Event details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Date', value: format(new Date(ev.event_date), 'dd MMM yyyy') },
              { label: 'Time', value: format(new Date(ev.event_date), 'h:mm a') },
              { label: 'Venue', value: ev.venue },
              { label: 'Type', value: ev.registration_type === 'group' ? 'Group' : 'Individual' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase',
                            letterSpacing: '0.08em', fontWeight: '600', marginBottom: '3px' }}>
                  {label}
                </p>
                <p style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '600' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Dashed divider */}
          <div style={{ borderTop: '2px dashed var(--border)', marginBottom: '20px' }} />

          {/* Student / team info */}
          {reg.is_team_leader && reg.team_name ? (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase',
                          letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
                Team: {reg.team_name}
              </p>
              {/* Leader */}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                            padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                  👑 Leader
                </span>
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                  {(reg as any).student?.roll_number ?? '—'}
                </span>
              </div>
              {/* Members */}
              {((reg.team_members ?? []) as any[]).map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                      padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--primary)' }}>{m.name}</span>
                  <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                    {m.roll_number}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase',
                          letterSpacing: '0.08em', fontWeight: '600', marginBottom: '6px' }}>
                Registered As
              </p>
              <p style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: '600' }}>
                {(reg as any).student?.name ?? 'Student'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                {(reg as any).student?.roll_number ?? '—'}
              </p>
            </div>
          )}

          {/* Dashed divider */}
          <div style={{ borderTop: '2px dashed var(--border)', marginBottom: '20px' }} />

          {/* Stamp + ID */}
          <div style={{ display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase',
                          letterSpacing: '0.08em', fontWeight: '600', marginBottom: '3px' }}>
                Registration ID
              </p>
              <p style={{ fontSize: '13px', color: 'var(--primary)',
                          fontFamily: 'monospace', fontWeight: '700' }}>
                CL-{shortId}
              </p>
            </div>
            {/* Stamp */}
            <div style={{ width: '64px', height: '64px', borderRadius: '50%',
                          border: '3px solid var(--accent)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          opacity: 0.85 }}>
              <span style={{ fontSize: '20px', lineHeight: 1 }}>🎟️</span>
              <span style={{ fontSize: '8px', color: 'var(--accent)', fontWeight: '800',
                             letterSpacing: '0.05em', marginTop: '2px' }}>
                CONFIRMED
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}