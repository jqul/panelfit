import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../types'
import {
  DEMO_TRAINER_PROFILE, DEMO_TRAINER_ID,
  DEMO_WEIGHTS_MARIA, DEMO_WEIGHTS_CARLOS, DEMO_WEIGHTS_LAURA,
  DEMO_SURVEY_TEMPLATE, DEMO_SURVEY_RESPONSES
} from './demo-data'

export type AppView = 'loading' | 'auth' | 'trainer' | 'client-token' | 'demo' | 'pending-demo' | 'public-page' | 'reset-password'

export interface PendingUser {
  uid: string
  email: string
  displayName: string
}

function hydrateDemoStorage() {
  localStorage.setItem(`pf_trainer_profile_${DEMO_TRAINER_ID}`, JSON.stringify(DEMO_TRAINER_PROFILE))
  localStorage.setItem(`pf_trainer_phone_${DEMO_TRAINER_ID}`, DEMO_TRAINER_PROFILE.phone)
  localStorage.setItem(`pf_weight_demo-client-001`, JSON.stringify(DEMO_WEIGHTS_MARIA))
  localStorage.setItem(`pf_weight_demo-client-002`, JSON.stringify(DEMO_WEIGHTS_CARLOS))
  localStorage.setItem(`pf_weight_demo-client-003`, JSON.stringify(DEMO_WEIGHTS_LAURA))
  localStorage.setItem(`pf_demo_survey_template`, JSON.stringify(DEMO_SURVEY_TEMPLATE))
  localStorage.setItem(`pf_demo_survey_responses`, JSON.stringify(DEMO_SURVEY_RESPONSES))
}

export function useAuthBootstrap() {
  const [view, setView] = useState<AppView>('loading')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null)
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [publicSlug, setPublicSlug] = useState<string | null>(null)

  const loadProfile = async (uid: string, email: string) => {
    const { data } = await supabase
      .from('entrenadores')
      .select('"displayName", approved, rol, profile')
      .eq('uid', uid)
      .maybeSingle()

    if (!data) { await supabase.auth.signOut(); setView('auth'); return }

    if (data.approved === false) {
      const displayName = data.displayName || email.split('@')[0]
      setPendingUser({ uid, email, displayName })
      hydrateDemoStorage()
      setView('pending-demo')
      return
    }

    const profile = data.profile || {}
    setUserProfile({
      uid, email,
      displayName: data.displayName || email.split('@')[0],
      role: data.rol === 'super_admin' ? 'super_admin' : 'trainer',
      approved: true,
      createdAt: Date.now(),
      clientLimit: profile.clientLimit,
      planName: profile.planName,
    } as UserProfile)
    setView('trainer')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setView('auth')
    setUserProfile(null)
    setPendingUser(null)
  }

  useEffect(() => {
    const pageMatch = window.location.pathname.match(/^\/p\/([a-z0-9-]+)\/?$/)
    if (pageMatch) { setPublicSlug(pageMatch[1]); setView('public-page'); return }

    const params = new URLSearchParams(window.location.search)
    const token = params.get('c')
    if (token) { setClientToken(token); setView('client-token'); return }
    if (params.get('demo') === '1') { hydrateDemoStorage(); setView('demo'); return }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadProfile(data.session.user.id, data.session.user.email || '')
      else setView('auth')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setView('reset-password'); return }
      if (session?.user) loadProfile(session.user.id, session.user.email || '')
      else { setView('auth'); setUserProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  return { view, userProfile, pendingUser, clientToken, publicSlug, logout, setView }
}
