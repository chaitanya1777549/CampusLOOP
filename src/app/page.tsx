'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getProfile } from '@/lib/supabase'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await getProfile(user.id)

      if (!profile) {
        router.replace('/onboarding')
        return
      }

      if (profile.role === 'student') {
        router.replace('/student')
      } else if (profile.role === 'organizer') {
        if (profile.is_verified) {
          router.replace('/organizer')
        } else {
          router.replace('/pending')
        }
      }
    }

    redirect()
  }, [router])

  // Splash screen while redirecting
  return (
    <div className="page flex items-center justify-center min-h-dvh">
      <div className="text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-accent flex items-center justify-center
                        mx-auto shadow-glow animate-pulse-soft">
          <span className="text-white font-bold text-2xl text-display">C</span>
        </div>
        <div>
          <h1 className="text-display text-2xl text-primary">Campus Loop</h1>
          <p className="text-muted text-[13px] mt-1">Loading your campus...</p>
        </div>
      </div>
    </div>
  )
}