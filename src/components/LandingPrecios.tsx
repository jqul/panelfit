import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronDown, X } from 'lucide-react'

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '15',
    period: '/mes',
    desc: 'Para entrenadores que acaban de empezar',
    clients: 'Hasta 15 clientes',
    highlight: false,
    cta: 'Empezar gratis',
    features: [
      'Hasta 15 clientes activos',
      'Panel móvil del cliente (sin app)',
      'Planes de entrenamiento ilimitados',
      'Biblioteca de vídeos de ejercicio',
      'Seguimiento de peso y progreso',
      'Encuestas y check-ins',
      'Exportar datos de clientes',
      'Comunicación directa con clientes',
    ],
    notIncluded: [
      'Informes PDF personalizados',
      'Marca blanca (logo propio)',
      'Dashboard de negocio',
      'Página pública de entrenador',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '29',
    period: '/mes',
    desc: 'Para entrenadores en activo con cartera estable',
    clients: 'Clientes ilimitados',
    highlight: true,
    cta: 'Empezar gratis 15 días',
    features: [
      'Clientes ilimitados',
      'Panel móvil del cliente (sin app)',
      'Planes de entrenamiento ilimitados',
      'Biblioteca de vídeos de ejercicio',
      'Seguimiento de peso y progreso',
      'Encuestas y check-ins',
      'Exportar datos de clientes',
      'Comunicación directa con clientes',
      'Informes PDF personalizados',
      'Marca blanca (tu logo, sin marca PanelFit)',
      'Dashboard de negocio (ingresos, adherencia)',
      'Página pública de entrenador',
    ],
    notIncluded: [
      'Subdominio personalizado',
      'Gestión multi-entrenador',
    ],
  },
  {
    key: 'studio',
    name: 'Studio',
    price: 'A consultar',
    period: '',
    desc: 'Para centros y equipos de entrenadores',
    clients: 'Clientes ilimitados',
    highlight: false,
    cta: 'Contactar',
    features: [
      'Todo lo de Pro',
      'Subdominio personalizado',
      'Gestión multi-entrenador',
      'Panel de administración de equipo',
      'Soporte prioritario',
      'Incorporación y formación incluida',
    ],
    notIncluded: [],
  },
]

