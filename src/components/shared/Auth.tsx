import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff, Check, Dumbbell, BarChart2, MessageSquare, Zap, Users, Shield } from 'lucide-react'

interface AuthProps {
  onAuth: () => void
  onDemo?: () => void
}

const FEATURES = [
  { icon: Dumbbell,      title: 'Planes de entrenamiento',    desc: 'Crea rutinas semanales con ejercicios, series, vídeos y notas técnicas.' },
  { icon: BarChart2,     title: 'Seguimiento en tiempo real', desc: 'Ve el progreso de cada cliente, sus pesos y las sesiones completadas.' },
  { icon: MessageSquare, title: 'Comunicación directa',       desc: 'Envía el plan por WhatsApp con un clic. Sin apps adicionales.' },
  { icon: Zap,           title: 'Panel del cliente',          desc: 'Tu cliente accede desde el móvil sin registrarse. Solo con su enlace.' },
  { icon: Users,         title: 'Multi-cliente',              desc: 'Gestiona todos tus alumnos desde un único panel organizado.' },
  { icon: Shield,        title: 'Privado y seguro',           desc: 'Cada cliente solo ve su propio plan. Tus notas son privadas.' },
]

const DEMO_SCREENS = [
  { label: 'Dashboard',    emoji: '📊', desc: 'Vista general de todos tus clientes' },
  { label: 'Plan semanal', emoji: '📋', desc: 'Editor de rutinas por semana y día' },
  { label: 'Panel cliente',emoji: '📱', desc: 'Lo que ve tu alumno en el móvil' },
  { label: 'Dieta',        emoji: '🥗', desc: 'Plan nutricional con macros y comidas' },
]

export function Auth({ onAuth, onDemo }: AuthProps) {
  const [view, setView] = useState<'landing' | 'login' | 'register'>('landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)

  const handleLogin = async () => {
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o contraseña incorrectos')
    else onAuth()
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!name.trim()) { setError('Introduce tu nombre'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('entrenadores').upsert({
        id: data.user.id, nombre: name, email, activo: false
      }, { onConflict: 'id' })
    }
    setLoading(false)
    setRegistered(true)
  }

  if (view === 'landing') return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('login')}
              className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">
              Entrar
            </button>
            <button onClick={() => setView('register')}
              className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              Empieza gratis
            </button>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full text-xs font-semibold text-accent mb-6">
          ✦ Plataforma para entrenadores personales
        </div>
        <h2 className="text-5xl sm:text-6xl font-serif font-bold leading-tight mb-6">
          Gestiona a tus clientes<br />
          <span className="text-accent italic">como un profesional</span>
        </h2>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Crea planes de entrenamiento personalizados, haz seguimiento del progreso
          y mantén a tus alumnos motivados — todo desde un único panel.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button onClick={() => setView('register')}
            className="px-8 py-4 bg-ink text-white rounded-xl text-base font-bold hover:opacity-90 transition-opacity w-full sm:w-auto">
            Crear cuenta gratis →
          </button>
          {onDemo && (
            <button onClick={onDemo}
              className="px-8 py-4 bg-card border border-border rounded-xl text-base font-semibold text-muted hover:border-accent hover:text-accent transition-all w-full sm:w-auto">
              🎮 Ver demo
            </button>
          )}
        </div>
        <p className="text-xs text-muted mt-4">Sin tarjeta de crédito · Gratis para empezar</p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DEMO_SCREENS.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-6 text-center hover:border-accent/40 transition-colors">
              <div className="text-4xl mb-3">{s.emoji}</div>
              <p className="font-serif font-bold text-sm mb-1">{s.label}</p>
              <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h3 className="text-3xl font-serif font-bold text-center mb-12">Todo lo que necesitas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-serif font-bold text-center mb-4">Simple y transparente</h3>
        <p className="text-muted text-center mb-12">Sin sorpresas. Sin comisiones.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {[
            { plan: 'Gratuito', price: '0€', period: '/mes', features: ['Hasta 5 clientes', 'Planes de entrenamiento', 'Panel del cliente', 'WhatsApp integrado'], cta: 'Empezar gratis', highlight: false },
            { plan: 'Profesional', price: '19€', period: '/mes', features: ['Clientes ilimitados', 'Todo lo del plan gratuito', 'Biblioteca de ejercicios', 'Plantillas de rutinas', 'Soporte prioritario'], cta: 'Empezar prueba', highlight: true },
          ].map(p => (
            <div key={p.plan} className={`rounded-2xl p-8 border ${p.highlight ? 'bg-ink text-white border-ink' : 'bg-card border-border'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${p.highlight ? 'text-white/60' : 'text-muted'}`}>{p.plan}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-serif font-bold">{p.price}</span>
                <span className={`text-sm ${p.highlight ? 'text-white/60' : 'text-muted'}`}>{p.period}</span>
              </div>
              <ul className="space-y-2 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className={`w-4 h-4 flex-shrink-0 ${p.highlight ? 'text-white/80' : 'text-ok'}`} />
                    <span className={p.highlight ? 'text-white/90' : ''}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => setView('register')}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                  p.highlight ? 'bg-white text-ink hover:opacity-90' : 'bg-ink text-white hover:opacity-90'
                }`}>
                {p.cta} →
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h3 className="text-3xl font-serif font-bold mb-4">Empieza hoy mismo</h3>
          <p className="text-white/60 mb-8">Únete a los entrenadores que ya gestionan sus clientes con PanelFit</p>
          <button onClick={() => setView('register')}
            className="px-8 py-4 bg-white text-ink rounded-xl text-base font-bold hover:opacity-90 transition-opacity">
            Crear mi cuenta gratis →
          </button>
        </div>
      </section>
    </div>
  )

  if (registered) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-serif font-bold mb-2">Panel<span className="text-accent italic">Fit</span></h1>
        <div className="bg-card border border-border rounded-2xl p-8 mt-8">
          <div className="w-16 h-16 bg-ok/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-ok" />
          </div>
          <h2 className="font-serif font-bold text-xl mb-2">¡Solicitud enviada!</h2>
          <p className="text-muted text-sm leading-relaxed">Tu cuenta ha sido creada. Recibirás confirmación de acceso en breve.</p>
          <button onClick={() => { setRegistered(false); setView('login') }}
            className="mt-6 w-full py-3 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90">
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <button onClick={() => setView('landing')} className="text-muted text-xs hover:text-ink mb-4 inline-block">← Volver</button>
          <h1 className="text-4xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
          <p className="text-muted text-sm mt-1">Plataforma de entrenamiento personalizado</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-serif font-bold mb-6">{view === 'login' ? 'Entrar' : 'Crear cuenta'}</h2>
          <div className="space-y-4">
            {view === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre"
                  className="w-full px-4 py-3 bg-bg border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (view === 'login' ? handleLogin() : handleRegister())}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (view === 'login' ? handleLogin() : handleRegister())}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-10 bg-bg border border-border rounded-lg outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-warn">{error}</p>}
          <button className="w-full mt-6 py-3 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
            onClick={view === 'login' ? handleLogin : handleRegister} disabled={loading}>
            {loading ? 'Cargando...' : view === 'login' ? 'Entrar →' : 'Crear cuenta →'}
          </button>
          <p className="text-center text-sm text-muted mt-4">
            {view === 'login' ? '¿Sin cuenta? ' : '¿Ya tienes cuenta? '}
            <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); s
