'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import OrganizerNav from '@/components/organizer/OrganizerNav'
import type { Profile, CustomField } from '@/types'
import { ArrowLeft, Plus, Trash2, Upload, Globe, Lock, User, Users } from 'lucide-react'

// ── Section wrapper — outside component to prevent re-render ──
function Section({ title, desc, children }: {
  title: string; desc?: string; children: React.ReactNode
}) {
  return (
    <div className="card-elevated" style={{ padding: '20px', marginBottom: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                    letterSpacing: '0.1em', fontWeight: '600' }}>{title}</p>
        {desc && <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>{desc}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {children}
      </div>
    </div>
  )
}

export default function CreateEventPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Media
  const [posterFile, setPosterFile]     = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState('')
  const [upiQrFile, setUpiQrFile]       = useState<File | null>(null)
  const [upiQrPreview, setUpiQrPreview] = useState('')

  // Basic fields — each as individual state to prevent cursor jump
  const [title, setTitle]               = useState('')
  const [description, setDescription]   = useState('')
  const [venue, setVenue]               = useState('')
  const [eventDate, setEventDate]       = useState('')
  const [regExpires, setRegExpires]     = useState('')
  const [maxRegs, setMaxRegs]           = useState('')

  // Visibility
  const [scope, setScope] = useState<'internal' | 'global'>('internal')

  // Payment
  const [isPaid, setIsPaid]   = useState(false)
  const [price, setPrice]     = useState('')
  const [upiId, setUpiId]     = useState('')

  // Registration type
  const [maxTeams, setMaxTeams] = useState('')
  const [regType, setRegType]       = useState<'individual' | 'group'>('individual')
  const [minTeamSize, setMinTeamSize] = useState('2')
  const [maxTeamSize, setMaxTeamSize] = useState('5')

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase
        .from('profiles').select('*, college:colleges(*)')
        .eq('id', user.id).single()
      if (!prof || !prof.is_verified) { router.push('/pending'); return }
      setProfile(prof)
    }
    init()
  }, [router])

  function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPosterFile(file)
    setPosterPreview(URL.createObjectURL(file))
  }

  function handleUpiQrChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUpiQrFile(file)
    setUpiQrPreview(URL.createObjectURL(file))
  }

  function addCustomField() {
    setCustomFields(prev => [...prev, { label: '', type: 'text', required: true, options: [] }])
  }

  function updateCustomField(index: number, key: keyof CustomField, value: any) {
    setCustomFields(prev => prev.map((f, i) => i === index ? { ...f, [key]: value } : f))
  }

  function removeCustomField(index: number) {
    setCustomFields(prev => prev.filter((_, i) => i !== index))
  }

  function addOption(fieldIndex: number) {
    setCustomFields(prev => prev.map((f, i) =>
      i === fieldIndex ? { ...f, options: [...(f.options ?? []), ''] } : f))
  }

  function updateOption(fieldIndex: number, optIndex: number, value: string) {
    setCustomFields(prev => prev.map((f, i) =>
      i === fieldIndex
        ? { ...f, options: f.options?.map((o, oi) => oi === optIndex ? value : o) }
        : f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    // Validate team sizes
    if (regType === 'group') {
      if (parseInt(minTeamSize) < 2) { setError('Minimum team size must be at least 2'); return }
      if (parseInt(maxTeamSize) < parseInt(minTeamSize)) {
        setError('Maximum team size must be greater than minimum'); return
      }
    }

    if (regType === 'group' && !maxTeams) {
  setError('Please set maximum number of teams allowed')
  return
}

    setLoading(true)
    setError('')

    try {
      let posterUrl = ''
      let upiQrUrl  = ''

      if (posterFile) {
        const ext  = posterFile.name.split('.').pop()
        const path = `${profile.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('event-posters').upload(path, posterFile)
        if (upErr) { setError(`Poster upload: ${upErr.message}`); return }
        const { data: { publicUrl } } = supabase.storage
          .from('event-posters').getPublicUrl(path)
        posterUrl = publicUrl
      }

      if (upiQrFile) {
        const ext  = upiQrFile.name.split('.').pop()
        const path = `qr-${profile.id}-${Date.now()}.${ext}`
        const { error: qrErr } = await supabase.storage
          .from('upi-qr-codes').upload(path, upiQrFile)
        if (!qrErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('upi-qr-codes').getPublicUrl(path)
          upiQrUrl = publicUrl
        }
      }

      const { data: newEvent, error: insertErr } = await supabase
        .from('events')
        .insert({
          organizer_id: profile.id,
          college_id: profile.college_id,
          title: title.trim(),
          description: description.trim(),
          venue: venue.trim(),
          event_date: new Date(eventDate).toISOString(),
          registration_expires: new Date(regExpires).toISOString(),
          scope,
          is_paid: isPaid,
          price: isPaid ? parseFloat(price) : 0,
          upi_id: isPaid ? upiId.trim() : null,
          upi_qr_url: upiQrUrl || null,
          max_registrations: maxRegs ? parseInt(maxRegs) : null,
          main_poster_url: posterUrl,
          custom_fields: customFields.filter(f => f.label.trim()),
          registration_type: regType,
          min_team_size: regType === 'group' ? parseInt(minTeamSize) : null,
          max_team_size: regType === 'group' ? parseInt(maxTeamSize) : null,
          max_teams: regType === 'group' ? parseInt(maxTeams) : null,
          is_active: true,
        })
        .select().single()

      if (insertErr) { setError(insertErr.message); return }
      router.push(`/organizer/event/${newEvent.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page min-h-dvh" style={{ paddingBottom: '100px' }}>
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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px',
                     color: 'var(--primary)', flex: 1 }}>
          Create Event
        </h1>
      </div>

      <form onSubmit={handleSubmit}
            style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Poster */}
        <div style={{ marginBottom: '16px' }}>
          <label className="input-label">Event Poster *</label>
          <label style={{
            display: 'block', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
            border: `2px dashed ${posterPreview ? 'var(--accent)' : 'var(--border)'}`,
            height: posterPreview ? 'auto' : '160px',
            background: 'var(--elevated)', transition: 'all 0.2s',
          }}>
            {posterPreview
              ? <img src={posterPreview} alt="Poster"
                     style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }} />
              : <div style={{ height: '160px', display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Upload style={{ width: '28px', height: '28px', color: 'var(--muted)' }} />
                  <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Tap to upload poster</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>JPG, PNG up to 5MB</span>
                </div>
            }
            <input type="file" accept="image/*" style={{ display: 'none' }}
                   onChange={handlePosterChange} />
          </label>
        </div>

        {/* Basic info */}
        <Section title="Event Details">
          <div>
            <label className="input-label">Event Title *</label>
            <input type="text" className="input" placeholder="e.g. Tech Fest 2025"
              value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="input-label">Description *</label>
            <textarea className="input" rows={4}
              placeholder="Describe your event..."
              value={description} onChange={e => setDescription(e.target.value)}
              style={{ resize: 'vertical' }} required />
          </div>
          <div>
            <label className="input-label">Venue *</label>
            <input type="text" className="input" placeholder="e.g. Seminar Hall, Block A"
              value={venue} onChange={e => setVenue(e.target.value)} required />
          </div>
        </Section>

        {/* Date */}
        <Section title="Date & Registration">
          <div>
            <label className="input-label">Event Date & Time *</label>
            <input type="datetime-local" className="input"
              value={eventDate} onChange={e => setEventDate(e.target.value)} required />
          </div>
          <div>
            <label className="input-label">Registration Deadline *</label>
            <input type="datetime-local" className="input"
              value={regExpires} onChange={e => setRegExpires(e.target.value)} required />
          </div>
          <div>
            <label className="input-label">Max Registrations (blank = unlimited)</label>
            <input type="number" className="input" placeholder="e.g. 100"
              value={maxRegs} min={1} onChange={e => setMaxRegs(e.target.value)} />
          </div>
        </Section>

        {/* Registration Type */}
        <Section title="Registration Type" desc="Choose how students register for this event">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {([
              { val: 'individual' as const, icon: User,  label: 'Individual',
                desc: 'Each student registers alone' },
              { val: 'group' as const,      icon: Users, label: 'Group / Team',
                desc: 'Leader registers with teammates' },
            ]).map(opt => (
              <button key={opt.val} type="button" onClick={() => setRegType(opt.val)}
                style={{
                  padding: '14px', borderRadius: '12px', cursor: 'pointer',
                  border: `2px solid ${regType === opt.val ? 'var(--accent)' : 'var(--border)'}`,
                  background: regType === opt.val ? 'rgba(201,94,26,0.06)' : 'var(--surface)',
                  transition: 'all 0.2s', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                }}>
                <opt.icon style={{ width: '22px', height: '22px',
                                    color: regType === opt.val ? 'var(--accent)' : 'var(--muted)' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-body)',
                               color: regType === opt.val ? 'var(--accent)' : 'var(--primary)' }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Team size fields */}
          {regType === 'group' && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ background: 'rgba(201,94,26,0.06)',
                            border: '1px solid rgba(201,94,26,0.2)',
                            borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--accent)', lineHeight: 1.6 }}>
                  👥 Team leader registers and adds teammates using their roll numbers.
                  Backend auto-fetches their details.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Min Team Size *</label>
                  <input type="number" className="input" placeholder="e.g. 2"
                    value={minTeamSize} min={2} max={20}
                    onChange={e => setMinTeamSize(e.target.value)}
                    required={regType === 'group'} />
                </div>
                <div>
                  <label className="input-label">Max Team Size *</label>
                  <input type="number" className="input" placeholder="e.g. 5"
                    value={maxTeamSize} min={2} max={20}
                    onChange={e => setMaxTeamSize(e.target.value)}
                    required={regType === 'group'} />
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                Including the team leader in the count
              </p>
              <div style={{ marginTop: '12px' }}>
  <label className="input-label">Max Number of Teams *</label>
  <input type="number" className="input" placeholder="e.g. 20"
    value={maxTeams} min={1}
    onChange={e => setMaxTeams(e.target.value)}
    required={regType === 'group'} />
  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
    Maximum number of teams allowed to register
  </p>
</div>
            </div>
          )}
        </Section>

        {/* Visibility */}
        <Section title="Visibility">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {([
              { val: 'internal' as const, icon: Lock,  label: 'Internal', desc: 'Your college only' },
              { val: 'global'   as const, icon: Globe, label: 'Global',   desc: 'All campuses' },
            ]).map(opt => (
              <button key={opt.val} type="button" onClick={() => setScope(opt.val)}
                style={{
                  padding: '14px', borderRadius: '12px', cursor: 'pointer',
                  border: `2px solid ${scope === opt.val ? 'var(--accent)' : 'var(--border)'}`,
                  background: scope === opt.val ? 'rgba(201,94,26,0.06)' : 'var(--surface)',
                  transition: 'all 0.2s', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                }}>
                <opt.icon style={{ width: '20px', height: '20px',
                                    color: scope === opt.val ? 'var(--accent)' : 'var(--muted)' }} />
                <span style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-body)',
                               color: scope === opt.val ? 'var(--accent)' : 'var(--primary)' }}>
                  {opt.label}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Payment */}
        <Section title="Payment">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                Paid Event
              </p>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Collect fee via UPI
              </p>
            </div>
            <button type="button" onClick={() => setIsPaid(!isPaid)}
              style={{ width: '48px', height: '28px', borderRadius: '99px',
                       background: isPaid ? 'var(--accent)' : 'var(--elevated)',
                       border: '1px solid var(--border)', cursor: 'pointer',
                       position: 'relative', transition: 'all 0.2s' }}>
              <span style={{ position: 'absolute', top: '3px',
                             left: isPaid ? '23px' : '3px',
                             width: '20px', height: '20px', borderRadius: '50%',
                             background: isPaid ? '#fff' : 'var(--muted)',
                             transition: 'left 0.2s' }} />
            </button>
          </div>

          {isPaid && (
            <>
              <div>
                <label className="input-label">Fee per person (₹) *</label>
                <input type="number" className="input" placeholder="e.g. 100"
                  value={price} min={1} step="0.01" inputMode="decimal"
                  onChange={e => setPrice(e.target.value)} required={isPaid} />
                {regType === 'group' && (
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                    Team leader pays for the whole team. Total = fee × team size
                  </p>
                )}
              </div>
              <div>
                <label className="input-label">UPI ID *</label>
                <input type="text" className="input" placeholder="e.g. yourname@okaxis"
                  value={upiId} onChange={e => setUpiId(e.target.value)} required={isPaid} />
              </div>
              <div>
                <label className="input-label">UPI QR Code (backup)</label>
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '8px', padding: '16px',
                  borderRadius: '12px', cursor: 'pointer',
                  border: `2px dashed ${upiQrPreview ? 'var(--accent)' : 'var(--border)'}`,
                  background: 'var(--surface)', transition: 'all 0.2s',
                }}>
                  {upiQrPreview
                    ? <img src={upiQrPreview} alt="QR"
                           style={{ width: '100px', height: '100px',
                                    borderRadius: '8px', objectFit: 'cover' }} />
                    : <><Upload style={{ width: '20px', height: '20px', color: 'var(--muted)' }} />
                        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Upload QR image</span>
                      </>
                  }
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                         onChange={handleUpiQrChange} />
                </label>
              </div>
            </>
          )}
        </Section>

        {/* Custom fields */}
        <div className="card-elevated" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase',
                          letterSpacing: '0.1em', fontWeight: '600' }}>Extra Fields</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                Collect extra info from students
              </p>
            </div>
            <button type="button" onClick={addCustomField}
              style={{ display: 'flex', alignItems: 'center', gap: '6px',
                       background: 'var(--accent)', border: 'none', cursor: 'pointer',
                       color: '#fff', padding: '8px 12px', borderRadius: '8px',
                       fontSize: '12px', fontWeight: '600', fontFamily: 'var(--font-body)' }}>
              <Plus style={{ width: '14px', height: '14px' }} />
              Add Field
            </button>
          </div>

          {customFields.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--muted)',
                        textAlign: 'center', padding: '16px 0' }}>
              No extra fields. Click "Add Field" to collect custom info.
            </p>
          )}

          {customFields.map((field, i) => (
            <div key={i} style={{ padding: '14px', background: 'var(--surface)',
                                   borderRadius: '12px', marginBottom: '10px',
                                   border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="text" className="input" placeholder="Field label"
                  value={field.label} style={{ flex: 1 }}
                  onChange={e => updateCustomField(i, 'label', e.target.value)} />
                <button type="button" onClick={() => removeCustomField(i)}
                  style={{ background: 'rgba(198,40,40,0.1)', border: 'none',
                           borderRadius: '8px', cursor: 'pointer', padding: '10px',
                           color: 'var(--error)', flexShrink: 0 }}>
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="input-label" style={{ fontSize: '10px' }}>Type</label>
                  <select className="select" value={field.type}
                    onChange={e => updateCustomField(i, 'type', e.target.value as any)}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Dropdown</option>
                    <option value="textarea">Paragraph</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px',
                                   cursor: 'pointer', paddingBottom: '14px' }}>
                    <input type="checkbox" checked={field.required ?? true}
                      onChange={e => updateCustomField(i, 'required', e.target.checked)}
                      style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--primary)' }}>Required</span>
                  </label>
                </div>
              </div>
              {field.type === 'select' && (
                <div style={{ marginTop: '10px' }}>
                  <label className="input-label" style={{ fontSize: '10px' }}>Options</label>
                  {(field.options ?? []).map((opt, oi) => (
                    <input key={oi} type="text" className="input"
                      placeholder={`Option ${oi + 1}`} value={opt}
                      style={{ marginBottom: '6px' }}
                      onChange={e => updateOption(i, oi, e.target.value)} />
                  ))}
                  <button type="button" onClick={() => addOption(i)}
                    style={{ fontSize: '12px', color: 'var(--accent)', background: 'none',
                             border: 'none', cursor: 'pointer', fontWeight: '600',
                             fontFamily: 'var(--font-body)' }}>
                    + Add option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(198,40,40,0.08)',
                        border: '1px solid rgba(198,40,40,0.2)',
                        borderRadius: '10px', padding: '12px 14px',
                        color: 'var(--error)', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading}
          style={{ display: 'flex', alignItems: 'center',
                   justifyContent: 'center', gap: '8px' }}>
          {loading
            ? <span className="animate-pulse-soft">Publishing...</span>
            : '🚀 Publish Event'}
        </button>

      </form>
      <OrganizerNav />
    </div>
  )
}