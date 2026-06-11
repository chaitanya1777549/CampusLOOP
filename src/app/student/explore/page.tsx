'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import EventCard from '@/components/student/EventCard'
import StudentNav from '@/components/student/StudentNav'
import type { EventSummary } from '@/types'
import { Search, X } from 'lucide-react'

export default function ExplorePage() {
  const router = useRouter()
  const [events, setEvents]               = useState<EventSummary[]>([])
  const [filtered, setFiltered]           = useState<EventSummary[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [selectedCollege, setSelectedCollege] = useState('all')
  const [paidFilter, setPaidFilter]       = useState<'all' | 'free' | 'paid'>('all')
  const [colleges, setColleges]           = useState<{ id: string; name: string; short_code: string }[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('event_summary')
        .select('*')
        .eq('scope', 'global')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })

      const list = data ?? []
      setEvents(list)
      setFiltered(list)

      const seen = new Map<string, { id: string; name: string; short_code: string }>()
      for (const e of list) {
        if (e.college_id && !seen.has(String(e.college_id))) {
          seen.set(String(e.college_id), {
            id: String(e.college_id),
            name: e.college_name,
            short_code: e.college_short_code,
          })
        }
      }
      setColleges(Array.from(seen.values()))
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let result = [...events]
    if (selectedCollege !== 'all') result = result.filter(e => String(e.college_id) === selectedCollege)
    if (paidFilter === 'free')     result = result.filter(e => !e.is_paid)
    if (paidFilter === 'paid')     result = result.filter(e => e.is_paid)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.college_name?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [events, search, selectedCollege, paidFilter])

  return (
    <div className="page min-h-dvh" style={{ paddingBottom: '80px' }}>
      <div style={{ height: '3px', background: 'var(--accent)' }} />

      <div style={{ position: 'sticky', top: 0, zIndex: 40,
                    background: 'var(--canvas)', borderBottom: '1px solid var(--border)',
                    padding: '16px 16px 12px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px',
                     color: 'var(--primary)', marginBottom: '12px' }}>
          Explore
        </h1>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%',
                           transform: 'translateY(-50%)', width: '15px', height: '15px',
                           color: 'var(--muted)' }} />
          <input type="text" className="input"
            style={{ paddingLeft: '36px', paddingRight: '36px' }}
            placeholder="Search events, colleges, venues..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '12px', top: '50%',
                       transform: 'translateY(-50%)', background: 'none',
                       border: 'none', cursor: 'pointer', color: 'var(--muted)',
                       padding: 0 }}>
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          )}
        </div>

        {/* College chips */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto',
                      paddingBottom: '4px', marginBottom: '8px' }}
             className="no-scrollbar">
          {[{ id: 'all', short_code: 'All' }, ...colleges].map(c => (
            <button key={c.id} onClick={() => setSelectedCollege(c.id)}
              style={{ flexShrink: 0, padding: '5px 12px', borderRadius: '99px',
                       fontSize: '12px', fontWeight: '600', border: 'none',
                       cursor: 'pointer', transition: 'all 0.2s',
                       fontFamily: 'var(--font-body)',
                       background: selectedCollege === c.id ? 'var(--accent)' : 'var(--elevated)',
                       color: selectedCollege === c.id ? '#fff' : 'var(--muted)' }}>
              {c.short_code}
            </button>
          ))}
        </div>

        {/* Paid filter */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'free', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setPaidFilter(f)}
              style={{ padding: '5px 12px', borderRadius: '99px', fontSize: '12px',
                       fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                       fontFamily: 'var(--font-body)',
                       background: 'transparent',
                       border: `1.5px solid ${paidFilter === f ? 'var(--accent)' : 'var(--border)'}`,
                       color: paidFilter === f ? 'var(--accent)' : 'var(--muted)' }}>
              {f === 'all' ? 'All' : f === 'free' ? 'Free' : 'Paid'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton"
                   style={{ height: '180px', borderRadius: '16px' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🔍</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px',
                        color: 'var(--primary)', marginBottom: '6px' }}>
              No events found
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {search ? 'Try a different search term' : 'No global events right now'}
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
              {filtered.length} event{filtered.length !== 1 ? 's' : ''} from across campuses
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map(event => (
  <EventCard key={event.id} event={event} showCollege={true} />
))}
            </div>
          </>
        )}
      </div>

      <StudentNav />
    </div>
  )
}