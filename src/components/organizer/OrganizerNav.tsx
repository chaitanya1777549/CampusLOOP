'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LayoutList, PlusCircle, BarChart2, User } from 'lucide-react'

const ORGANIZER_TABS = [
  { label: 'Events',    icon: LayoutList,  path: '/organizer' },
  { label: 'Create',    icon: PlusCircle,  path: '/organizer/create' },
  { label: 'Stats',     icon: BarChart2,   path: '/organizer/stats' },
  { label: 'Profile',   icon: User,        path: '/organizer/profile' },
]

export default function OrganizerNav() {
  const pathname = usePathname()
  const router   = useRouter()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      display: 'flex',
    }}>
      {ORGANIZER_TABS.map(tab => {
        const active = pathname === tab.path ||
                       (tab.path !== '/organizer' && pathname.startsWith(tab.path))
        const Icon = tab.icon
        return (
          <button key={tab.path} onClick={() => router.push(tab.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '4px', padding: '10px 4px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: active ? 'var(--accent)' : 'var(--muted)',
              transition: 'color 0.2s',
            }}>
            {tab.path === '/organizer/create'
              ? <div style={{
                    width: '44px', height: '32px', borderRadius: '10px',
                    background: active ? 'var(--accent)' : 'rgba(201,94,26,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}>
                  <Icon style={{ width: '20px', height: '20px',
                                 color: active ? '#fff' : 'var(--accent)' }} />
                </div>
              : <Icon style={{ width: '22px', height: '22px' }} />
            }
            <span style={{
              fontSize: '10px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              fontFamily: 'var(--font-body)',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}