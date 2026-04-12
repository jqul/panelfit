import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react'

interface AuthProps { onAuth: () => void; onDemo?: () => void }

const STATS = [
  { value: '100%', label: 'Personalizado' },
  { value: 'Sin app', label: 'El cliente solo necesita el enlace' },
  { value: '1 clic', label: 'Para enviar el plan por WhatsApp' },
]
const FEATURES = [
  { icon: '🏋️', title: 'Plan por semanas', desc: 'Diseña bloques de entrenamiento con ejercicios, series, descansos y vídeos.' },
  { icon: '📸', title: 'Fotos de progreso', desc: 'El cliente sube fotos y recibe análisis visual de su evolución física.' },
  { icon: '📊', title: 'Récords y progreso', desc: 'Seguimiento automático de marcas personales y volumen de entrenamiento.' },
  { icon: '📱', title: 'Panel del cliente', desc: 'Acceso desde el móvil con un enlace. Sin registro. Sin contraseña.' },
  { icon: '🥗', title: 'Plan nutricional', desc: 'Crea planes de dieta con macros, comidas y consejos personalizados.' },
  { icon: '💬', title: 'Comunicación directa', desc: 'Comparte rutinas y dietas por WhatsApp con un clic desde el panel.' },
]
const TESTIMONIALS = [
  { name: 'Carlos M.', role: 'Entrenador personal · Madrid', text: 'Antes mandaba PDFs por WhatsApp. Ahora cada cliente tiene su panel con todo. Cambió mi forma de trabajar.' },
  { name: 'Laura G.', role: 'Coach de fuerza · Barcelona', text: 'Mis clientes pueden ver sus vídeos de referencia directamente en el panel cuando entrenan. Genial.' },
  { name: 'Marcos R.', role: 'Entrenador online · Sevilla', text: 'El modo cliente desde el móvil sin instalar nada es lo que más valoran mis alumnos.' },
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
      await supabase.from('entrenadores').upsert({ id: data.user.id, nombre: name, email, activo: false }, { onConflict: 'id' })
    }
    setLoading(false); setRegistered(true)
  }

  if (view === 'landing') return (
    <div className="min-h-screen bg-bg flex flex-col">
      <nav className="border-b border-border bg-bg/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></span>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('login')} className="px-4 py-2 text-sm font-medium text-muted hover:text-ink transition-colors">Entrar →</button>
            <button onClick={() => setView('register')} className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">Solicitar acceso</button>
          </div>
        </div>
      </nav>
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />
        </div>
        <p className="relative text-xs font-bold uppercase tracking-[0.25em] text-accent mb-8">· Software para entrenadores personales ·</p>
        <h1 className="relative text-6xl sm:text-7xl lg:text-8xl font-serif font-bold leading-[0.92] mb-8 max-w-4xl">
          Un panel<br /><span className="text-accent italic">único</span><br />por cliente
        </h1>
        <p className="relative text-lg text-muted max-w-lg mx-auto mb-12 leading-relaxed">
          Cada cliente tiene su propio espacio personalizado — plan, vídeos, progreso y comunicación directa contigo.
        </p>
        <div className="relative flex flex-col sm:flex-row gap-3 justify-center mb-16">
          {onDemo && (
            <button onClick={onDemo} className="flex items-center justify-center gap-2 px-8 py-4 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-lg">
              Ver demo en vivo <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setView('register')} className="flex items-center justify-center gap-2 px-8 py-4 border border-border rounded-xl text-sm font-semibold text-muted hover:border-ink hover:text-ink transition-all">
            Solicitar acceso
          </button>
        </div>
        <div className="relative w-full max-w-2xl mx-auto grid grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {STATS.map(s => (
            <div key={s.value} className="bg-card px-6 py-5 text-center">
              <p className="font-serif font-bold text-xl mb-0.5">{s.value}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="max-w-5xl mx-auto px-6 py-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Qué incluye</p>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold text-center mb-16 max-w-2xl mx-auto leading-tight">Todo lo que necesitas para gestionar a tus alumnos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-8 hover:border-accent/40 hover:shadow-sm transition-all group">
              <div className="text-2xl mb-4 group-hover:scale-110 transition-transform inline-block">{icon}</div>
              <p className="font-serif font-bold text-base mb-2">{title}</p>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Testimonios</p>
          <h2 className="text-3xl font-serif font-bold text-center mb-12">Lo que dicen los entrenadores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-bg border border-border rounded-2xl p-6">
                <p className="text-sm text-ink/80 leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent flex-shrink-0">{t.name[0]}</div>
                  <div><p className="text-sm font-semibold">{t.name}</p><p className="text-[10px] text-muted">{t.role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-ink text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-6">Empieza hoy</p>
          <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-6 leading-tight">Gestiona tus clientes<br /><span className="text-accent italic">como un profesional</span></h2>
          <p className="text-white/50 max-w-md mx-auto mb-10 text-sm leading-relaxed">Sin apps que instalar, sin complicaciones. Tu cliente accede con un enlace y tú controlas todo desde el panel.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onDemo && (
              <button onClick={onDemo} className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-ink rounded-xl text-sm font-bold hover:opacity-90">
                Ver demo en vivo <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setView('register')} className="flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white rounded-xl text-sm font-semibold hover:border-white/50 transition-all">
              Solicitar acceso
            </button>
          </div>
        </div>
      </section>
    </div>
  )

  if (registered) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-4xl font-serif font-bold mb-8">Panel<span className="text-accent italic">Fit</span></h1>
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="w-14 h-14 bg-ok/10 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-7 h-7 text-ok" /></div>
          <h2 className="font-serif font-bold text-xl mb-2">Solicitud enviada</h2>
          <p className="text-muted text-sm leading-relaxed">Tu cuenta ha sido creada. Recibirás confirmación de acceso en breve.</p>
          <button onClick={() => { setRegistered(false); setView('login') }} className="mt-6 w-full py-3 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90">Ir al inicio de sesión</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-ink text-white p-16">
        <span className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></span>
        <div>
          <h2 className="text-5xl font-serif font-bold leading-tight mb-6">Tu negocio de<br /><span className="text-accent italic">entrenamiento</span><br />en un solo lugar</h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">Planes personalizados, seguimiento del progreso y comunicación directa con tus clientes.</p>
        </div>
        <button onClick={() => setView('landing')} className="text-white/40 text-xs hover:text-white/70 transition-colors text-left">← Volver a la página principal</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <button onClick={() => setView('landing')} className="text-muted text-xs hover:text-ink mb-4 inline-block">← Volver</button>
            <h1 className="text-3xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
          </div>
          <h2 className="text-2xl font-serif font-bold mb-2">{view === 'login' ? 'Bienvenido de nuevo' : 'Solicitar acceso'}</h2>
          <p className="text-muted text-sm mb-8">{view === 'login' ? 'Entra a tu panel de entrenador.' : 'Crea tu cuenta y empieza a gestionar clientes.'}</p>
          <div className="space-y-4">
            {view === 'register' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre"
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (view === 'login' ? handleLogin() : handleRegister())}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (view === 'login' ? handleLogin() : handleRegister())}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-10 bg-card border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-warn">{error}</p>}
          <button className="w-full mt-6 py-3.5 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            onClick={view === 'login' ? handleLogin : handleRegister} disabled={loading}>
            {loading ? 'Cargando...' : view === 'login' ? 'Entrar' : 'Crear cuenta'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
          <p className="text-center text-sm text-muted mt-6">
            {view === 'login' ? '¿Sin cuenta? ' : '¿Ya tienes cuenta? '}
            <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError('') }} className="text-accent hover:underline font-semibold">
              {view === 'login' ? 'Solicitar acceso' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
