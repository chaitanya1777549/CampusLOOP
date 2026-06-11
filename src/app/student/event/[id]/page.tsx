'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { EventSummary, Profile, Registration, CustomField } from '@/types'
import { format } from 'date-fns'
import {
  ArrowLeft, Calendar, MapPin, Users, IndianRupee,
  ExternalLink, Upload, CheckCircle, Clock, X,
  Plus, Trash2, UserCheck
} from 'lucide-react'

interface TeamMember {
  roll_number: string
  name?: string
  email?: string
  phone?: string
  branch?: string
  year_of_study?: number
  profile_id?: string
  status: 'idle' | 'loading' | 'found' | 'error'
  error?: string
}

export default function EventDetailPage() {
  const router  = useRouter()
  const params  = useParams()
  const eventId = params.id as string

  const [event, setEvent]           = useState<EventSummary | null>(null)
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [registration, setReg]      = useState<Registration | null>(null)
  const [loading, setLoading]       = useState(true)
  const [regLoading, setRegLoading] = useState(false)
  const [error, setError]           = useState('')

  // Custom field responses
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({})
const [memberResponses, setMemberResponses] = useState<Record<number, Record<string, string>>>({})

  // Group registration state
  const [teamName, setTeamName]       = useState('')
  const [teammates, setTeammates]     = useState<TeamMember[]>([])

  // Payment state
  const [showPaymentFlow, setShowPaymentFlow] = useState(false)
  const [utrNumber, setUtrNumber]             = useState('')
  const [screenshot, setScreenshot]           = useState<File | null>(null)
  const [payLoading, setPayLoading]           = useState(false)
  const [payError, setPayError]               = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: ev }] = await Promise.all([
        supabase.from('profiles').select('*, college:colleges(*)').eq('id', user.id).single(),
        supabase.from('event_summary').select('*').eq('id', eventId).single(),
      ])

      if (!prof || !ev) { router.push('/student'); return }
      setProfile(prof)
      setEvent(ev)

      // Check existing registration (also check if in any team)
      const { data: reg } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('student_id', user.id)
        .single()

      if (reg) { setReg(reg); setLoading(false); return }

      // Check if student's roll number appears as a teammate in any registration
           // Check if student appears as a teammate in any registration — always run this
const { data: teamRegs } = await supabase
  .from('registrations')
  .select('id, team_name, team_members, status')
  .eq('event_id', eventId)

