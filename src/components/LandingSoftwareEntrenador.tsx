import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'

const PROBLEMS = [
  { icon: '📄', title: 'PDFs que nadie abre', desc: 'El cliente descarga el PDF, no sabe cómo usarlo, te pregunta por WhatsApp. El ciclo se repite cada semana.' },
  { icon: '📱', title: 'WhatsApp como CRM', desc: 'Buscas el plan de tu cliente en chats enterrados entre memes y audios. No es escalable.' },
  { icon: '🗂️', title: 'Excel para el seguimiento', desc: 'Las marcas personales del cliente en una hoja de cálculo que solo tú sabes dónde está.' },
]

const FEATURES = [
  { icon: '📋', title: 'Planes por semanas y bloques', desc: 'Periodización completa: fuerza, hipertrofia, pérdida de grasa. Con vídeos de ejercicio incluidos.' },
  { icon: '📱', title: 'Panel del cliente sin app', desc: 'El cliente accede desde el navegador del móvil. Sin instalar, sin cuenta, sin fricción.' },
  { icon: '📈', title: 'Historial y récords automáticos', desc: 'Cada vez que el cliente entrena, sus marcas se actualizan solas. Tú las ves en su perfil.' },
  { icon: '🥗', title: 'Dieta integrada', desc: 'Macros, comidas y notas nutricionales en el mismo panel que la rutina.' },
  { icon: '📊', title: 'Seguimiento corporal', desc: 'Peso, fotos de progreso y métricas. Todo en la línea de tiempo de tu cliente.' },
  { icon: '💬', title: 'Comunicación centralizada', desc: 'Encuestas de satisfacción, mensajes y notificaciones — sin salir del panel.' },
]