const FAQS = [
  {
    q: '¿Hay un período de prueba gratuita?',
    a: 'Sí. Ahora mismo PanelFit está en beta y es completamente gratuita. Cuando lancemos los planes de pago, tendrás un periodo de transición con tiempo para decidir.',
  },
  {
    q: '¿Se necesita tarjeta para empezar?',
    a: 'No. Durante la beta no hay ningún cargo ni tarjeta. Solo te pedimos nombre y correo para crear tu cuenta.',
  },
  {
    q: '¿Qué pasa con mis datos si decido no continuar?',
    a: 'Los datos son tuyos. Puedes exportarlos o pedir su eliminación en cualquier momento. Sin letra pequeña.',
  },
  {
    q: '¿Puedo cambiar de plan en cualquier momento?',
    a: 'Sí. Los planes son mensuales sin permanencia. Puedes subir, bajar o cancelar cuando quieras.',
  },
  {
    q: '¿Qué significa "sin app para el cliente"?',
    a: 'Tu cliente abre su panel desde el navegador del móvil con un enlace. No necesita instalar ninguna app, crear cuenta ni recordar contraseñas. Esto reduce el abandono en el onboarding a casi cero.',
  },
  {
    q: '¿Qué incluye la marca blanca?',
    a: 'En el plan Pro puedes subir tu logo y tu foto de perfil. La interfaz que ve el cliente no muestra el nombre "PanelFit". En Studio además tienes un subdominio del tipo tuempresa.panelfit.app.',
  },
  {
    q: '¿Hay descuento por pago anual?',
    a: 'Todavía no hemos lanzado precios anuales, pero está en nuestra hoja de ruta. Si pagas anual tendrás 2 meses gratis respecto al precio mensual.',
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

export function LandingPrecios({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Precios — PanelFit | App para entrenadores personales'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', 'Planes y precios de PanelFit: app para entrenadores personales. Starter 15€/mes hasta 15 clientes. Pro 29€/mes ilimitados. Prueba gratuita disponible.')

    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'ld-precios'
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
    return () => { document.getElementById('ld-precios')?.remove() }
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

      {/* Beta banner */}
      <div className="bg-ok/10 border-b border-ok/20 px-5 py-3 text-center">
        <p className="text-sm text-ok font-medium">
          🎉 <strong>Beta gratuita activa.</strong> Acceso sin coste mientras dure la beta — sin tarjeta, sin sorpresas.{' '}
          <button onClick={onRegister} className="underline underline-offset-2 hover:no-underline">Solicitar acceso →</button>
        </p>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-14 w-full text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent mb-6">Precios</p>
        <h1 className="text-4xl sm:text-5xl font-serif font-bold leading-tight mb-5">
          Simple. Sin letra pequeña.
        </h1>
        <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed">
          Empieza gratis durante la beta. Cuando lances los planes de pago, elige el tuyo — mensual, sin permanencia.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-5 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              className={`rounded-2xl border flex flex-col ${
                plan.highlight
                  ? 'bg-ink text-white border-ink shadow-xl scale-[1.02]'
                  : 'bg-card border-border'
              }`}
            >
              {plan.highlight && (
                <div className="px-6 pt-5">
                  <span className="inline-flex px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Más popular
                  </span>
                </div>
              )}
              <div className={`px-6 ${plan.highlight ? 'pt-4' : 'pt-6'} pb-6`}>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${plan.highlight ? 'text-white/60' : 'text-muted'}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  {plan.price === 'A consultar' ? (
                    <p className={`text-2xl font-serif font-bold ${plan.highlight ? 'text-white' : 'text-ink'}`}>A consultar</p>
                  ) : (
                    <>
                      <span className={`text-4xl font-serif font-bold ${plan.highlight ? 'text-white' : 'text-ink'}`}>{plan.price}€</span>
                      <span className={`text-sm ${plan.highlight ? 'text-white/60' : 'text-muted'}`}>{plan.period}</span>
                    </>
                  )}
                </div>
                <p className={`text-sm leading-snug mb-4 ${plan.highlight ? 'text-white/70' : 'text-muted'}`}>{plan.desc}</p>
                <div className={`text-xs font-semibold px-3 py-1.5 rounded-full inline-block mb-6 ${
                  plan.highlight ? 'bg-white/15 text-white' : 'bg-accent/10 text-accent'
                }`}>
                  {plan.clients}
                </div>

                <button
                  onClick={plan.key === 'studio'
                    ? () => window.open('mailto:javier.quinones.lopez@gmail.com?subject=PanelFit Studio - Me interesa', '_blank')
                    : onRegister
                  }
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    plan.highlight
                      ? 'bg-white text-ink hover:bg-white/90'
                      : 'bg-ink text-white hover:opacity-90'
                  }`}
                >
                  {plan.cta} {plan.key !== 'studio' && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              <div className={`px-6 pb-6 flex-1 border-t ${plan.highlight ? 'border-white/15' : 'border-border'}`}>
                <div className="pt-5 space-y-2.5">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-ok' : 'text-ok'}`} />
                      <p className={`text-sm ${plan.highlight ? 'text-white/80' : 'text-ink'}`}>{f}</p>
                    </div>
                  ))}
                  {plan.notIncluded.map(f => (
                    <div key={f} className="flex items-start gap-2.5">
                      <X className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-white/30' : 'text-muted/40'}`} />
                      <p className={`text-sm ${plan.highlight ? 'text-white/30' : 'text-muted/60'}`}>{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison note */}
        <p className="text-center text-sm text-muted mt-8">
          Todos los planes incluyen actualizaciones sin coste adicional · Sin contrato anual forzado
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-card border-y border-border">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Preguntas frecuentes</p>
          <h2 className="text-3xl font-serif font-bold text-center mb-10">Sobre precios y planes</h2>
          <div className="bg-bg border border-border rounded-2xl px-6 divide-y divide-border">
            {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-5xl mx-auto px-5 py-24 w-full text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-6">Sin riesgos</p>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-6 leading-tight">
          Empieza gratis.<br /><span className="text-accent italic">Decide después.</span>
        </h2>
        <p className="text-muted max-w-md mx-auto mb-10 text-sm leading-relaxed">
          Durante la beta tienes acceso completo sin pagar nada. Cuando lancemos los planes de pago te avisaremos con tiempo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={onRegister} className="flex items-center justify-center gap-2 px-8 py-4 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-md">
            Solicitar acceso gratuito <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onDemo} className="flex items-center justify-center gap-2 px-8 py-4 border border-border rounded-xl text-sm font-semibold text-muted hover:border-ink hover:text-ink transition-all">
            Ver demo primero
          </button>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <span className="font-serif font-bold text-ink">Panel<span className="text-accent italic">Fit</span></span>
          <div className="flex gap-5">
            <a href="/" className="hover:text-ink transition-colors">Inicio</a>
            <a href="/app-entrenadores" className="hover:text-ink transition-colors">App entrenadores</a>
            <a href="/software-entrenador-personal" className="hover:text-ink transition-colors">Software</a>
            <button onClick={onDemo} className="hover:text-ink transition-colors">Demo</button>
          </div>
          <span>© {new Date().getFullYear()} PanelFit</span>
        </div>
      </footer>
    </div>
  )
}