if (prof.roll_number) {
  const isTeamMember = (teamRegs ?? []).some(r =>
    (r.team_members as any[])?.some(
      (m: any) => m.roll_number === prof.roll_number
    )
  )
  if (isTeamMember) {
    setReg({ id: 'team-member', status: 'approved' } as any)
    setLoading(false)
    return
  }
}

      setLoading(false)
    }
    init()
  }, [eventId, router])

  // Initialize teammate slots when event loads
  useEffect(() => {
    if (!event || event.registration_type !== 'group') return
    const minSlots = (event.min_team_size ?? 2) - 1
    setTeammates(Array.from({ length: minSlots }, () => ({
      roll_number: '', status: 'idle'
    })))
  }, [event])

  // ── Look up teammate by roll number ──
  async function lookupTeammate(index: number, rollNumber: string) {
    if (!rollNumber.trim() || !profile) return

    // Check not same as leader
    if (rollNumber.toUpperCase() === (profile as any).roll_number?.toUpperCase()) {
      setTeammates(prev => prev.map((t, i) =>
        i === index ? { ...t, status: 'error', error: "You can't add yourself as a teammate" } : t))
      return
    }

    // Check not duplicate in current team
    const duplicateInTeam = teammates.some((t, i) =>
      i !== index && t.roll_number.toUpperCase() === rollNumber.toUpperCase())
    if (duplicateInTeam) {
      setTeammates(prev => prev.map((t, i) =>
        i === index ? { ...t, status: 'error', error: 'This student is already in your team' } : t))
      return
    }

    setTeammates(prev => prev.map((t, i) =>
      i === index ? { ...t, roll_number: rollNumber.toUpperCase(), status: 'loading' } : t))

    // Fetch from profiles
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('id, name, email, phone, branch, year_of_study, roll_number, college_id')
      .eq('roll_number', rollNumber.toUpperCase())
      .single()

    if (!studentProfile) {
      setTeammates(prev => prev.map((t, i) =>
        i === index ? { ...t, status: 'error', error: 'No student found with this roll number' } : t))
      return
    }

    // Check same college for internal events
    if (event?.scope === 'internal' && studentProfile.college_id !== profile.college_id) {
      setTeammates(prev => prev.map((t, i) =>
        i === index ? { ...t, status: 'error', error: 'Student must be from the same college' } : t))
      return
    }

    // Check not already registered for this event
    const { data: existingReg } = await supabase
      .from('registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('student_id', studentProfile.id)
      .single()

    if (existingReg) {
      setTeammates(prev => prev.map((t, i) =>
        i === index ? { ...t, status: 'error',
          error: 'This student is already registered for this event' } : t))
      return
    }

    // Check not in another team for this event
    const { data: teamRegs } = await supabase
      .from('registrations').select('team_members').eq('event_id', eventId)

    const alreadyInTeam = (teamRegs ?? []).some(r =>
      (r.team_members as any[])?.some((m: any) => m.roll_number === rollNumber.toUpperCase()))

    if (alreadyInTeam) {
      setTeammates(prev => prev.map((t, i) =>
        i === index ? { ...t, status: 'error',
          error: 'This student is already in another team for this event' } : t))
      return
    }

    setTeammates(prev => prev.map((t, i) =>
      i === index ? {
        roll_number: rollNumber.toUpperCase(),
        name: studentProfile.name,
        email: studentProfile.email,
        phone: studentProfile.phone,
        branch: studentProfile.branch,
        year_of_study: studentProfile.year_of_study,
        profile_id: studentProfile.id,
        status: 'found',
      } : t))
  }

  function addTeammateSlot() {
    if (!event) return
    if (teammates.length >= (event.max_team_size ?? 5) - 1) return
    setTeammates(prev => [...prev, { roll_number: '', status: 'idle' }])
  }

  function removeTeammateSlot(index: number) {
    if (!event) return
    if (teammates.length <= (event.min_team_size ?? 2) - 1) return
    setTeammates(prev => prev.filter((_, i) => i !== index))
  }

  // ── Individual registration ──
  async function handleIndividualRegister() {
    if (!profile || !event) return
    setRegLoading(true)
    setError('')

    try {
      const { data, error: regError } = await supabase
        .from('registrations')
        .insert({
          event_id: event.id,
          student_id: profile.id,
          custom_responses: customResponses,
          status: 'pending',
          payment_status: event.is_paid ? 'pending' : 'none',
          payment_amount: event.is_paid ? event.price : null,
          is_team_leader: false,
        })
        .select().single()

      if (regError) { setError(regError.message); return }
      setReg(data)

      if (event.is_paid) {
        // Open UPI
        if (event.upi_id) {
          const upiUrl = `upi://pay?pa=${event.upi_id}&pn=${encodeURIComponent(event.organizer_name)}&am=${event.price}&cu=INR&tn=${encodeURIComponent(`Campus Loop - ${event.title}`)}`
          window.location.href = upiUrl
        }
        setShowPaymentFlow(true)
      }
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setRegLoading(false)
    }
  }

  // ── Group registration ──
  async function handleGroupRegister() {
    if (!profile || !event) return

    // Validate team name
    if (!teamName.trim()) { setError('Please enter a team name'); return }

    // Validate all teammate slots are filled and found
    const minMembers = (event.min_team_size ?? 2) - 1
    const filledAndFound = teammates.filter(t => t.status === 'found')
    if (filledAndFound.length < minMembers) {
      setError(`Please add at least ${minMembers} teammate${minMembers > 1 ? 's' : ''} (minimum team size is ${event.min_team_size})`)
      return
    }

    const unfoundSlots = teammates.filter(t => t.roll_number && t.status !== 'found')
    if (unfoundSlots.length > 0) {
      setError('Some roll numbers are not verified. Please look them up first.')
      return
    }
    // Check max teams limit
if (event.max_teams) {
  const { count } = await supabase
    .from('registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('is_team_leader', true)

  if ((count ?? 0) >= event.max_teams) {
    setError(`Maximum number of teams (${event.max_teams}) has been reached for this event.`)
    return
  }
}

if (customFields.length > 0) {
  const requiredFields = customFields.filter(f => f.required)
  const foundTeammates = teammates.filter(t => t.status === 'found')

  // Check leader
  for (const field of requiredFields) {
    if (!customResponses[field.label]?.trim()) {
      setError(`Please fill "${field.label}" for yourself (leader)`)
      return
    }
  }

  // Check each member
  for (let i = 0; i < foundTeammates.length; i++) {
    for (const field of requiredFields) {
      if (!memberResponses[i]?.[field.label]?.trim()) {
        setError(`Please fill "${field.label}" for ${foundTeammates[i].name}`)
        return
      }
    }
  }
}
    setRegLoading(true)
    setError('')

    try {
      const teamMembersData = teammates
  .filter(t => t.status === 'found')
  .map((t, i) => ({
    roll_number: t.roll_number,
    name: t.name,
    email: t.email,
    phone: t.phone,
    branch: t.branch,
    year_of_study: t.year_of_study,
    profile_id: t.profile_id,
    custom_responses: memberResponses[i] ?? {},
  }))

      const totalAmount = event.is_paid
        ? event.price * (teamMembersData.length + 1)
        : 0

      const { data, error: regError } = await supabase
        .from('registrations')
        .insert({
          event_id: event.id,
          student_id: profile.id,
          custom_responses: customResponses,
          status: 'pending',
          payment_status: event.is_paid ? 'pending' : 'none',
          payment_amount: event.is_paid ? totalAmount : null,
          is_team_leader: true,
          team_name: teamName.trim(),
          team_members: teamMembersData,
        })
        .select().single()

      if (regError) { setError(regError.message); return }
      setReg(data)

      if (event.is_paid) {
        if (event.upi_id) {
          const upiUrl = `upi://pay?pa=${event.upi_id}&pn=${encodeURIComponent(event.organizer_name)}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`Campus Loop - ${event.title} - Team ${teamName}`)}`
          window.location.href = upiUrl
        }
        setShowPaymentFlow(true)
      }
    } catch {
      setError('Registration failed. Please try again.')
    } finally {
      setRegLoading(false)
    }
  }

  // ── Submit payment proof ──
  async function handlePaymentSubmit() {
    if (!registration || !profile) return
    if (!utrNumber || utrNumber.length < 12) {
      setPayError('Please enter a valid 12-digit UTR number'); return
    }
    if (!screenshot) { setPayError('Please upload your payment screenshot'); return }

    setPayLoading(true)
    setPayError('')

    try {
      const fileExt  = screenshot.name.split('.').pop()
      const fileName = `${registration.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs').upload(fileName, screenshot)
      if (uploadError) { setPayError(uploadError.message); return }

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs').getPublicUrl(fileName)

      const { data: updatedReg, error: updateError } = await supabase
        .from('registrations')
        .update({
          utr_number: utrNumber.trim(),
          payment_screenshot_url: publicUrl,
          payment_status: 'pending',
          payment_submitted_at: new Date().toISOString(),
        })
        .eq('id', registration.id)
        .select().single()

      if (updateError) { setPayError(updateError.message); return }
      setReg(updatedReg)
      setShowPaymentFlow(false)
    } catch {
      setPayError('Upload failed. Please try again.')
    } finally {
      setPayLoading(false)
    }
  }

  if (loading || !event) {
    return (
      <div className="page min-h-dvh">
        <div style={{ height: '3px', background: 'var(--accent)' }} />
        <div style={{ padding: '16px' }}>
          <div className="skeleton" style={{ height: '240px', borderRadius: '16px', marginBottom: '16px' }} />
          <div className="skeleton" style={{ height: '28px', width: '80%', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '16px', width: '60%', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '50%' }} />
        </div>
      </div>
    )
  }

  const isExpired    = new Date(event.registration_expires) < new Date()
  const isFull       = event.max_registrations
    ? event.registration_count >= event.max_registrations : false
  const canRegister  = !isExpired && !isFull && !registration
  const isGroup      = event.registration_type === 'group'
  const customFields: CustomField[] = Array.isArray(event.custom_fields) ? event.custom_fields : []

  const totalAmount = isGroup && event.is_paid
    ? event.price * (teammates.filter(t => t.status === 'found').length + 1)
    : event.price

  return (
    <div className="page min-h-dvh">
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      {/* Header */}
      <div style={{ padding: '14px 16px', background: 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    position: 'sticky', top: 0, zIndex: 40 }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
                   color: 'var(--primary)', padding: '4px' }}>
          <ArrowLeft style={{ width: '22px', height: '22px' }} />
        </button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '17px',
                     color: 'var(--primary)', flex: 1,
                     overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Event Details
        </h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span className={`badge ${event.scope === 'global' ? 'badge-global' : 'badge-internal'}`}>
            {event.scope}
          </span>
          {isGroup && (
            <span className="badge badge-pending">👥 Group</span>
          )}
        </div>
      </div>

      <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Poster */}
        <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--elevated)',
                      height: '220px', marginBottom: '20px' }}>
          {event.main_poster_url
            ? <img src={event.main_poster_url} alt={event.title}
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '64px' }}>📅</div>
          }
        </div>

        {/* Title */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-internal">{event.college_short_code}</span>
            {event.is_paid
              ? <span className="badge badge-global">₹{event.price}{isGroup ? '/person' : ''}</span>
              : <span className="badge badge-approved">Free</span>}
            {isGroup && (
              <span className="badge badge-pending">
                {event.min_team_size}–{event.max_team_size} members
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px',
                       color: 'var(--primary)', lineHeight: 1.3, marginBottom: '6px' }}>
            {event.title}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
            by <strong style={{ color: 'var(--primary)' }}>{event.organizer_name}</strong>
          </p>
        </div>

        {/* Registration status banner */}
        {registration && (
          <div style={{
            background: registration.status === 'approved'
              ? 'rgba(46,125,50,0.08)' : 'rgba(230,81,0,0.08)',
            border: `1px solid ${registration.status === 'approved'
              ? 'rgba(46,125,50,0.3)' : 'rgba(230,81,0,0.3)'}`,
            borderRadius: '12px', padding: '14px 16px', marginBottom: '16px',
          }}>
            <p style={{ fontWeight: '600', fontSize: '14px',
                        color: registration.status === 'approved'
                          ? 'var(--success)' : 'var(--warning)',
                        marginBottom: '4px' }}>
              {registration.id === 'team-member'
                ? '👥 You are registered as a team member'
                : registration.is_team_leader
                  ? `👑 Registered as Team Leader — "${registration.team_name}"`
                  : `✅ Registration ${registration.status}`}
            </p>
            {registration.payment_status === 'pending' && registration.id !== 'team-member' && (
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Payment submitted — awaiting organizer verification
              </p>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="card-elevated" style={{ padding: '16px', marginBottom: '16px' }}>
          {[
            { icon: Calendar, label: format(new Date(event.event_date), 'EEE, dd MMM yyyy · h:mm a') },
            { icon: MapPin,   label: event.venue },
            { icon: Users,    label: `${event.registration_count}${event.max_registrations ? ` / ${event.max_registrations}` : ''} registered` },
            { icon: Clock,    label: isExpired ? 'Registration closed'
              : `Register by ${format(new Date(event.registration_expires), 'dd MMM yyyy')}` },
          ].map(({ icon: Icon, label }, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px',
                                     padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <Icon style={{ width: '16px', height: '16px',
                              color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '14px', color: 'var(--primary)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                      letterSpacing: '0.1em', fontWeight: '600', marginBottom: '10px' }}>
            About this event
          </p>
          <p style={{ fontSize: '14px', color: 'var(--primary)',
                      lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {event.description}
          </p>
        </div>

        {/* ── REGISTRATION FORM ── */}
        {canRegister && (
          <>
            {/* Custom fields */}
            {customFields.length > 0 && (
              <div className="card-elevated" style={{ padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                            letterSpacing: '0.1em', fontWeight: '600', marginBottom: '14px' }}>
                  Additional Info Required
                </p>
                {customFields.map((field, i) => (
                  <div key={i} style={{ marginBottom: '14px' }}>
                    <label className="input-label">
                      {field.label}{field.required ? ' *' : ''}
                    </label>
                    {field.type === 'select'
                      ? <select className="select"
                          value={customResponses[field.label] ?? ''}
                          onChange={e => setCustomResponses(p =>
                            ({ ...p, [field.label]: e.target.value }))}>
                          <option value="" disabled>Select</option>
                          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      : field.type === 'textarea'
                        ? <textarea className="input" rows={3}
                            value={customResponses[field.label] ?? ''}
                            onChange={e => setCustomResponses(p =>
                              ({ ...p, [field.label]: e.target.value }))}
                            style={{ resize: 'vertical' }} />
                        : <input type="text" className="input"
                            value={customResponses[field.label] ?? ''}
                            onChange={e => setCustomResponses(p =>
                              ({ ...p, [field.label]: e.target.value }))} />
                    }
                  </div>
                ))}
              </div>
            )}

            {/* ── GROUP REGISTRATION FORM ── */}
            {isGroup && (
              <div className="card" style={{ padding: '20px', marginBottom: '16px',
                                              border: '1.5px solid rgba(201,94,26,0.3)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px',
                             color: 'var(--primary)', marginBottom: '4px' }}>
                  Team Registration
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '16px' }}>
                  You are registering as team leader. Add {event.min_team_size! - 1}–
                  {event.max_team_size! - 1} teammates using their roll numbers.
                </p>

                {/* Team name */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="input-label">Team Name *</label>
                  <input type="text" className="input"
                    placeholder="e.g. Team Infinity"
                    value={teamName} onChange={e => setTeamName(e.target.value)} />
                </div>

                {/* Team leader info */}
                <div style={{ padding: '12px', background: 'rgba(201,94,26,0.06)',
                              borderRadius: '10px', marginBottom: '14px',
                              display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px',
                                background: 'var(--accent)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontWeight: '700',
                                   fontFamily: 'var(--font-display)' }}>
                      {profile?.name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                      {profile?.name} <span style={{ color: 'var(--accent)', fontSize: '11px' }}>
                        👑 Leader
                      </span>
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {(profile as any)?.roll_number} · {profile?.branch?.split(' ').slice(0,2).join(' ')}
                    </p>
                  </div>
                </div>

                {/* Teammate slots */}
                <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                            letterSpacing: '0.05em', fontWeight: '600', marginBottom: '10px' }}>
                  Teammates ({teammates.filter(t => t.status === 'found').length} added)
                </p>

                {teammates.map((teammate, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="input"
                            placeholder={`Roll number (e.g. 21B01A0501)`}
                            value={teammate.roll_number}
                            style={{ flex: 1, fontFamily: 'monospace',
                                     borderColor: teammate.status === 'found'
                                       ? 'var(--success)'
                                       : teammate.status === 'error'
                                         ? 'var(--error)' : undefined }}
                            onChange={e => {
                              const val = e.target.value.toUpperCase()
                              setTeammates(prev => prev.map((t, idx) =>
                                idx === i ? { ...t, roll_number: val, status: 'idle', error: undefined, name: undefined } : t))
                            }}
                          />
                          <button type="button"
                            onClick={() => lookupTeammate(i, teammate.roll_number)}
                            disabled={!teammate.roll_number || teammate.status === 'loading'}
                            style={{ padding: '12px 14px', borderRadius: '10px',
                                     background: 'var(--accent)', border: 'none',
                                     color: '#fff', cursor: 'pointer', fontSize: '12px',
                                     fontWeight: '600', fontFamily: 'var(--font-body)',
                                     flexShrink: 0,
                                     opacity: !teammate.roll_number ? 0.5 : 1 }}>
                            {teammate.status === 'loading' ? '...' : 'Lookup'}
                          </button>
                          {teammates.length > (event.min_team_size! - 1) && (
                            <button type="button" onClick={() => removeTeammateSlot(i)}
                              style={{ padding: '12px', borderRadius: '10px',
                                       background: 'rgba(198,40,40,0.1)',
                                       border: 'none', cursor: 'pointer',
                                       color: 'var(--error)', flexShrink: 0 }}>
                              <Trash2 style={{ width: '16px', height: '16px' }} />
                            </button>
                          )}
                        </div>

                        {/* Found student card */}
                        {teammate.status === 'found' && (
                          <div style={{ marginTop: '8px', padding: '10px 12px',
                                        background: 'rgba(46,125,50,0.06)',
                                        border: '1px solid rgba(46,125,50,0.25)',
                                        borderRadius: '8px', display: 'flex',
                                        alignItems: 'center', gap: '8px' }}>
                            <UserCheck style={{ width: '16px', height: '16px',
                                                color: 'var(--success)', flexShrink: 0 }} />
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: '600',
                                          color: 'var(--primary)' }}>
                                {teammate.name}
                              </p>
                              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                {teammate.roll_number} · {teammate.branch?.split(' ').slice(0,2).join(' ')} · Year {teammate.year_of_study}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Custom fields for this teammate */}
{teammate.status === 'found' && customFields.length > 0 && (
  <div style={{ marginTop: '10px', padding: '12px',
                background: 'var(--elevated)', borderRadius: '10px',
                border: '1px solid var(--border)' }}>
    <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: '10px' }}>
      Details for {teammate.name}
    </p>
    {customFields.map((field, fi) => (
      <div key={fi} style={{ marginBottom: '10px' }}>
        <label className="input-label">
          {field.label}{field.required ? ' *' : ''}
        </label>
        {field.type === 'select'
          ? <select className="select"
              value={memberResponses[i]?.[field.label] ?? ''}
              onChange={e => setMemberResponses(p => ({
                ...p,
                [i]: { ...(p[i] ?? {}), [field.label]: e.target.value }
              }))}>
              <option value="" disabled>Select</option>
              {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          : field.type === 'textarea'
            ? <textarea className="input" rows={2}
                value={memberResponses[i]?.[field.label] ?? ''}
                onChange={e => setMemberResponses(p => ({
                  ...p,
                  [i]: { ...(p[i] ?? {}), [field.label]: e.target.value }
                }))}
                style={{ resize: 'vertical' }} />
            : <input type="text" className="input"
                value={memberResponses[i]?.[field.label] ?? ''}
                onChange={e => setMemberResponses(p => ({
                  ...p,
                  [i]: { ...(p[i] ?? {}), [field.label]: e.target.value }
                }))} />
        }
      </div>
    ))}
  </div>
)}

                        {/* Error */}
                        {teammate.status === 'error' && (
                          <div style={{ marginTop: '6px', padding: '8px 12px',
                                        background: 'rgba(198,40,40,0.06)',
                                        border: '1px solid rgba(198,40,40,0.2)',
                                        borderRadius: '8px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--error)' }}>
                              ❌ {teammate.error}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add teammate button */}
                {teammates.length < (event.max_team_size! - 1) && (
                  <button type="button" onClick={addTeammateSlot}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px',
                             background: 'none', border: `1.5px dashed var(--border)`,
                             borderRadius: '10px', cursor: 'pointer', padding: '10px 14px',
                             width: '100%', justifyContent: 'center', marginTop: '4px',
                             color: 'var(--muted)', fontSize: '13px',
                             fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}>
                    <Plus style={{ width: '16px', height: '16px' }} />
                    Add Teammate ({teammates.length + 1}/{event.max_team_size! - 1} max)
                  </button>
                )}

                {/* Team summary */}
                {event.is_paid && (
                  <div style={{ marginTop: '16px', padding: '12px',
                                background: 'var(--elevated)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                                  marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        Team size
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                        {teammates.filter(t => t.status === 'found').length + 1} members
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        Total amount
                      </span>
                      <span style={{ fontSize: '16px', color: 'var(--accent)',
                                     fontWeight: '700', fontFamily: 'var(--font-display)' }}>
                        ₹{totalAmount}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      ₹{event.price} × {teammates.filter(t => t.status === 'found').length + 1} people
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Payment flow */}
        {showPaymentFlow && (
          <div className="card" style={{ padding: '20px', marginBottom: '16px',
                                          border: '1.5px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px',
                           color: 'var(--primary)' }}>
                Complete Payment
              </h3>
              <button onClick={() => setShowPaymentFlow(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                         color: 'var(--muted)' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '16px',
                          background: 'var(--elevated)', borderRadius: '12px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--muted)',
                          textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Amount to pay
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '36px',
                          color: 'var(--accent)', marginTop: '4px' }}>
                ₹{registration?.payment_amount ?? totalAmount}
              </p>
              {isGroup && (
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  Full team payment
                </p>
              )}
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                to {event.upi_id}
              </p>
            </div>

            {event.upi_qr_url && (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                  Scan QR with any UPI app
                </p>
                <img src={event.upi_qr_url} alt="UPI QR"
                     style={{ width: '160px', height: '160px', borderRadius: '12px',
                              border: '2px solid var(--border)', margin: '0 auto' }} />
              </div>
            )}

            {event.upi_id && (
              <a href={`upi://pay?pa=${event.upi_id}&pn=${encodeURIComponent(event.organizer_name)}&am=${registration?.payment_amount ?? totalAmount}&cu=INR`}
                 className="btn-primary"
                 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '8px', marginBottom: '16px', textDecoration: 'none',
                          color: '#fff', padding: '14px' }}>
                <ExternalLink style={{ width: '16px', height: '16px' }} />
                Open UPI App to Pay ₹{registration?.payment_amount ?? totalAmount}
              </a>
            )}

            <div style={{ height: '1px', background: 'var(--border)', marginBottom: '16px' }} />
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)',
                        marginBottom: '12px' }}>
              After paying, submit proof below:
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label className="input-label">UTR Number (12 digits)</label>
              <input type="text" className="input" placeholder="e.g. 123456789012"
                value={utrNumber} maxLength={12} inputMode="numeric"
                onChange={e => setUtrNumber(e.target.value.replace(/\D/g, ''))} />
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Find in UPI app → Transactions → UTR/Reference No.
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">Payment Screenshot</label>
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '8px', padding: '20px',
                border: `2px dashed ${screenshot ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '12px', cursor: 'pointer',
                background: screenshot ? 'rgba(201,94,26,0.04)' : 'var(--elevated)',
                transition: 'all 0.2s',
              }}>
                {screenshot
                  ? <><CheckCircle style={{ width: '24px', height: '24px', color: 'var(--accent)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '600' }}>
                        {screenshot.name}
                      </span>
                    </>
                  : <><Upload style={{ width: '24px', height: '24px', color: 'var(--muted)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                        Tap to upload screenshot
                      </span>
                    </>
                }
                <input type="file" accept="image/*" style={{ display: 'none' }}
                       onChange={e => { const f = e.target.files?.[0]; if (f) setScreenshot(f) }} />
              </label>
            </div>

            {payError && (
              <div style={{ background: 'rgba(198,40,40,0.08)',
                            border: '1px solid rgba(198,40,40,0.2)',
                            borderRadius: '10px', padding: '10px 14px',
                            color: 'var(--error)', fontSize: '13px', marginBottom: '12px' }}>
                {payError}
              </div>
            )}

            <button className="btn-primary" onClick={handlePaymentSubmit} disabled={payLoading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {payLoading
                ? <span className="animate-pulse-soft">Submitting...</span>
                : '✅ Submit Payment Proof'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(198,40,40,0.08)',
                        border: '1px solid rgba(198,40,40,0.2)',
                        borderRadius: '10px', padding: '12px 14px',
                        color: 'var(--error)', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Action buttons */}
        {!showPaymentFlow && canRegister && (
          isGroup
            ? <button className="btn-primary" onClick={handleGroupRegister}
                disabled={regLoading}
                style={{ display: 'flex', alignItems: 'center',
                         justifyContent: 'center', gap: '8px' }}>
                {regLoading
                  ? <span className="animate-pulse-soft">Registering team...</span>
                  : event.is_paid
                    ? `👥 Register Team · Pay ₹${totalAmount}`
                    : '👥 Register Team — Free'}
              </button>
            : event.is_paid
              ? <button className="btn-primary" onClick={handleIndividualRegister}
                  disabled={regLoading}
                  style={{ display: 'flex', alignItems: 'center',
                           justifyContent: 'center', gap: '8px' }}>
                  {regLoading
                    ? <span className="animate-pulse-soft">Processing...</span>
                    : <><IndianRupee style={{ width: '16px', height: '16px' }} />
                        Pay ₹{event.price} & Register</>}
                </button>
              : <button className="btn-primary" onClick={handleIndividualRegister}
                  disabled={regLoading}
                  style={{ display: 'flex', alignItems: 'center',
                           justifyContent: 'center', gap: '8px' }}>
                  {regLoading
                    ? <span className="animate-pulse-soft">Registering...</span>
                    : '🎉 Register Now — Free'}
                </button>
        )}

        {isExpired && !registration && (
          <div className="btn-secondary"
               style={{ textAlign: 'center', opacity: 0.5, cursor: 'not-allowed' }}>
            Registration Closed
          </div>
        )}
        {isFull && !registration && (
          <div className="btn-secondary"
               style={{ textAlign: 'center', opacity: 0.5, cursor: 'not-allowed' }}>
            Event Full
          </div>
        )}

        <div style={{ height: '24px' }} />
      </div>
    </div>
  )
}