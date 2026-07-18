import { useEffect } from 'react'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const FEATURES = [
  { icon: '📋', title: 'Rutinas por semanas', desc: 'Crea bloques de entrenamiento con ejercicios, series, repeticiones, descansos y vídeos de referencia. Cada cliente tiene su propio plan.' },
  { icon: '📱', title: 'Panel móvil sin app', desc: 'El cliente accede desde su móvil con solo un enlace. Sin instalar nada. Sin registro. Sin contraseña.' },
  { icon: '📈', title: 'Progreso en tiempo real', desc: 'Ve los entrenamientos completados, récords personales y adherencia de cada cliente desde tu panel.' },
  { icon: '🥗', title: 'Plan nutricional incluido', desc: 'Añade dieta con macros, comidas y consejos. El cliente lo consulta desde el mismo panel.' },
  { icon: '💬', title: 'Envío por WhatsApp', desc: 'Comparte el enlace del cliente por WhatsApp con un clic. Nada más fácil.' },
  { icon: '📊', title: 'Seguimiento corporal', desc: 'El cliente registra peso, fotos de progreso y métricas. Tú las ves organizadas en su perfil.' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Creas al cliente y le asignas una rutina', desc: 'En menos de 2 minutos tienes el cliente dado de alta con su plan de entrenamiento personalizado.' },
  { step: '02', title: 'Compartes el enlace por WhatsApp', desc: 'Un solo clic genera el enlace del cliente. Lo mandas por WhatsApp y ya puede empezar a entrenar.' },
  { step: '03', title: 'El cliente abre su panel móvil', desc: 'Sin instalar ninguna app, sin crear cuenta. Abre el enlace y tiene su rutina completa con vídeos.' },
  { step: '04', title: 'Tú ves todo desde tu panel', desc: 'Registros de entrenamiento, récords, adherencia, fotos de progreso y mensajes — todo en un sitio.' },
]

const FAQS = [
  {
    q: '¿Qué diferencia hay con Trainerize o Harbiz?',
    a: 'La diferencia principal es que con PanelFit el cliente no necesita instalar ninguna app ni crear una cuenta. Solo abre el enlace que le mandas y ya tiene su panel completo. Esto reduce la fricción inicial a cero y aumenta la adherencia.',
  },
  {
    q: '¿Cuánto cuesta PanelFit?',
    a: 'Ahora mismo estamos en beta privada y puedes solicitar acceso gratuito. Los planes de pago previstos empiezan en 15 €/mes para hasta 15 clientes, y 29 €/mes para clientes ilimitados.',
  },
  {
    q: '¿Funciona bien en iPhone y Android?',
    a: 'Sí. PanelFit está diseñado mobile-first. El panel del cliente está optimizado para móvil y funciona tanto en Safari (iOS) como en Chrome (Android). También puede guardarse como PWA en la pantalla de inicio.',
  },
  {
    q: '¿Puedo crear plantillas de rutinas para reutilizarlas?',
    a: 'Sí. Puedes crear plantillas de workout que luego asignas a cualquier cliente con un clic. También hay plantillas de programas de varias semanas para periodización.',
  },
  {
    q: '¿Se pueden añadir vídeos a los ejercicios?',
    a: 'Sí. Puedes añadir vídeos de YouTube o subir vídeos propios a cada ejercicio. El cliente los ve directamente desde su panel mientras entrena.',
  },
  {
    q: '¿Cuántos clientes puedo gestionar?',
    a: 'Depende del plan. La beta permite probar sin límite. El plan Starter cubre hasta 15 clientes. El plan Pro no tiene límite de clientes.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-accent transition-colors">
        <span className="font-semibold text-sm leading-snug">{q}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-muted leading-relaxed pb-5">{a}</p>}
    </div>
  )
}

interface Props {
  onDemo: () => void
  onRegister: () => void
  onLogin: () => void
}

export function LandingAppEntrenadores({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'App para entrenadores personales — PanelFit | Panel de cliente sin app'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', 'App para entrenadores personales: crea rutinas, comparte el plan por WhatsApp y cada cliente accede a su panel móvil sin instalar nada. Prueba gratis.')
  }, [])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-bg/90 backdrop-blur-sm sticky top-0 z-10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="px-3 py-2 text-sm text-muted hover:text-ink transition-colors">Entrar</button>
            <button onClick={onDemo} className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:border-ink transition-colors">
              Ver demo
            </button>
            <button onClick={onRegister} className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
              Acceso gratuito
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent mb-6">App para entrenadores personales</p>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold leading-[0.92] mb-6 max-w-3xl">
          Deja de mandar<br />rutinas en <span className="text-accent italic">PDF</span>
        </h1>
        <p className="text-lg text-muted max-w-xl mb-10 leading-relaxed">
          Con PanelFit cada cliente tiene su panel móvil con rutina, vídeos y seguimiento.
          Tú lo creas en minutos, él lo abre con un enlace. Sin instalar ninguna app.
        </p>
        <div className="flex flex-wrap gap-3 mb-14">
          <button onClick={onDemo}
            className="flex items-center gap-2 px-7 py-3.5 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-md">
            Ver demo en vivo <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onRegister}
            className="flex items-center gap-2 px-7 py-3.5 border border-border rounded-xl text-sm font-semibold text-muted hover:border-ink hover:text-ink transition-all">
            Solicitar acceso beta gratis
          </button>
        </div>

        {/* Pain points */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-5">¿Te suena alguna de estas situaciones?</p>
          <ul className="space-y-3">
            {[
              '¿Mandas rutinas en PDF y luego explicas cada ejercicio por WhatsApp?',
              '¿Tardas más de 10 minutos en buscar el plan de un cliente concreto?',
              '¿No sabes si tu cliente está entrenando hasta que te escribe?',
              '¿Cada cliente tiene sus rutinas en un sitio diferente (PDF, Word, Excel…)?',
            ].map(p => (
              <li key={p} className="flex items-start gap-3 text-sm text-ink/80">
                <span className="text-warn mt-0.5 flex-shrink-0">→</span>
                {p}
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold mt-6 text-accent">PanelFit lo resuelve con un enlace por cliente.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Cómo funciona</p>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-center mb-14 max-w-xl mx-auto leading-tight">
            De cero a cliente entrenando en menos de 5 minutos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <p className="text-5xl font-serif font-bold text-border mb-4">{step}</p>
                <p className="font-semibold text-sm mb-2 leading-snug">{title}</p>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Qué incluye</p>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-center mb-14 max-w-xl mx-auto leading-tight">
          Todo lo que necesitas para gestionar clientes online
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-6 hover:border-accent/40 transition-all">
              <div className="text-2xl mb-4">{icon}</div>
              <p className="font-serif font-bold text-base mb-2">{title}</p>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* vs PDF/WhatsApp callout */}
      <section className="max-w-5xl mx-auto px-5 pb-20 w-full">
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-8 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-8 max-w-lg">
            PanelFit frente al método "PDF + WhatsApp"
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Antes — PDF + WhatsApp</p>
              <ul className="space-y-2.5">
                {[
                  'El cliente te pregunta dudas por WhatsApp',
                  'Mandas versiones nuevas del PDF cada semana',
                  'No sabes si entrena hasta que te escribe',
                  'Cada cliente en un sitio diferente',
                  'El cliente no tiene vídeos de referencia',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-muted">
                    <span className="text-warn flex-shrink-0 mt-0.5">✕</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-accent mb-4">Con PanelFit</p>
              <ul className="space-y-2.5">
                {[
                  'El cliente ve sus dudas resueltas en el panel',
                  'Actualizas el plan desde tu panel, él lo ve al instante',
                  'Ves en tiempo real quién entrena y quién no',
                  'Todos los clientes organizados en un solo sitio',
                  'Vídeos de YouTube o propios para cada ejercicio',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-ok flex-shrink-0 mt-0.5" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card border-y border-border">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Preguntas frecuentes</p>
          <h2 className="text-3xl font-serif font-bold text-center mb-10">Resolvemos tus dudas</h2>
          <div className="bg-bg border border-border rounded-2xl px-6 divide-y divide-border">
            {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-ink text-white">
        <div className="max-w-5xl mx-auto px-5 py-24 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-6">Beta gratuita disponible</p>
          <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-6 leading-tight">
            Empieza hoy.<br />
            <span className="text-accent italic">Sin tarjeta. Sin app.</span>
          </h2>
          <p className="text-white/50 max-w-md mx-auto mb-10 text-sm leading-relaxed">
            Solicita acceso a la beta. Te configuramos con tus primeros 3 clientes y te ayudamos a empezar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onDemo}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-ink rounded-xl text-sm font-bold hover:opacity-90">
              Ver demo en vivo <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onRegister}
              className="flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white rounded-xl text-sm font-semibold hover:border-white/50 transition-all">
              Solicitar acceso gratuito
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <span className="font-serif font-bold text-ink">Panel<span className="text-accent italic">Fit</span></span>
          <div className="flex gap-5">
            <a href="/" className="hover:text-ink transition-colors">Inicio</a>
            <button onClick={onDemo} className="hover:text-ink transition-colors">Demo</button>
            <button onClick={onRegister} className="hover:text-ink transition-colors">Acceso</button>
          </div>
          <span>© {new Date().getFullYear()} PanelFit</span>
        </div>
      </footer>
    </div>
  )
}
