'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getColleges } from '@/lib/supabase'
import EventCard from '@/components/student/EventCard'
import StudentNav from '@/components/student/StudentNav'
import type { Profile, College, EventSummary } from '@/types'
import { Bell, ChevronDown } from 'lucide-react'

export default function StudentHomePage() {
  const router = useRouter()
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [colleges, setColleges]       = useState<College[]>([])
  const [selectedCollege, setSelectedCollege] = useState<number | null>(null)
  const [events, setEvents]           = useState<EventSummary[]>([])
  const [loading, setLoading]         = useState(true)
  const [showCollegePicker, setShowCollegePicker] = useState(false)
  const [filter, setFilter]           = useState<'all' | 'free' | 'paid'>('all')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, college:colleges(*)')
        .eq('id', user.id).single()

      if (!prof) { router.push('/onboarding'); return }
      if (prof.role !== 'student') { router.push('/organizer'); return }

      setProfile(prof)
      setSelectedCollege(prof.college_id)

      const { data: cols } = await getColleges()
      if (cols) setColleges(cols)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!selectedCollege || !profile) return
    fetchEvents()
  }, [selectedCollege, profile])

  async function fetchEvents() {
    setLoading(true)
    const isHomeCampus = selectedCollege === profile?.college_id

    let query = supabase
      .from('event_summary')
      .select('*')
      .eq('college_id', selectedCollege)
      .eq('is_active', true)
      .gte('registration_expires', new Date().toISOString())
      .order('event_date', { ascending: true })

    // If browsing external campus — only show global events
    if (!isHomeCampus) {
      query = query.eq('scope', 'global')
    }

    const { data } = await query
    setEvents(data ?? [])
    setLoading(false)
  }

  const filtered = events.filter(e => {
    if (filter === 'free') return !e.is_paid
    if (filter === 'paid') return e.is_paid
    return true
  })

  const selectedCollegeName = colleges.find(c => c.id === selectedCollege)
  const isHomeCampus = selectedCollege === profile?.college_id

  return (
    <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>

      {/* Top accent bar */}
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      {/* Header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '14px 20px', position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px',
                          background: 'var(--accent)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 'bold',
                             fontFamily: 'var(--font-display)' }}>C</span>
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '17px',
                           color: 'var(--primary)', lineHeight: 1 }}>
                Campus Loop
              </h1>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                Hey, {profile?.name?.split(' ')[0]} 👋
              </p>
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer',
                           color: 'var(--muted)', padding: '6px' }}>
            <Bell style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* College filter bar */}
        <button onClick={() => setShowCollegePicker(!showCollegePicker)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '10px 14px',
            background: 'var(--elevated)', border: '1.5px solid var(--border)',
            borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
            borderColor: showCollegePicker ? 'var(--accent)' : 'var(--border)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>🏫</span>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                {selectedCollegeName?.short_code ?? 'Select College'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {isHomeCampus ? 'Your campus · All events' : 'External · Global events only'}
              </p>
            </div>
          </div>
          <ChevronDown style={{
            width: '16px', height: '16px', color: 'var(--muted)',
            transform: showCollegePicker ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }} />
        </button>

        {/* College dropdown */}
        {showCollegePicker && (
          <div style={{
            marginTop: '8px', background: 'var(--elevated)',
            border: '1px solid var(--border)', borderRadius: '12px',
            overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}>
            {colleges.map((college, i) => (
              <button key={college.id}
                onClick={() => { setSelectedCollege(college.id); setShowCollegePicker(false) }}
                style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: college.id === selectedCollege
                    ? 'rgba(201,94,26,0.08)' : 'none',
                  border: 'none',
                  borderBottom: i < colleges.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                <span style={{ fontSize: '14px' }}>
                  {college.id === selectedCollege ? '✓ ' : ''}
                </span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600',
                               color: college.id === selectedCollege
                                 ? 'var(--accent)' : 'var(--primary)' }}>
                    {college.short_code}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    {college.name}
                  </p>
                </div>
                {college.id === profile?.college_id && (
                  <span className="badge badge-global" style={{ marginLeft: 'auto' }}>
                    Home
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          {(['all', 'free', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '99px', fontSize: '12px',
                fontWeight: '600', border: 'none', cursor: 'pointer',
                background: filter === f ? 'var(--accent)' : 'var(--elevated)',
                color: filter === f ? '#fff' : 'var(--muted)',
                transition: 'all 0.2s', textTransform: 'capitalize',
                fontFamily: 'var(--font-body)',
              }}>
              {f === 'all' ? 'All Events' : f === 'free' ? '🎉 Free' : '💳 Paid'}
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div style={{ padding: '16px 16px 0' }}>

        {/* External campus notice */}
        {!isHomeCampus && (
          <div style={{
            background: 'rgba(201,94,26,0.06)', border: '1px solid rgba(201,94,26,0.2)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '14px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>👁️</span>
            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
              Showing <strong style={{ color: 'var(--accent)' }}>global events</strong> only.
              Internal events are hidden for external students.
            </p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3].map(i => (
              <div key={i} className="card" style={{ overflow: 'hidden' }}>
                <div className="skeleton" style={{ height: '180px', borderRadius: 0 }} />
                <div style={{ padding: '14px 16px', display: 'flex',
                              flexDirection: 'column', gap: '8px' }}>
                  <div className="skeleton" style={{ height: '20px', width: '80%' }} />
                  <div className="skeleton" style={{ height: '14px', width: '60%' }} />
                  <div className="skeleton" style={{ height: '14px', width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>
              📭
            </span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px',
                         color: 'var(--primary)', marginBottom: '8px' }}>
              No events yet
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
              {isHomeCampus
                ? 'No upcoming events on your campus right now.'
                : 'No global events from this campus yet.'}
            </p>
          </div>
        )}

        {/* Event cards */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(event => (
              <EventCard key={event.id} event={event}
                         showCollege={!isHomeCampus} />
            ))}
          </div>
        )}

        <div style={{ height: '16px' }} />
      </div>

      <StudentNav />
    </div>
  )
}