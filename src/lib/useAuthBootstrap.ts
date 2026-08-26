import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../types'
import {
  DEMO_TRAINER_PROFILE, DEMO_TRAINER_ID,
  DEMO_WEIGHTS_MARIA, DEMO_WEIGHTS_CARLOS, DEMO_WEIGHTS_LAURA,
  DEMO_WEIGHTS_DIEGO, DEMO_WEIGHTS_MARTA, DEMO_WEIGHTS_BEATRIZ, DEMO_WEIGHTS_LUCAS,
  DEMO_SURVEY_TEMPLATE, DEMO_SURVEY_RESPONSES
} from './demo-data'

export type AppView = 'loading' | 'auth' | 'trainer' | 'client-token' | 'demo' | 'pending-demo' | 'public-page' | 'reset-password' | 'landing-app-entrenadores' | 'landing-software-entrenador' | 'landing-precios' | 'landing-alternativa-harbiz' | 'landing-alternativa-trainerize' | 'landing-alternativa-mypthub' | 'landing-alternativa-truecoach' | 'landing-alternativa-ptdistinction' | 'calculadora-rm' | 'blog-index' | 'blog-organizar-clientes' | 'blog-mejor-software' | 'blog-seguimiento-clientes' | 'blog-pagos' | 'blog-plantillas' | 'blog-conseguir-clientes' | 'blog-app-planes'

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
  localStorage.setItem(`pf_weight_demo-client-004`, JSON.stringify(DEMO_WEIGHTS_DIEGO))
  localStorage.setItem(`pf_weight_demo-client-005`, JSON.stringify(DEMO_WEIGHTS_MARTA))
  localStorage.setItem(`pf_weight_demo-client-006`, JSON.stringify(DEMO_WEIGHTS_BEATRIZ))
  localStorage.setItem(`pf_weight_demo-client-007`, JSON.stringify(DEMO_WEIGHTS_LUCAS))
  localStorage.setItem(`pf_demo_survey_template`, JSON.stringify(DEMO_SURVEY_TEMPLATE))
  localStorage.setItem(`pf_demo_survey_responses`, JSON.stringify(DEMO_SURVEY_RESPONSES))
}

export function useAuthBootstrap() {
  const [view, setView] = useState<AppView>('loading')
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null)
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [publicSlug, setPublicSlug] = useState<string | null>(null)
  const loggingOutRef = useRef(false)

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
    // Evita que un refresco de token ya en curso reautentique al usuario justo
    // después de cerrar sesión (el evento llega igualmente al listener de abajo).
    loggingOutRef.current = true
    setView('auth')
    setUserProfile(null)
    setPendingUser(null)
    // Red de seguridad: si signOut() falla y nunca llega el SIGNED_OUT que
    // resetea la bandera, no dejar bloqueados los eventos de auth para siempre.
    setTimeout(() => { loggingOutRef.current = false }, 5000)
    await supabase.auth.signOut()
  }

  useEffect(() => {
    const pathname = window.location.pathname
    if (pathname === '/app-entrenadores' || pathname === '/app-entrenadores/') { setView('landing-app-entrenadores'); return }
    if (pathname === '/software-entrenador-personal' || pathname === '/software-entrenador-personal/') { setView('landing-software-entrenador'); return }
    if (pathname === '/precios' || pathname === '/precios/') { setView('landing-precios'); return }
    if (pathname === '/alternativas/harbiz' || pathname === '/alternativas/harbiz/') { setView('landing-alternativa-harbiz'); return }
    if (pathname === '/alternativas/trainerize' || pathname === '/alternativas/trainerize/') { setView('landing-alternativa-trainerize'); return }
    if (pathname === '/alternativas/mypthub' || pathname === '/alternativas/mypthub/') { setView('landing-alternativa-mypthub'); return }
    if (pathname === '/alternativas/truecoach' || pathname === '/alternativas/truecoach/') { setView('landing-alternativa-truecoach'); return }
    if (pathname === '/alternativas/pt-distinction' || pathname === '/alternativas/pt-distinction/') { setView('landing-alternativa-ptdistinction'); return }
    if (pathname === '/calculadora-1rm' || pathname === '/calculadora-1rm/') { setView('calculadora-rm'); return }
    if (pathname === '/blog' || pathname === '/blog/') { setView('blog-index'); return }
    if (pathname === '/blog/como-organizar-clientes-entrenador-personal' || pathname === '/blog/como-organizar-clientes-entrenador-personal/') { setView('blog-organizar-clientes'); return }
    if (pathname === '/blog/mejor-software-entrenador-personal' || pathname === '/blog/mejor-software-entrenador-personal/') { setView('blog-mejor-software'); return }
    if (pathname === '/blog/como-hacer-seguimiento-clientes-gym' || pathname === '/blog/como-hacer-seguimiento-clientes-gym/') { setView('blog-seguimiento-clientes'); return }
    if (pathname === '/blog/gestionar-pagos-entrenador-personal' || pathname === '/blog/gestionar-pagos-entrenador-personal/') { setView('blog-pagos'); return }
    if (pathname === '/blog/plantillas-entrenamiento-entrenador-personal' || pathname === '/blog/plantillas-entrenamiento-entrenador-personal/') { setView('blog-plantillas'); return }
    if (pathname === '/blog/conseguir-clientes-entrenador-personal-online' || pathname === '/blog/conseguir-clientes-entrenador-personal-online/') { setView('blog-conseguir-clientes'); return }
    if (pathname === '/blog/app-enviar-planes-entrenamiento-clientes' || pathname === '/blog/app-enviar-planes-entrenamiento-clientes/') { setView('blog-app-planes'); return }

    const pageMatch = pathname.match(/^\/p\/([a-z0-9-]+)\/?$/)
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
      if (loggingOutRef.current) {
        if (event === 'SIGNED_OUT') loggingOutRef.current = false
        return
      }
      if (event === 'PASSWORD_RECOVERY') { setView('reset-password'); return }
      if (session?.user) loadProfile(session.user.id, session.user.email || '')
      else { setView('auth'); setUserProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  return { view, userProfile, pendingUser, clientToken, publicSlug, logout, setView }
}
