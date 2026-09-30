import { useEffect, useState } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

const COMPARATIVA = [
  { feature: 'En español', panelfit: true, rival: false },
  { feature: 'Sin app para el cliente', panelfit: true, rival: false },
  { feature: 'Precio desde', panelfit: '15€/mes', rival: '$56/mes (USD)' },
  { feature: 'Planes de entrenamiento', panelfit: true, rival: true },
  { feature: 'Seguimiento de progreso', panelfit: true, rival: true },
  { feature: 'Nutrición / dieta', panelfit: true, rival: true },
  { feature: 'Informes PDF', panelfit: true, rival: true },
  { feature: 'Precio accesible autónomos', panelfit: true, rival: false },
]

const FAQS = [
  { q: '¿PT Distinction está en español?', a: 'No. PT Distinction es una plataforma internacional en inglés. Tanto la interfaz del entrenador como la app del cliente están en inglés.' },
  { q: '¿Cuánto cuesta PT Distinction?', a: 'PT Distinction cuesta desde $56/mes para hasta 10 clientes, llegando a $99/mes para clientes ilimitados. En euros, con el tipo de cambio actual, son más de 50€/mes desde el plan básico. PanelFit empieza en 15€/mes.' },
  { q: '¿Para qué tipo de entrenador es PT Distinction?', a: 'PT Distinction está orientado a entrenadores con negocio establecido y volumen alto de clientes, que necesitan automatización avanzada y marca blanca completa. Para entrenadores que están empezando o tienen menos de 20 clientes, el precio no tiene sentido.' },
  { q: '¿Qué ventaja tiene PanelFit sobre PT Distinction para entrenadores españoles?', a: 'Tres ventajas principales: está en español (tú y tus clientes), no requiere app (el cliente accede por enlace), y cuesta significativamente menos. PT Distinction es más potente en automatización, pero para la mayoría de entrenadores autónomos en España es sobredimensionado.' },
]

export function LandingAlternativaPTDistinction({ onDemo, onRegister, onLogin }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    document.title = 'Alternativa a PT Distinction en español (2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      '¿Buscas una alternativa a PT Distinction más barata y en español? PanelFit desde 15€/mes, sin app para el cliente, en español.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-alt-ptd'
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-alt-ptd')?.remove() }
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
          <p className="text-sm text-accent font-medium mb-3">Alternativa a PT Distinction</p>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4">PT Distinction cobra +50€/mes.<br />PanelFit, 15€.</h1>
          <p className="text-xl text-text-secondary max-w-xl mx-auto">PT Distinction es potente pero caro y en inglés. Para entrenadores autónomos en España, es sobredimensionado.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button onClick={onDemo} className="px-8 py-3.5 bg-accent text-white font-semibold rounded-xl hover:opacity-90">Ver demo gratis →</button>
            <button onClick={onRegister} className="px-8 py-3.5 border border-border rounded-xl hover:bg-surface transition-colors">Solicitar acceso</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-16">
          {[
            { title: 'Caro para autónomos', desc: 'Desde $56/mes (más de 50€) para pocos clientes. Para un entrenador que empieza, es un gasto difícil de justificar.' },
            { title: 'En inglés', desc: 'Plataforma y app del cliente completamente en inglés. No hay opción de idioma en español.' },
            { title: 'Curva de aprendizaje alta', desc: 'PT Distinction tiene muchas funciones que implican tiempo de configuración antes de poder usarlo con clientes.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 bg-surface rounded-2xl border border-border">
              <p className="font-semibold mb-2">{title}</p>
              <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-serif font-semibold mb-6 text-center">PanelFit vs PT Distinction</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-6"></th>
                  <th className="text-center py-3 px-4 text-accent font-bold">PanelFit</th>
                  <th className="text-center py-3 px-4 text-text-secondary font-semibold">PT Distinction</th>
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
          <p className="text-text-secondary">En español, sin app, desde 15€/mes. Listo en minutos.</p>
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
