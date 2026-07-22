import { useEffect } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'

interface Props {
  onDemo: () => void
  onRegister: () => void
  onLogin: () => void
}

const COMPARATIVA = [
  {
    nombre: 'PanelFit',
    precio: 'Desde 15€/mes',
    sinApp: true,
    enEspanol: true,
    panelCliente: true,
    plantillas: true,
    destacado: true,
  },
  {
    nombre: 'Harbiz',
    precio: 'Desde 29€/mes',
    sinApp: false,
    enEspanol: true,
    panelCliente: true,
    plantillas: true,
    destacado: false,
  },
  {
    nombre: 'Trainerize',
    precio: 'Desde 12 USD/mes',
    sinApp: false,
    enEspanol: false,
    panelCliente: true,
    plantillas: true,
    destacado: false,
  },
  {
    nombre: 'TrueCoach',
    precio: 'Desde 19 USD/mes',
    sinApp: false,
    enEspanol: false,
    panelCliente: true,
    plantillas: false,
    destacado: false,
  },
  {
    nombre: 'Google Sheets',
    precio: 'Gratis',
    sinApp: true,
    enEspanol: true,
    panelCliente: false,
    plantillas: false,
    destacado: false,
  },
]

export function BlogMejorSoftware({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Mejor software para entrenador personal en 2025 (comparativa real) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'Comparamos las mejores herramientas de gestión para entrenadores personales en 2025: PanelFit, Harbiz, Trainerize y TrueCoach. Precios, pros y contras reales.'
    )
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'ld-blog-software'
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Mejor software para entrenador personal en 2025 (comparativa real)',
      description: 'Comparamos las mejores herramientas de gestión para entrenadores personales en 2025.',
      author: { '@type': 'Organization', name: 'PanelFit' },
      publisher: { '@type': 'Organization', name: 'PanelFit', url: 'https://panelfit.vercel.app' },
      datePublished: '2025-02-01',
      dateModified: '2025-07-01',
      url: 'https://panelfit.vercel.app/blog/mejor-software-entrenador-personal',
    })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-blog-software')?.remove() }
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-bg/95 backdrop-blur z-10">
        <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
        <div className="flex items-center gap-4">
          <a href="/precios" className="text-sm text-text-secondary hover:text-text hidden sm:block">Precios</a>
          <button onClick={onLogin} className="text-sm text-text-secondary hover:text-text">Entrar</button>
          <button onClick={onDemo} className="text-sm bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90">Ver demo</button>
        </div>
      </nav>

      <article className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-sm text-text-secondary mb-6">
          <a href="/" className="hover:text-text">PanelFit</a>
          <span className="mx-2">/</span>
          <a href="/blog" className="hover:text-text">Blog</a>
          <span className="mx-2">/</span>
          <span>Mejor software entrenador personal</span>
        </p>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight mb-4">
          Mejor software para entrenador personal en 2025: comparativa real
        </h1>
        <p className="text-text-secondary text-sm mb-8">Actualizado julio 2025 · 8 min de lectura</p>

        <p className="text-lg text-text-secondary leading-relaxed mb-8">
          Hay decenas de herramientas para gestionar clientes como entrenador personal. Algunas cuestan una fortuna,
          otras están en inglés, y muchas exigen que tus clientes descarguen una app que nadie instala.
          Esta comparativa es honesta: ponemos las más usadas en 2025 y explicamos para qué perfil encaja cada una.
        </p>

        <hr className="border-border mb-8" />

        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Qué debe tener un buen software de entrenamiento</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Antes de comparar herramientas, conviene saber qué buscar. Un buen software para entrenador personal debería:
            </p>
            <ul className="space-y-2">
              {[
                'Permitir crear y enviar planes de entrenamiento en minutos',
                'Registrar el progreso del cliente sin que tenga que instalar nada',
                'Dar una vista rápida de quién entrenó y quién no',
                'Funcionar bien en móvil (tuyo y del cliente)',
                'Tener un precio que tenga sentido para autónomos',
              ].map(item => (
                <li key={item} className="flex gap-3 text-text-secondary">
                  <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tabla comparativa */}
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Comparativa rápida</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold">Herramienta</th>
                    <th className="text-center py-3 px-2 font-semibold">Precio</th>
                    <th className="text-center py-3 px-2 font-semibold">Sin app</th>
                    <th className="text-center py-3 px-2 font-semibold">En español</th>
                    <th className="text-center py-3 px-2 font-semibold">Panel cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVA.map(t => (
                    <tr key={t.nombre} className={`border-b border-border ${t.destacado ? 'bg-accent/5' : ''}`}>
                      <td className="py-3 pr-4 font-medium">
                        {t.nombre}
                        {t.destacado && <span className="ml-2 text-xs bg-accent text-white px-1.5 py-0.5 rounded">Este</span>}
                      </td>
                      <td className="py-3 px-2 text-center text-text-secondary">{t.precio}</td>
                      <td className="py-3 px-2 text-center">
                        {t.sinApp ? <Check className="w-4 h-4 text-accent mx-auto" /> : <X className="w-4 h-4 text-text-secondary/40 mx-auto" />}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {t.enEspanol ? <Check className="w-4 h-4 text-accent mx-auto" /> : <X className="w-4 h-4 text-text-secondary/40 mx-auto" />}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {t.panelCliente ? <Check className="w-4 h-4 text-accent mx-auto" /> : <X className="w-4 h-4 text-text-secondary/40 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">PanelFit — para entrenadores que quieren simplicidad</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              PanelFit está diseñado para entrenadores personales autónomos que tienen entre 5 y 30 clientes y no quieren
              complicarse. La premisa es simple: cada cliente tiene un panel propio accesible por enlace, sin app,
              sin registro del cliente.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              El entrenador crea el plan, lo asigna al cliente, y el cliente entra por el enlace para registrar
              sus entrenamientos. El entrenador ve de un vistazo quién entrenó, quién lleva días sin actividad,
              y cuánto progresó cada uno.
            </p>
            <p className="text-text-secondary leading-relaxed">
              <strong>Para quién:</strong> entrenadores en España que buscan una herramienta en español, sin complicaciones,
              a un precio razonable. No es la opción con más funciones, pero sí la más rápida de poner en marcha.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Harbiz — la opción más completa en español</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Harbiz es la herramienta de gestión para entrenadores más completa del mercado en español.
              Incluye facturación, pagos, videoconferencia, app de cliente, y una interfaz muy trabajada.
            </p>
            <p className="text-text-secondary leading-relaxed">
              El inconveniente es el precio (desde 29€/mes) y que el cliente <em>tiene</em> que descargar la app,
              lo que genera fricción. Para entrenadores con más de 20 clientes y que quieren gestionar también
              los cobros desde la plataforma, es la mejor opción española.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Trainerize — el estándar internacional</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Trainerize es la plataforma más usada a nivel mundial. Tiene una biblioteca de ejercicios enorme,
              integración con apps de fitness, y mucha flexibilidad en los planes.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Los dos problemas para el mercado español: está completamente en inglés (incluyendo la app del cliente)
              y los precios están en dólares, lo que genera incertidumbre con el tipo de cambio.
              Para entrenadores con clientela internacional o que dominen el inglés, es una opción sólida.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Google Sheets — la opción gratuita que no escala</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Muchos entrenadores empiezan con Google Sheets y tiene sentido: es gratis, flexible, y todo el mundo
              sabe usarlo. El problema es que no escala. Con más de 8-10 clientes, mantener las hojas actualizadas
              se convierte en trabajo a tiempo completo.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Tampoco hay panel de cliente real, así que el intercambio de información ocurre por WhatsApp
              o email, dispersando los datos.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">¿Cuál elegir?</h2>
            <ul className="space-y-3">
              {[
                ['Empezando, pocos clientes, sin presupuesto', 'Google Sheets hasta que duela, luego PanelFit'],
                ['Entre 5 y 25 clientes, quieres algo simple en español', 'PanelFit'],
                ['Quieres gestionar cobros y todo desde una plataforma', 'Harbiz'],
                ['Clientes internacionales o prefieres inglés', 'Trainerize'],
              ].map(([caso, rec]) => (
                <li key={caso} className="p-4 border border-border rounded-xl">
                  <p className="text-sm text-text-secondary">{caso}</p>
                  <p className="font-semibold mt-1">→ {rec}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <hr className="border-border my-10" />

        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">Prueba PanelFit gratis</h3>
          <p className="text-text-secondary leading-relaxed">
            Demo en vivo con clientes ficticios. Sin registro, sin tarjeta.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={onDemo}
              className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Ver demo <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onRegister}
              className="px-6 py-3 border border-border rounded-xl hover:bg-surface transition-colors text-sm"
            >
              Solicitar acceso gratis
            </button>
          </div>
        </div>

        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-4">Artículos relacionados</h3>
          <div className="space-y-3">
            <a href="/blog/como-organizar-clientes-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
              <p className="font-medium">Cómo organizar tus clientes como entrenador personal</p>
              <p className="text-sm text-text-secondary mt-1">Sistema práctico para escalar sin caos</p>
            </a>
            <a href="/alternativas/harbiz" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
              <p className="font-medium">PanelFit vs Harbiz: comparativa detallada</p>
              <p className="text-sm text-text-secondary mt-1">Diferencias clave entre las dos opciones en español</p>
            </a>
          </div>
        </div>
      </article>

      <footer className="border-t border-border px-4 sm:px-8 py-8 text-center text-sm text-text-secondary">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a href="/" className="hover:text-text">Inicio</a>
          <a href="/precios" className="hover:text-text">Precios</a>
          <a href="/alternativas/harbiz" className="hover:text-text">vs Harbiz</a>
          <a href="/alternativas/trainerize" className="hover:text-text">vs Trainerize</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
