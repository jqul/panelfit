import { useEffect, useState } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

const COMPARATIVA = [
  { feature: 'En español', panelfit: true, rival: false },
  { feature: 'Sin app para el cliente', panelfit: true, rival: false },
  { feature: 'Panel web por enlace', panelfit: true, rival: false },
  { feature: 'Planes de entrenamiento', panelfit: true, rival: true },
  { feature: 'Seguimiento de progreso', panelfit: true, rival: true },
  { feature: 'Biblioteca de ejercicios', panelfit: true, rival: true },
  { feature: 'Hábitos y check-ins', panelfit: true, rival: true },
  { feature: 'Precio desde', panelfit: '15€/mes', rival: '$29/mes (USD)' },
]

const FAQS = [
  { q: '¿My PT Hub está en español?', a: 'No. My PT Hub es una plataforma anglosajona (Reino Unido) completamente en inglés, incluyendo la app que ven tus clientes. Para entrenadores españoles o con clientes hispanohablantes, esto es un problema real: tus clientes verán todos los textos en inglés.' },
  { q: '¿Mis clientes tienen que descargar una app con My PT Hub?', a: 'Sí. My PT Hub requiere que tus clientes descarguen su app para acceder al plan y registrar entrenamientos. PanelFit no requiere instalación — el cliente accede por un enlace directo desde cualquier navegador.' },
  { q: '¿Es más barato My PT Hub o PanelFit?', a: 'My PT Hub cobra desde $29/mes en dólares americanos, lo que con el tipo de cambio equivale a más de 26€/mes. PanelFit empieza en 15€/mes. Además, los precios en dólares fluctúan con el tipo de cambio.' },
  { q: '¿Qué tiene My PT Hub que no tiene PanelFit?', a: 'My PT Hub tiene integraciones con wearables (Apple Watch, Garmin), una comunidad más grande de usuarios, y lleva más años en el mercado. PanelFit está enfocado en el mercado español y es significativamente más simple de usar.' },
]

export function LandingAlternativaMyPTHub({ onDemo, onRegister, onLogin }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    document.title = 'Alternativa a My PT Hub en español (2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Buscas una alternativa a My PT Hub en español? PanelFit es la opción para entrenadores personales españoles: sin app, en español, desde 15€/mes.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-alt-mypthub'
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-alt-mypthub')?.remove() }
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-bg/95 backdrop-blur z-10">
        <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
        <div className="flex items-center gap-4">
          <a href="/precios" className="text-sm text-text-secondary hover:text-text hidden sm:block">Precios</a>
          <a href="/blog" className="text-sm text-text-secondary hover:text-text hidden sm:block">Blog</a>
          <button onClick={onLogin} className="text-sm text-text-secondary hover:text-text">Entrar</button>
          <button onClick={onDemo} className="text-sm bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90">Ver demo</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-sm text-accent font-medium mb-3">Alternativa a My PT Hub</p>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4">My PT Hub está en inglés.<br />PanelFit, no.</h1>
          <p className="text-xl text-text-secondary max-w-xl mx-auto">Para entrenadores personales en España, trabajar con una plataforma en inglés complica todo: tú, tus clientes, y el soporte.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button onClick={onDemo} className="px-8 py-3.5 bg-accent text-white font-semibold rounded-xl hover:opacity-90">Ver demo gratis →</button>
            <button onClick={onRegister} className="px-8 py-3.5 border border-border rounded-xl hover:bg-surface transition-colors">Solicitar acceso</button>
          </div>
        </div>

        {/* Problema principal */}
        <div className="grid sm:grid-cols-3 gap-4 mb-16">
          {[
            { title: 'Todo en inglés', desc: 'La app que ven tus clientes está en inglés. Para muchos clientes españoles, esto genera confusión y abandono.' },
            { title: 'Requiere app', desc: 'Tus clientes tienen que descargar e instalar la app. Cada paso extra reduce la tasa de uso.' },
            { title: 'Precio en dólares', desc: 'Los $29/mes fluctúan con el tipo de cambio. No sabes exactamente cuánto pagarás el mes que viene.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 bg-surface rounded-2xl border border-border">
              <p className="font-semibold mb-2">{title}</p>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Comparativa */}
        <div className="mb-16">
          <h2 className="text-2xl font-serif font-semibold mb-6 text-center">PanelFit vs My PT Hub</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-6"></th>
                  <th className="text-center py-3 px-4 text-accent font-bold">PanelFit</th>
                  <th className="text-center py-3 px-4 text-text-secondary font-semibold">My PT Hub</th>
                </tr>
              </thead>
              <tbody>
                {COMPARATIVA.map(row => (
                  <tr key={row.feature} className="border-b border-border/50">
                    <td className="py-3 pr-6 text-text-secondary">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.panelfit === 'boolean'
                        ? row.panelfit ? <Check className="w-5 h-5 text-accent mx-auto" /> : <X className="w-5 h-5 text-text-secondary/40 mx-auto" />
                        : <span className="font-semibold text-accent">{row.panelfit}</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {typeof row.rival === 'boolean'
                        ? row.rival ? <Check className="w-5 h-5 text-text-secondary mx-auto" /> : <X className="w-5 h-5 text-text-secondary/40 mx-auto" />
                        : <span className="text-text-secondary">{row.rival}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-serif font-semibold mb-6">Preguntas frecuentes</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-surface transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-medium pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-text-secondary flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-5 pb-4 text-text-secondary text-sm leading-relaxed">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">Prueba PanelFit gratis</h3>
          <p className="text-text-secondary">Demo en vivo en español. Sin app, sin registro del cliente, sin tarjeta.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={onDemo} className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90">Ver demo →</button>
            <button onClick={onRegister} className="px-6 py-3 border border-border rounded-xl hover:bg-bg transition-colors text-sm">Solicitar acceso gratis</button>
          </div>
        </div>
      </div>

      <footer className="border-t border-border px-4 sm:px-8 py-8 text-center text-sm text-text-secondary">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a href="/" className="hover:text-text">Inicio</a>
          <a href="/alternativas/harbiz" className="hover:text-text">vs Harbiz</a>
          <a href="/alternativas/trainerize" className="hover:text-text">vs Trainerize</a>
          <a href="/precios" className="hover:text-text">Precios</a>
          <a href="/blog" className="hover:text-text">Blog</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