const FAQS = [
  { q: '¿Necesita el cliente instalar alguna app?', a: 'No. El cliente abre un enlace en el navegador de su móvil y ya tiene su panel completo. Sin descargas, sin cuentas, sin contraseñas.' },
  { q: '¿Cuánto tiempo lleva dar de alta a un cliente?', a: 'Menos de 2 minutos. Nombre, objetivo y ya puede recibir su plan. La asignación de rutina se hace desde las plantillas en segundos.' },
  { q: '¿Puedo usar PanelFit si tengo clientes presenciales y online?', a: 'Sí. PanelFit funciona igual para clientes presenciales y online. El cliente presencial puede consultar la rutina desde su móvil durante la sesión.' },
  { q: '¿Hay límite de clientes?', a: 'La beta no tiene límite. Los planes de pago previstos van desde 15 clientes (Starter) hasta ilimitados (Pro).' },
  { q: '¿Qué pasa con mis datos si decido no continuar?', a: 'Los datos son tuyos. Siempre puedes exportarlos o eliminarlos.' },
  { q: '¿Es diferente a Trainerize o TrueCoach?', a: 'La diferencia clave es que el cliente no necesita instalar ninguna app. Esto elimina la barrera de onboarding del cliente y aumenta la adherencia.' },
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

export function LandingSoftwareEntrenador({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Software para entrenadores personales — PanelFit | Gestión de clientes sin PDF'
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', 'Software para entrenadores personales: sustituye los PDFs y WhatsApp por un panel de cliente móvil. Crea planes, haz seguimiento y envía el enlace. Sin que el cliente instale nada.')

    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'ld-software-entrenador'
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'PanelFit',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web, iOS, Android',
      description: 'Software para entrenadores personales que sustituye PDFs y WhatsApp. Panel móvil del cliente sin app.',
      url: 'https://panelfit.vercel.app',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', description: 'Beta gratuita' },
    })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-software-entrenador')?.remove() }
  }, [])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border bg-bg/90 backdrop-blur-sm sticky top-0 z-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
          <div className="flex items-center gap-2">
            <a href="/precios" className="hidden md:block px-3 py-2 text-sm text-muted hover:text-ink transition-colors">Precios</a>
            <button onClick={onLogin} className="px-3 py-2 text-sm text-muted hover:text-ink transition-colors">Entrar</button>
            <button onClick={onDemo} className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:border-ink transition-colors">Ver demo</button>
            <button onClick={onRegister} className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">Acceso gratuito</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent mb-6">Software para entrenadores personales</p>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold leading-[0.92] mb-6 max-w-3xl">
          Gestión de clientes<br />sin <span className="text-accent italic">Excel ni PDF</span>
        </h1>
        <p className="text-lg text-muted max-w-xl mb-10 leading-relaxed">
          PanelFit reemplaza PDFs, Excel y mensajes de WhatsApp por un panel propio para cada cliente.
          Rutinas, vídeos, dieta, progreso y comunicación — todo en un enlace.
        </p>
        <div className="flex flex-wrap gap-3 mb-14">
          <button onClick={onDemo} className="flex items-center gap-2 px-7 py-3.5 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-md">
            Ver demo en vivo <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onRegister} className="flex items-center gap-2 px-7 py-3.5 border border-border rounded-xl text-sm font-semibold text-muted hover:border-ink hover:text-ink transition-all">
            Solicitar acceso beta gratis
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
          {[{ v: 'Sin app', l: 'El cliente solo necesita el enlace' }, { v: '2 min', l: 'Para crear cliente + asignar plan' }, { v: '1 clic', l: 'Para enviar el plan por WhatsApp' }].map(s => (
            <div key={s.v} className="bg-card border border-border rounded-xl px-5 py-4 text-center">
              <p className="font-serif font-bold text-lg">{s.v}</p>
              <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* El problema */}
      <section className="bg-card border-y border-border">
        <div className="max-w-5xl mx-auto px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">El problema</p>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-center mb-14 max-w-xl mx-auto leading-tight">
            Así gestiona la mayoría de entrenadores a sus clientes hoy
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PROBLEMS.map(({ icon, title, desc }) => (
              <div key={title} className="bg-bg border border-border rounded-2xl p-6">
                <div className="text-2xl mb-4">{icon}</div>
                <p className="font-semibold text-sm mb-2">{title}</p>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-accent/5 border border-accent/20 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <p className="font-semibold">PanelFit centraliza todo en un panel por cliente.</p>
            <p className="text-sm text-muted mt-1">Tu cliente lo abre con un enlace. Sin instalar nada.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-20 w-full">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Funcionalidades</p>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-center mb-14 max-w-xl mx-auto leading-tight">
          Todo lo que necesitas, nada que no necesitas
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

      {/* Resultado */}
      <section className="max-w-5xl mx-auto px-5 pb-20 w-full">
        <div className="bg-ink text-white rounded-2xl p-8 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-8">Lo que cambia cuando usas PanelFit</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Cero PDFs que enviar cada semana',
              'Cero dudas sobre qué ejercicio hacer — el vídeo está en el panel',
              'Sabes qué clientes entrenan y cuáles no, sin preguntar',
              'El cliente ve su progreso, se motiva y renueva',
              'Tus clientes te recomiendan porque la experiencia es profesional',
              'Tú tienes más tiempo porque gestionas menos por WhatsApp',
            ].map(t => (
              <div key={t} className="flex items-start gap-3">
                <Check className="w-4 h-4 text-ok flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white/80">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-card border-y border-border">
        <div className="max-w-3xl mx-auto px-5 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4 text-center">Preguntas frecuentes</p>
          <h2 className="text-3xl font-serif font-bold text-center mb-10">Todo lo que necesitas saber</h2>
          <div className="bg-bg border border-border rounded-2xl px-6 divide-y divide-border">
            {FAQS.map(f => <FAQItem key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-5xl mx-auto px-5 py-24 w-full text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-6">Beta gratuita ahora mismo</p>
        <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-6 leading-tight">
          Di adiós a los PDFs.<br /><span className="text-accent italic">Hoy mismo.</span>
        </h2>
        <p className="text-muted max-w-md mx-auto mb-10 text-sm leading-relaxed">
          Solicita acceso y en menos de 5 minutos tienes a tu primer cliente con su panel activo.
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
