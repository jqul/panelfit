import { useEffect, useState } from 'react'
import { ArrowRight, Check, X, ChevronDown } from 'lucide-react'

const COMPARISON = [
  { feature: 'El cliente necesita instalar app', trainerize: true, panelfit: false, note: 'PanelFit abre en el navegador' },
  { feature: 'El cliente necesita crear cuenta', trainerize: true, panelfit: false, note: '' },
  { feature: 'Interfaz en español', trainerize: false, panelfit: true, note: 'Trainerize está principalmente en inglés' },
  { feature: 'Planes de entrenamiento por semanas', trainerize: true, panelfit: true, note: '' },
  { feature: 'Seguimiento de progreso', trainerize: true, panelfit: true, note: '' },
  { feature: 'Dieta y macros', trainerize: true, panelfit: true, note: '' },
  { feature: 'Mensajería con el cliente', trainerize: true, panelfit: true, note: '' },
  { feature: 'Sin fricción en el onboarding del cliente', trainerize: false, panelfit: true, note: 'Solo un enlace por WhatsApp' },
  { feature: 'Precio Starter', trainerize: '~19 USD/mes', panelfit: '15 €/mes', note: '' },
]

const FAQS = [
  {
    q: '¿PanelFit funciona igual que Trainerize?',
    a: 'En cuanto a funcionalidades principales (planes, seguimiento, dieta, comunicación), sí. La diferencia clave está en el acceso del cliente: con PanelFit no necesita instalar ninguna app ni crear cuenta, solo abrir el enlace que le mandas por WhatsApp.',
  },
  {
    q: '¿Puedo migrar mis clientes de Trainerize a PanelFit?',
    a: 'No hay importación automática desde Trainerize. Pero dar de alta un cliente en PanelFit lleva menos de 2 minutos, y enviarle el nuevo enlace es un solo clic.',
  },
  {
    q: '¿PanelFit está disponible en español?',
    a: 'Sí. PanelFit está diseñado desde el principio para el mercado hispanohablante. Toda la interfaz, los mensajes y el soporte están en español.',
  },
  {
    q: '¿Mis clientes necesitan saber inglés para usar PanelFit?',
    a: 'No. El panel que ve el cliente está completamente en español. Tampoco necesita crear ninguna cuenta ni recordar contraseñas.',
  },
  {
    q: '¿Cuánto cuesta PanelFit comparado con Trainerize?',
    a: 'Ahora mismo PanelFit está en beta gratuita. Los precios futuros previstos son 15 €/mes (hasta 15 clientes) y 29 €/mes (ilimitados). Trainerize cobra en USD y tiene distintos niveles según el número de clientes activos.',
  },
  {
    q: '¿Funciona para entrenadores presenciales, no solo online?',
    a: 'Sí. El cliente puede consultar su rutina en el móvil durante la sesión presencial, sin instalar nada. Para entrenamiento online es igual — le mandas el enlace por WhatsApp.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-accent transition-colors">
        <span className="font-semibold text-sm leading-snug">{q}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-muted leading-relaxed pb-5">{a}</p>}
    </div>
  )
}

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

