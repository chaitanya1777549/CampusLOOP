'use client'

import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Users, IndianRupee } from 'lucide-react'
import type { EventSummary } from '@/types'
import { format } from 'date-fns'

interface EventCardProps {
  event: EventSummary
  showCollege?: boolean
}

export default function EventCard({ event, showCollege = false }: EventCardProps) {
  const router = useRouter()
  const isPast = new Date(event.event_date) < new Date()
  const isFull = event.max_registrations
    ? event.registration_count >= event.max_registrations
    : false

  return (
    <button
      onClick={() => router.push(`/student/event/${event.id}`)}
      style={{
        width: '100%', textAlign: 'left', background: 'none',
        border: 'none', padding: 0, cursor: 'pointer',
      }}
    >
      <div className="card" style={{
        overflow: 'hidden', transition: 'all 0.2s',
        transform: 'translateY(0)',
      }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>

        {/* Poster */}
        <div style={{ position: 'relative', width: '100%', height: '180px',
                      background: 'var(--elevated)', overflow: 'hidden' }}>
          {event.main_poster_url
            ? <img src={event.main_poster_url} alt={event.title}
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, var(--elevated), var(--surface))' }}>
                <span style={{ fontSize: '48px' }}>📅</span>
              </div>
          }

          {/* Overlay badges */}
          <div style={{ position: 'absolute', top: '10px', left: '10px',
                        display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span className={`badge ${event.scope === 'global' ? 'badge-global' : 'badge-internal'}`}>
              {event.scope === 'global' ? '🌐 Global' : '🏫 Internal'}
            </span>
            {event.is_paid && (
              <span className="badge" style={{
                background: 'rgba(26,15,0,0.7)', color: '#f7efe7',
                backdropFilter: 'blur(4px)',
              }}>
                ₹{event.price}
              </span>
            )}
            {isFull && (
              <span className="badge badge-rejected">Full</span>
            )}
            {isPast && (
              <span className="badge" style={{
                background: 'rgba(26,15,0,0.7)', color: 'var(--muted)',
              }}>Ended</span>
            )}
          </div>

          {/* College badge if showing cross-campus */}
          {showCollege && (
            <div style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
              <span className="badge" style={{
                background: 'rgba(26,15,0,0.75)', color: '#f7efe7',
                backdropFilter: 'blur(4px)',
              }}>
                {event.college_short_code}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px' }}>

          {/* Title */}
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '17px',
            color: 'var(--primary)', marginBottom: '10px',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {event.title}
          </h3>

          {/* Meta info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar style={{ width: '13px', height: '13px',
                                 color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                {format(new Date(event.event_date), 'EEE, dd MMM yyyy · h:mm a')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin style={{ width: '13px', height: '13px',
                               color: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--muted)',
                             overflow: 'hidden', textOverflow: 'ellipsis',
                             whiteSpace: 'nowrap' }}>
                {event.venue}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users style={{ width: '13px', height: '13px', color: 'var(--accent)' }} />
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {event.registration_count}
                  {event.max_registrations ? ` / ${event.max_registrations}` : ''} registered
                </span>
              </div>

              {event.is_paid
                ? <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <IndianRupee style={{ width: '13px', height: '13px',
                                         color: 'var(--accent)' }} />
                    <span style={{ fontSize: '14px', fontWeight: '700',
                                   color: 'var(--accent)' }}>
                      {event.price}
                    </span>
                  </div>
                : <span style={{ fontSize: '13px', fontWeight: '600',
                                 color: 'var(--success)' }}>Free</span>
              }
            </div>
          </div>

          {/* Organizer */}
          <div style={{ marginTop: '12px', paddingTop: '12px',
                        borderTop: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px',
                          background: 'var(--elevated)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', flexShrink: 0 }}>
              {event.organizer_avatar
                ? <img src={event.organizer_avatar} alt=""
                       style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600' }}>
                    {event.organizer_name?.[0]}
                  </span>
              }
            </div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              by <strong style={{ color: 'var(--primary)' }}>{event.organizer_name}</strong>
            </span>
          </div>

        </div>
      </div>
    </button>
  )
}