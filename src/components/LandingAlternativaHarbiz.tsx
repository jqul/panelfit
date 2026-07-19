import { useEffect, useState } from 'react'
import { ArrowRight, Check, X, ChevronDown } from 'lucide-react'

const COMPARISON = [
  { feature: 'El cliente necesita instalar app', harbiz: true, panelfit: false, note: 'PanelFit abre en el navegador' },
  { feature: 'El cliente necesita crear cuenta', harbiz: true, panelfit: false, note: '' },
  { feature: 'Funciona en cualquier móvil', harbiz: true, panelfit: true, note: '' },
  { feature: 'Planes de entrenamiento semanales', harbiz: true, panelfit: true, note: '' },
  { feature: 'Seguimiento de progreso', harbiz: true, panelfit: true, note: '' },
  { feature: 'Dieta y macros', harbiz: true, panelfit: true, note: '' },
  { feature: 'Mensajería con el cliente', harbiz: true, panelfit: true, note: '' },
  { feature: 'Sin fricción en el onboarding del cliente', harbiz: false, panelfit: true, note: 'Solo un enlace' },
  { feature: 'Precio Starter', harbiz: 'Consultar', panelfit: '15 €/mes', note: '' },
]

const FAQS = [
  {
    q: '¿Es PanelFit una copia de Harbiz?',
    a: 'No. La diferencia principal es el modelo de acceso del cliente: en PanelFit el cliente no necesita instalar ninguna app ni crear cuenta. Solo abre un enlace en su navegador. Esto reduce el abandono en el onboarding y facilita el seguimiento.',
  },
  {
    q: '¿Pierdo funcionalidades respecto a Harbiz?',
    a: 'PanelFit cubre rutinas, dieta, progreso, comunicación y seguimiento. Harbiz tiene más tiempo en el mercado y puede tener alguna funcionalidad que PanelFit aún no tiene. Pero si el problema que tienes es que tus clientes no abren la app, PanelFit lo resuelve.',
  },
  {
    q: '¿Puedo migrar mis clientes de Harbiz a PanelFit?',
    a: 'Sí. Puedes dar de alta a tus clientes en PanelFit y enviarles un nuevo enlace por WhatsApp. No hay importación automática desde Harbiz, pero dar de alta un cliente lleva menos de 2 minutos.',
  },
  {
    q: '¿Cuánto cuesta PanelFit comparado con Harbiz?',
    a: 'Durante la beta PanelFit es gratuito. Los precios futuros previstos son 15 €/mes (Starter, hasta 15 clientes) y 29 €/mes (Pro, ilimitados). Compara con los precios actuales de Harbiz para tu caso concreto.',
  },
  {
    q: '¿Funciona PanelFit para entrenadores presenciales y online?',
    a: 'Sí. El cliente puede consultar su rutina desde el móvil durante la sesión presencial, sin instalar nada. Para online es igual — le mandas el enlace por WhatsApp.',
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

export function LandingAlternativaHarbiz({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Alternativa a Harbiz — PanelFit | Sin app para el cliente'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', 'PanelFit es una alternativa a Harbiz donde el cliente no necesita instalar ninguna app. Solo abre un enlace. Compara características y precios.')

    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'ld-alternativa-harbiz'
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
    return () => { document.getElementById('ld-alternativa-harbiz')?.remove() }
  }, [])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-bg/90 backdrop-blur-sm sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
          <div className="flex items-center gap-2">
            <button onClick={onLogin} className="px-3 py-2 text-sm text-muted hover:text-ink transition-colors">Entrar</button>
            <button onClick={onDemo} className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:border-ink transition-colors">Ver demo</button>
            <button onClick={onRegister} className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">Acceso gratuito</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent mb-6">Alternativa a Harbiz</p>
        <h1 className="text-5xl sm:text-6xl font-serif font-bold leading-[0.92] mb-6 max-w-3xl">
          Como Harbiz,<br />pero el cliente <span className="text-accent italic">no instala nada</span>
        </h1>
        <p className="text-lg text-muted max-w-xl mb-10 leading-relaxed">
          PanelFit hace lo mismo que Harbiz en rutinas, dieta y seguimiento — con una diferencia clave: el cliente abre su panel con un enlace, sin app, sin cuenta.
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

      {/* El problema con Harbiz */}
      <section className="bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">El problema</p>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-center mb-10 max-w-xl mx-auto leading-tight">
            "Mis clientes no abren la app"
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {[
              { icon: '📲', title: 'Descargar la app', desc: 'Tu cliente tiene que ir al App Store, descargar la app, esperar, y abrirla. Muchos abandonan aquí.' },
              { icon: '🔐', title: 'Crear una cuenta', desc: 'Nombre, correo, contraseña, confirmación. Otro paso donde se pierden clientes.' },
              { icon: '🔔', title: 'Activar notificaciones', desc: 'El sistema operativo pregunta si quiere notificaciones. La mitad dice que no y nunca vuelve a abrir la app.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-bg border border-border rounded-2xl p-6">
                <div className="text-2xl mb-4">{icon}</div>
                <p className="font-semibold text-sm mb-2">{title}</p>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-accent/5 border border-accent/20 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <p className="font-semibold">Con PanelFit: le mandas un enlace por WhatsApp.</p>
            <p className="text-sm text-muted mt-1">El cliente lo abre y ya está dentro. Sin instalar, sin cuenta, sin fricción.</p>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-5 py-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Comparativa</p>
        <h2 className="text-3xl font-serif font-bold text-center mb-12">Harbiz vs PanelFit</h2>
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] bg-card">
            <div className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted">Característica</div>
            <div className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted text-center w-28">Harbiz</div>
            <div className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-accent text-center w-28">PanelFit</div>
          </div>
          {COMPARISON.map(({ feature, harbiz, panelfit, note }, i) => (
            <div key={feature} className={`grid grid-cols-[1fr_auto_auto] border-t border-border ${i % 2 === 0 ? '' : 'bg-card/40'}`}>
              <div className="px-6 py-4">
                <p className="text-sm">{feature}</p>
                {note && <p className="text-xs text-muted mt-0.5">{note}</p>}
              </div>
              <div className="px-6 py-4 flex items-center justify-center w-28">
                {typeof harbiz === 'boolean' ? (
                  harbiz
                    ? <Check className="w-4 h-4 text-ok" />
                    : <X className="w-4 h-4 text-error/60" />
                ) : (
                  <span className="text-xs font-semibold text-muted">{harbiz}</span>
                )}
              </div>
              <div className="px-6 py-4 flex items-center justify-center w-28">
                {typeof panelfit === 'boolean' ? (
                  panelfit
                    ? <Check className="w-4 h-4 text-ok" />
                    : <X className="w-4 h-4 text-error/60" />
                ) : (
                  <span className="text-xs font-semibold text-accent">{panelfit}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted text-center mt-4">Tabla basada en información pública disponible en julio 2025. Sin afiliación con Harbiz.</p>
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

      {/* CTA final */}
      <section className="max-w-5xl mx-auto px-5 py-24 w-full text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-6">Beta gratuita ahora mismo</p>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-6 leading-tight">
          Pruébalo.<br /><span className="text-accent italic">Sin instalar nada.</span>
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
            <a href="/precios" className="hover:text-ink transition-colors">Precios</a>
            <button onClick={onDemo} className="hover:text-ink transition-colors">Demo</button>
          </div>
          <span>© {new Date().getFullYear()} PanelFit</span>
        </div>
      </footer>
    </div>
  )
}