export function LandingAlternativaTrainerize({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Alternativa a Trainerize en español — PanelFit | Sin app para el cliente'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', 'PanelFit es una alternativa a Trainerize en español donde el cliente no necesita instalar ninguna app. Solo abre un enlace. Compara características y precios.')

    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'ld-alternativa-trainerize'
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-alternativa-trainerize')?.remove() }
  }, [])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-bg/90 backdrop-blur-sm sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
          <div className="flex items-center gap-2">
            <a href="/precios" className="hidden md:block px-3 py-2 text-sm text-muted hover:text-ink transition-colors">Precios</a>
            <a href="/blog" className="hidden md:block px-3 py-2 text-sm text-muted hover:text-ink transition-colors">Blog</a>
            <button onClick={onLogin} className="px-3 py-2 text-sm text-muted hover:text-ink transition-colors">Entrar</button>
            <button onClick={onDemo} className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:border-ink transition-colors">Ver demo</button>
            <button onClick={onRegister} className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">Acceso gratuito</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent mb-6">Alternativa a Trainerize</p>
        <h1 className="text-5xl sm:text-6xl font-serif font-bold leading-[0.92] mb-6 max-w-3xl">
          Como Trainerize,<br />pero <span className="text-accent italic">en español</span><br />y sin app
        </h1>
        <p className="text-lg text-muted max-w-xl mb-10 leading-relaxed">
          PanelFit tiene las mismas funcionalidades que Trainerize — rutinas, dieta, progreso, comunicación — con dos ventajas: está completamente en español y el cliente no necesita instalar ninguna app.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={onDemo} className="flex items-center gap-2 px-7 py-3.5 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-md">
            Ver demo en vivo <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onRegister} className="flex items-center gap-2 px-7 py-3.5 border border-border rounded-xl text-sm font-semibold text-muted hover:border-ink hover:text-ink transition-all">
            Solicitar acceso beta gratis
          </button>
        </div>
      </section>

      {/* Por qué cambian */}
      <section className="bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">El problema con Trainerize</p>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-center mb-10 max-w-xl mx-auto leading-tight">
            ¿Por qué los entrenadores españoles lo dejan?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { icon: '🇬🇧', title: 'Todo en inglés', desc: 'La interfaz que ve tu cliente es en inglés. Para muchos clientes mayores o no digitales, esto es una barrera real.' },
              { icon: '📲', title: 'App obligatoria', desc: 'Tu cliente tiene que ir al App Store, instalar la app, crear cuenta y activar notificaciones. Muchos abandonan en el camino.' },
              { icon: '💵', title: 'Precio en dólares', desc: 'Los planes de Trainerize están en USD y suben con el número de clientes activos. En España el cambio y la facturación complican la gestión.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-bg border border-border rounded-2xl p-6">
                <div className="text-2xl mb-4">{icon}</div>
                <p className="font-semibold text-sm mb-2">{title}</p>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-accent/5 border border-accent/20 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <p className="font-semibold">PanelFit: en español, sin app, precio en euros.</p>
            <p className="text-sm text-muted mt-1">Tu cliente abre el enlace desde WhatsApp y ya tiene su panel completo.</p>
          </div>
        </div>
      </section>

      {/* Tabla comparativa */}
      <section className="max-w-5xl mx-auto px-5 py-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Comparativa</p>
        <h2 className="text-3xl font-serif font-bold text-center mb-12">Trainerize vs PanelFit</h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] bg-card">
            <div className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Característica</div>
            <div className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted text-center w-32">Trainerize</div>
            <div className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-accent text-center w-32">PanelFit</div>
          </div>
          {COMPARISON.map(({ feature, trainerize, panelfit, note }, i) => (
            <div key={feature} className={`grid grid-cols-[1fr_auto_auto] border-t border-border ${i % 2 === 0 ? '' : 'bg-card/40'}`}>
              <div className="px-6 py-4">
                <p className="text-sm">{feature}</p>
                {note && <p className="text-xs text-muted mt-0.5">{note}</p>}
              </div>
              <div className="px-6 py-4 flex items-center justify-center w-32">
                {typeof trainerize === 'boolean' ? (
                  trainerize ? <Check className="w-4 h-4 text-ok" /> : <X className="w-4 h-4 text-error/60" />
                ) : (
                  <span className="text-xs font-semibold text-muted">{trainerize}</span>
                )}
              </div>
              <div className="px-6 py-4 flex items-center justify-center w-32">
                {typeof panelfit === 'boolean' ? (
                  panelfit ? <Check className="w-4 h-4 text-ok" /> : <X className="w-4 h-4 text-error/60" />
                ) : (
                  <span className="text-xs font-semibold text-accent">{panelfit}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted text-center mt-4">Tabla basada en información pública disponible en julio 2025. Sin afiliación con Trainerize.</p>
      </section>

      {/* FAQ */}
      <section className="bg-card border-y border-border">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Preguntas frecuentes</p>
          <h2 className="text-3xl font-serif font-bold text-center mb-10">Sobre la comparativa</h2>
          <div className="bg-bg border border-border rounded-2xl px-6 divide-y divide-border">
            {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-5 py-24 w-full text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-6">Beta gratuita ahora mismo</p>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-6 leading-tight">
          En español.<br /><span className="text-accent italic">Sin instalar nada.</span>
        </h2>
        <p className="text-muted max-w-md mx-auto mb-10 text-sm leading-relaxed">
          Solicita acceso y en menos de 5 minutos tienes a tu primer cliente con su panel activo desde el móvil.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onDemo} className="flex items-center justify-center gap-2 px-8 py-4 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-md">
            Ver demo en vivo <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onRegister} className="flex items-center justify-center gap-2 px-8 py-4 border border-border rounded-xl text-sm font-semibold text-muted hover:border-ink hover:text-ink transition-all">
            Solicitar acceso gratuito
          </button>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <span className="font-serif font-bold text-ink">Panel<span className="text-accent italic">Fit</span></span>
          <div className="flex gap-5">
            <a href="/" className="hover:text-ink transition-colors">Inicio</a>
            <a href="/app-entrenadores" className="hover:text-ink transition-colors">App entrenadores</a>
            <a href="/alternativas/harbiz" className="hover:text-ink transition-colors">vs Harbiz</a>
            <a href="/precios" className="hover:text-ink transition-colors">Precios</a>
            <button onClick={onDemo} className="hover:text-ink transition-colors">Demo</button>
          </div>
          <span>© {new Date().getFullYear()} PanelFit</span>
        </div>
      </footer>
    </div>
  )
}
