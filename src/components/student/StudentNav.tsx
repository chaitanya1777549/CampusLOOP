'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Search, BookMarked, User } from 'lucide-react'

const STUDENT_TABS = [
  { label: 'Home',    icon: Home,       path: '/student' },
  { label: 'Explore', icon: Search,     path: '/student/explore' },
  { label: 'My Regs', icon: BookMarked, path: '/student/registrations' },
  { label: 'Profile', icon: User,       path: '/student/profile' },
]

export default function StudentNav() {
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
      {STUDENT_TABS.map(tab => {
        const active = pathname === tab.path ||
                       (tab.path !== '/student' && pathname.startsWith(tab.path))
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
            <Icon style={{ width: '22px', height: '22px' }} />
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