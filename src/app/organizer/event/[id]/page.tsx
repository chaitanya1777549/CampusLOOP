'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OrganizerNav from '@/components/organizer/OrganizerNav'
import type { EventSummary, Registration } from '@/types'
import { format } from 'date-fns'
import {
  ArrowLeft, CheckCircle, XCircle,
  Eye, UserCheck, IndianRupee, Trash2
} from 'lucide-react'

type Tab = 'registrations' | 'details'
type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export default function OrganizerEventPage() {
  const router  = useRouter()
  const params  = useParams()
  const eventId = params.id as string

  const [event, setEvent]           = useState<EventSummary | null>(null)
  const [registrations, setRegs]    = useState<Registration[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<Tab>('registrations')
  const [actionLoading, setAction]  = useState<string | null>(null)
  const [selectedReg, setSelected]  = useState<Registration | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

function toggleExpand(id: string) {
  setExpandedRows(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}

  useEffect(() => {
    if (!eventId) return
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Fetch event
      const { data: ev, error: evErr } = await supabase
        .from('event_summary')
        .select('*')
        .eq('id', eventId)
        .single()

      if (evErr || !ev) { router.push('/organizer'); return }

      // Verify ownership via events table
      const { data: ownerCheck } = await supabase
        .from('events')
        .select('organizer_id')
        .eq('id', eventId)
        .single()

      if (!ownerCheck || ownerCheck.organizer_id !== user.id) {
        router.push('/organizer'); return
      }

      setEvent(ev)

      // Fetch registrations (no join to avoid RLS issues)
      const { data: regs, error: regErr } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (regErr) {
        console.error('Registrations fetch error:', regErr)
        setLoading(false)
        return
      }

      if (!regs || regs.length === 0) {
        setRegs([])
        setLoading(false)
        return
      }

      // Fetch student profiles separately
      const studentIds = regs.map((r: any) => r.student_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, phone, branch, year_of_study, section, roll_number')
        .in('id', studentIds)

      const profileMap: Record<string, any> = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, p])
      )
      const merged = regs.map((r: any) => ({
        ...r,
        student: profileMap[r.student_id] ?? null,
      }))

      setRegs(merged as unknown as Registration[])
      setLoading(false)
    }
    init()
  }, [eventId, router])

  async function refreshRegistrations() {
    const { data: regs } = await supabase
      .from('registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (!regs || regs.length === 0) { setRegs([]); return }

    const studentIds = regs.map((r: any) => r.student_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, phone, branch, year_of_study, section, roll_number')
      .in('id', studentIds)

    const profileMap: Record<string, any> = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.id, p])
    )
    const merged = regs.map((r: any) => ({
      ...r,
      student: profileMap[r.student_id] ?? null,
    }))
    setRegs(merged as unknown as Registration[])
  }

  async function handleApprove(reg: Registration) {
    setAction(reg.id)
    const { error } = await supabase
      .from('registrations')
      .update({
        status: 'approved',
        payment_status: reg.payment_status === 'pending' ? 'verified' : reg.payment_status,
        payment_verified_at: new Date().toISOString(),
      })
      .eq('id', reg.id)

    if (!error) await refreshRegistrations()
    setAction(null)
  }

  async function handleReject(reg: Registration) {
    setSelected(reg)
    setShowRejectModal(true)
  }

  async function confirmReject() {
    if (!selectedReg) return
    setAction(selectedReg.id)

    const { error } = await supabase
      .from('registrations')
      .update({
        status: 'rejected',
        rejection_reason: rejectReason.trim() || 'Rejected by organizer',
      })
      .eq('id', selectedReg.id)

    if (!error) await refreshRegistrations()
    setAction(null)
    setShowRejectModal(false)
    setSelected(null)
    setRejectReason('')
  }

  async function handleAttendance(reg: Registration) {
    setAction(reg.id + '-attend')
    const newAttended = !reg.attended
    const { error } = await supabase
      .from('registrations')
      .update({
        attended: newAttended,
        attended_at: newAttended ? new Date().toISOString() : null,
      })
      .eq('id', reg.id)

    if (!error) await refreshRegistrations()
    setAction(null)
  }

  async function handleDeleteEvent() {
    if (!confirm('Delete this event? This cannot be undone.')) return
    const { error } = await supabase
      .from('events').update({ is_active: false }).eq('id', eventId)
    if (!error) router.push('/organizer')
  }

  const filtered = registrations.filter(r =>
    filterStatus === 'all' ? true : r.status === filterStatus)

  const stats = {
    total:    registrations.length,
    pending:  registrations.filter(r => r.status === 'pending').length,
    approved: registrations.filter(r => r.status === 'approved').length,
    rejected: registrations.filter(r => r.status === 'rejected').length,
    attended: registrations.filter(r => r.attended).length,
    pendingPayments: registrations.filter(r => r.payment_status === 'pending').length,
  }

  if (loading || !event) {
    return (
      <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>
        <div style={{ height: '3px', background: 'var(--accent)' }} />
        <div style={{ padding: '16px' }}>
          <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '16px' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '70px', borderRadius: '12px' }} />)}
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ padding: '16px', marginBottom: '10px' }}>
              <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '14px', width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      {/* Header */}
      <div style={{ padding: '14px 16px', background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <button onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
                     color: 'var(--primary)', padding: '4px' }}>
            <ArrowLeft style={{ width: '22px', height: '22px' }} />
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '17px',
                       color: 'var(--primary)', flex: 1,
                       overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event.title}
          </h1>
          <button onClick={handleDeleteEvent}
            style={{ background: 'rgba(198,40,40,0.1)', border: 'none', cursor: 'pointer',
                     padding: '8px', borderRadius: '8px', color: 'var(--error)' }}>
            <Trash2 style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['registrations', 'details'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px',
                fontWeight: '600', border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--accent)' : 'var(--elevated)',
                color: tab === t ? '#fff' : 'var(--muted)',
                transition: 'all 0.2s', textTransform: 'capitalize',
                fontFamily: 'var(--font-body)',
              }}>
              {t === 'registrations' ? `Registrations (${stats.total})` : 'Event Details'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>

        {/* ── REGISTRATIONS TAB ── */}
        {tab === 'registrations' && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
                          gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Total',    value: stats.total,    color: 'var(--primary)' },
                { label: 'Approved', value: stats.approved, color: 'var(--success)' },
                { label: 'Pending',  value: stats.pending,  color: 'var(--warning)',
                  alert: stats.pendingPayments > 0 },
              ].map(s => (
                <div key={s.label} className="card-elevated"
                  style={{ padding: '12px', textAlign: 'center',
                           border: s.alert ? '1.5px solid rgba(230,81,0,0.4)' : undefined }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '26px',
                              color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px',
                              fontWeight: '600', textTransform: 'uppercase',
                              letterSpacing: '0.05em' }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Attendance */}
            <div className="card" style={{ padding: '12px', display: 'flex',
                                            alignItems: 'center', justifyContent: 'space-between',
                                            marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck style={{ width: '18px', height: '18px', color: 'var(--accent)' }} />
                <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '600' }}>
                  Attendance
                </span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)',
                             fontFamily: 'var(--font-display)' }}>
                {stats.attended} / {stats.approved}
              </span>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  style={{
                    padding: '5px 12px', borderRadius: '99px', fontSize: '12px',
                    fontWeight: '600', border: 'none', cursor: 'pointer',
                    background: filterStatus === f ? 'var(--accent)' : 'var(--elevated)',
                    color: filterStatus === f ? '#fff' : 'var(--muted)',
                    transition: 'all 0.2s', textTransform: 'capitalize',
                    fontFamily: 'var(--font-body)',
                  }}>
                  {f === 'all'      ? `All (${stats.total})` :
                   f === 'pending'  ? `Pending (${stats.pending})` :
                   f === 'approved' ? `Approved (${stats.approved})` :
                   `Rejected (${stats.rejected})`}
                </button>
              ))}
            </div>

            {/* Empty */}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>👥</span>
                <p style={{ fontSize: '16px', fontFamily: 'var(--font-display)',
                            color: 'var(--primary)', marginBottom: '6px' }}>
                  No registrations yet
                </p>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  Share your event to get registrations.
                </p>
              </div>
            )}

             {/* Registrations Table */}
{filtered.length > 0 && (()=> {
  const customFieldLabels: string[] = Array.isArray(event.custom_fields)
    ? (event.custom_fields as any[]).map((f: any) => f.label)
    : []
  const isGroup = (event as any).registration_type === 'group'
  const isPaid  = event.is_paid

  return (
    <div style={{ overflowX: 'auto', borderRadius: '14px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse',
                      fontSize: '13px', minWidth: '600px' }}>

        {/* Table header */}
        <thead>
          <tr style={{ background: 'var(--elevated)',
                       borderBottom: '2px solid var(--border)' }}>
            {[
              '#',
              'Name',
              'Roll No',
              'Branch',
              'Year',
              'Phone',
              ...customFieldLabels,
              ...(isPaid ? ['Payment', 'UTR'] : []),
              'Status',
              'Actions',
            ].map(col => (
              <th key={col}
                style={{ padding: '10px 12px', textAlign: 'left',
                         fontSize: '10px', fontWeight: '700',
                         color: 'var(--muted)', textTransform: 'uppercase',
                         letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>

        {/* Table body */}
        <tbody>
          {filtered.map((reg, idx) => {
            const student = reg.student as any
            const isActioning = actionLoading === reg.id
            const isExpanded  = expandedRows.has(reg.id)

            return (
  <React.Fragment key={reg.id}>
    {/* Main registration row */}
    <tr
                  style={{ borderBottom: '1px solid var(--border)',
                           background: idx % 2 === 0
                             ? 'var(--surface)' : 'var(--canvas)' }}>

                  {/* # with expand button for group leader */}
                  <td style={{ padding: '12px', color: 'var(--muted)',
                                fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {idx + 1}
                    {isGroup && reg.is_team_leader && (
                      <button onClick={() => toggleExpand(reg.id)}
                        style={{ marginLeft: '6px', background: 'none',
                                 border: 'none', cursor: 'pointer',
                                 color: 'var(--accent)', fontSize: '14px',
                                 padding: 0, fontFamily: 'var(--font-body)' }}>
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    )}
                  </td>

                  {/* Name */}
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                        {student?.name ?? '—'}
                      </span>
                      {reg.is_team_leader && (
                        <span style={{ fontSize: '10px', color: 'var(--accent)',
                                       fontWeight: '700' }}>👑</span>
                      )}
                    </div>
                    {isGroup && reg.team_name && (
                      <p style={{ fontSize: '11px', color: 'var(--muted)',
                                  marginTop: '2px' }}>
                        {reg.team_name}
                      </p>
                    )}
                  </td>

                  {/* Roll No */}
                  <td style={{ padding: '12px', fontFamily: 'monospace',
                                fontSize: '12px', color: 'var(--primary)',
                                whiteSpace: 'nowrap' }}>
                    {student?.roll_number ?? '—'}
                  </td>

                  {/* Branch */}
                  <td style={{ padding: '12px', color: 'var(--primary)',
                                whiteSpace: 'nowrap' }}>
                    {student?.branch?.split(' ').slice(0,2).join(' ') ?? '—'}
                  </td>

                  {/* Year */}
                  <td style={{ padding: '12px', color: 'var(--primary)',
                                whiteSpace: 'nowrap' }}>
                    {student?.year_of_study ? `Y${student.year_of_study}` : '—'}
                  </td>

                  {/* Phone */}
                  <td style={{ padding: '12px', color: 'var(--primary)',
                                whiteSpace: 'nowrap' }}>
                    {student?.phone ?? '—'}
                  </td>

                  {/* Custom field responses (leader's own responses) */}
                  {customFieldLabels.map(label => (
                    <td key={label}
                      style={{ padding: '12px', color: 'var(--primary)',
                               maxWidth: '140px', overflow: 'hidden',
                               textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(reg.custom_responses as any)?.[label] ?? '—'}
                    </td>
                  ))}

                  {/* Payment columns — only for paid events */}
                  {isPaid && (
                    <>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span className={`badge ${
                          reg.payment_status === 'verified' ? 'badge-approved' :
                          reg.payment_status === 'failed'   ? 'badge-rejected'
                                                            : 'badge-pending'
                        }`}>
                          {reg.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace',
                                    fontSize: '12px', color: 'var(--primary)',
                                    whiteSpace: 'nowrap' }}>
                        {reg.utr_number ?? '—'}
                      </td>
                    </>
                  )}

                  {/* Status badge */}
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                    <span className={`badge ${
                      reg.status === 'approved' ? 'badge-approved' :
                      reg.status === 'rejected' ? 'badge-rejected'
                                                : 'badge-pending'
                    }`}>
                      {reg.status}
                    </span>
                  </td>

                  {/* Action buttons */}
                  <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>

                      {/* Approve + Reject only when pending */}
                      {reg.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(reg)}
                            disabled={!!actionLoading}
                            style={{ padding: '6px 12px', borderRadius: '8px',
                                     background: 'rgba(46,125,50,0.1)',
                                     border: '1px solid rgba(46,125,50,0.3)',
                                     color: 'var(--success)', cursor: 'pointer',
                                     fontSize: '12px', fontWeight: '600',
                                     fontFamily: 'var(--font-body)',
                                     opacity: actionLoading ? 0.5 : 1 }}>
                            {isActioning ? '...' : '✓ Approve'}
                          </button>
                          <button onClick={() => handleReject(reg)}
                            disabled={!!actionLoading}
                            style={{ padding: '6px 12px', borderRadius: '8px',
                                     background: 'rgba(198,40,40,0.08)',
                                     border: '1px solid rgba(198,40,40,0.2)',
                                     color: 'var(--error)', cursor: 'pointer',
                                     fontSize: '12px', fontWeight: '600',
                                     fontFamily: 'var(--font-body)',
                                     opacity: actionLoading ? 0.5 : 1 }}>
                            ✗ Reject
                          </button>
                        </>
                      )}

                      {/* Once approved — only attendance button, no reject */}
                      {reg.status === 'approved' && (
                        <button onClick={() => handleAttendance(reg)}
                          disabled={!!actionLoading}
                          style={{ padding: '6px 12px', borderRadius: '8px',
                                   background: reg.attended
                                     ? 'rgba(201,94,26,0.1)' : 'var(--elevated)',
                                   border: `1px solid ${reg.attended
                                     ? 'rgba(201,94,26,0.3)' : 'var(--border)'}`,
                                   color: reg.attended
                                     ? 'var(--accent)' : 'var(--muted)',
                                   cursor: 'pointer', fontSize: '12px',
                                   fontWeight: '600',
                                   fontFamily: 'var(--font-body)' }}>
                          {actionLoading === reg.id + '-attend'
                            ? '...'
                            : reg.attended ? '✓ Present' : 'Mark Present'}
                        </button>
                      )}

                      {/* Rejected — show reason */}
                      {reg.status === 'rejected' && (
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {reg.rejection_reason
                            ? reg.rejection_reason.slice(0, 30) + '...'
                            : 'Rejected'}
                        </span>
                      )}

                    </div>
                  </td>

                </tr>

                {/* Expanded team member rows — only shows when ▼ is clicked */}
                {isGroup && reg.is_team_leader && isExpanded &&
                  ((reg.team_members ?? []) as any[]).map((m: any, mi: number) => (
                    <tr key={`${reg.id}-m-${mi}`}
                      style={{ borderBottom: '1px solid var(--border)',
                               background: 'rgba(201,94,26,0.03)' }}>

                      <td style={{ padding: '10px 12px', color: 'var(--muted)',
                                    fontSize: '12px' }}>
                        └ {mi + 1}
                      </td>

                      <td style={{ padding: '10px 12px', color: 'var(--primary)',
                                    fontSize: '13px' }}>
                        {m.name ?? '—'}
                      </td>

                      <td style={{ padding: '10px 12px', fontFamily: 'monospace',
                                    fontSize: '12px', color: 'var(--muted)' }}>
                        {m.roll_number ?? '—'}
                      </td>

                      <td style={{ padding: '10px 12px', color: 'var(--muted)',
                                    fontSize: '12px' }}>
                        {m.branch?.split(' ').slice(0,2).join(' ') ?? '—'}
                      </td>

                      <td style={{ padding: '10px 12px', color: 'var(--muted)',
                                    fontSize: '12px' }}>
                        {m.year_of_study ? `Y${m.year_of_study}` : '—'}
                      </td>

                      <td style={{ padding: '10px 12px', color: 'var(--muted)',
                                    fontSize: '12px' }}>
                        {m.phone ?? '—'}
                      </td>

                      {/* Member's own custom field responses */}
                      {customFieldLabels.map(label => (
                        <td key={label}
                          style={{ padding: '10px 12px', color: 'var(--muted)',
                                   fontSize: '12px', maxWidth: '140px',
                                   overflow: 'hidden', textOverflow: 'ellipsis',
                                   whiteSpace: 'nowrap' }}>
                          {m.custom_responses?.[label] ?? '—'}
                        </td>
                      ))}

                      {/* Empty cells to match payment + status + actions columns */}
                      {isPaid && <><td /><td /></>}
                      <td /><td />

                    </tr>
                  ))
                }
              </React.Fragment>
            )
          })}
        </tbody>

      </table>
    </div>
  )
})()}
          </>
        )}

        {/* ── DETAILS TAB ── */}
        {tab === 'details' && (
          <div className="animate-fade-up">
            {event.main_poster_url && (
              <div style={{ borderRadius: '14px', overflow: 'hidden',
                            height: '200px', marginBottom: '16px' }}>
                <img src={event.main_poster_url} alt={event.title}
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div className="card-elevated" style={{ padding: '16px', marginBottom: '12px' }}>
              {[
                ['Title',        event.title],
                ['Date',         format(new Date(event.event_date), 'EEE dd MMM yyyy · h:mm a')],
                ['Venue',        event.venue],
                ['Scope',        event.scope],
                ['Reg Type',     (event as any).registration_type ?? 'individual'],
                ['Team Size',    (event as any).registration_type === 'group'
                  ? `${(event as any).min_team_size}–${(event as any).max_team_size} members` : '—'],
                ['Deadline',     format(new Date(event.registration_expires), 'dd MMM yyyy')],
                ['Max Seats',    event.max_registrations?.toString() ?? 'Unlimited'],
                ['Price',        event.is_paid ? `₹${event.price}` : 'Free'],
                ['UPI ID',       event.upi_id ?? '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                                          padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: '600' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--primary)',
                                 textAlign: 'right', maxWidth: '60%' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                          letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>
                Description
              </p>
              <p style={{ fontSize: '14px', color: 'var(--primary)',
                          lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {event.description}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100,
                      background: 'rgba(26,15,0,0.6)', backdropFilter: 'blur(4px)',
                      display: 'flex', alignItems: 'flex-end' }}
             onClick={e => { if (e.target === e.currentTarget) setShowRejectModal(false) }}>
          <div style={{ width: '100%', background: 'var(--surface)',
                        borderRadius: '20px 20px 0 0', padding: '24px',
                        borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px',
                         color: 'var(--primary)', marginBottom: '6px' }}>
              Reject Registration
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
              Rejecting <strong style={{ color: 'var(--primary)' }}>
                {(selectedReg?.student as any)?.name}
              </strong>. Add a reason (optional):
            </p>
            <textarea className="input" rows={3}
              placeholder="e.g. Payment not received, UTR mismatch..."
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              style={{ resize: 'none', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowRejectModal(false)}
                className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={confirmReject} disabled={!!actionLoading}
                style={{ flex: 1, padding: '14px', borderRadius: '12px',
                         background: 'var(--error)', color: '#fff', border: 'none',
                         cursor: 'pointer', fontSize: '15px', fontWeight: '600',
                         fontFamily: 'var(--font-body)' }}>
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
            <div style={{ height: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      )}

      <OrganizerNav />
    </div>
  )
}