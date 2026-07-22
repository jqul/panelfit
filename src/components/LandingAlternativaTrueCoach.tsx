import { useEffect, useState } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

const COMPARATIVA = [
  { feature: 'En español', panelfit: true, rival: false },
  { feature: 'Sin app para el cliente', panelfit: true, rival: false },
  { feature: 'Precio desde', panelfit: '15€/mes', rival: '$19/mes (USD)' },
  { feature: 'Planes de entrenamiento', panelfit: true, rival: true },
  { feature: 'Seguimiento de progreso', panelfit: true, rival: true },
  { feature: 'Mensajería con cliente', panelfit: true, rival: true },
  { feature: 'Vídeos de ejercicio', panelfit: true, rival: true },
  { feature: 'Panel del entrenador en español', panelfit: true, rival: false },
]

const FAQS = [
  { q: '¿TrueCoach está en español?', a: 'No. TrueCoach es una plataforma estadounidense completamente en inglés. Tanto el panel del entrenador como la app del cliente están en inglés, lo que puede ser un problema para entrenadores y clientes hispanohablantes.' },
  { q: '¿Cuánto cuesta TrueCoach comparado con PanelFit?', a: 'TrueCoach cobra desde $19/mes en dólares por hasta 5 clientes, subiendo a $69/mes para 30 clientes. PanelFit empieza en 15€/mes con hasta 15 clientes. Además, los precios en USD fluctúan con el tipo de cambio.' },
  { q: '¿TrueCoach requiere que el cliente instale una app?', a: 'Sí, TrueCoach tiene app para iOS y Android que los clientes deben descargar. PanelFit no requiere instalación: el cliente accede por un enlace desde cualquier navegador.' },
  { q: '¿Para qué perfil es mejor TrueCoach?', a: 'TrueCoach es una buena opción para entrenadores con clientela internacional o angloparlante. Para entrenadores en España con clientes españoles, la barrera del idioma y el precio en dólares hacen que PanelFit sea más práctico.' },
]

export function LandingAlternativaTrueCoach({ onDemo, onRegister, onLogin }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    document.title = 'Alternativa a TrueCoach en español (2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      '¿Buscas una alternativa a TrueCoach en español? PanelFit: sin app, en español, desde 15€/mes. Ideal para entrenadores personales en España.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-alt-truecoach'
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-alt-truecoach')?.remove() }
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
          <p className="text-sm text-accent font-medium mb-3">Alternativa a TrueCoach</p>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4">TrueCoach es bueno.<br />Pero no está en español.</h1>
          <p className="text-xl text-text-secondary max-w-xl mx-auto">TrueCoach es una plataforma sólida para el mercado anglosajón. Para entrenadores en España, el idioma y los precios en dólares son un problema innecesario.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button onClick={onDemo} className="px-8 py-3.5 bg-accent text-white font-semibold rounded-xl hover:opacity-90">Ver demo gratis →</button>
            <button onClick={onRegister} className="px-8 py-3.5 border border-border rounded-xl hover:bg-surface transition-colors">Solicitar acceso</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-16">
          {[
            { title: 'En inglés', desc: 'Panel del entrenador y app del cliente completamente en inglés. No hay opción de cambiar el idioma.' },
            { title: 'Precio en USD', desc: 'Desde $19/mes en dólares. El coste real varía cada mes según el tipo de cambio EUR/USD.' },
            { title: 'Requiere app', desc: 'Tus clientes necesitan descargar la app de TrueCoach para ver su plan y registrar los entrenamientos.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 bg-surface rounded-2xl border border-border">
              <p className="font-semibold mb-2">{title}</p>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-serif font-semibold mb-6 text-center">PanelFit vs TrueCoach</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-6"></th>
                  <th className="text-center py-3 px-4 text-accent font-bold">PanelFit</th>
                  <th className="text-center py-3 px-4 text-text-secondary font-semibold">TrueCoach</th>
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
          <p className="text-text-secondary">En español, sin app para el cliente, desde 15€/mes.</p>
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
          <a href="/alternativas/mypthub" className="hover:text-text">vs My PT Hub</a>
          <a href="/precios" className="hover:text-text">Precios</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
