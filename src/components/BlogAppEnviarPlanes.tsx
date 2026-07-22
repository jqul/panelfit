import { useEffect } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

export function BlogAppEnviarPlanes({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Aplicación para enviar planes de entrenamiento a clientes (2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Cómo enviar planes de entrenamiento a tus clientes de forma profesional en 2025. Comparativa de métodos: PDF, WhatsApp, app y panel web.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-app-planes'
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article',
      headline: 'Aplicación para enviar planes de entrenamiento a clientes (2025)',
      author: { '@type': 'Organization', name: 'PanelFit' },
      publisher: { '@type': 'Organization', name: 'PanelFit', url: 'https://panelfit.vercel.app' },
      datePublished: '2025-05-15', dateModified: '2025-07-01',
      url: 'https://panelfit.vercel.app/blog/app-enviar-planes-entrenamiento-clientes' })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-app-planes')?.remove() }
  }, [])

  const metodos = [
    { nombre: 'PDF por WhatsApp', cliente: true, registro: false, actualizable: false, professional: false },
    { nombre: 'Google Sheets compartido', cliente: true, registro: true, actualizable: true, professional: false },
    { nombre: 'App de entrenamiento (Trainerize, etc.)', cliente: false, registro: true, actualizable: true, professional: true },
    { nombre: 'Panel web por enlace (PanelFit)', cliente: true, registro: true, actualizable: true, professional: true },
  ]

  return (
    <div className="min-h-screen bg-bg text-text">
      <nav className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-bg/95 backdrop-blur z-10">
        <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
        <div className="flex items-center gap-4">
          <a href="/blog" className="text-sm text-text-secondary hover:text-text hidden sm:block">Blog</a>
          <a href="/precios" className="text-sm text-text-secondary hover:text-text hidden sm:block">Precios</a>
          <button onClick={onLogin} className="text-sm text-text-secondary hover:text-text">Entrar</button>
          <button onClick={onDemo} className="text-sm bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90">Ver demo</button>
        </div>
      </nav>
      <article className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-sm text-text-secondary mb-6">
          <a href="/" className="hover:text-text">PanelFit</a><span className="mx-2">/</span>
          <a href="/blog" className="hover:text-text">Blog</a><span className="mx-2">/</span>
          <span>App para enviar planes</span>
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight mb-4">
          Aplicación para enviar planes de entrenamiento a clientes: qué usar en 2025
        </h1>
        <p className="text-text-secondary text-sm mb-8">Actualizado julio 2025 · 6 min de lectura</p>
        <p className="text-lg text-text-secondary leading-relaxed mb-8">
          Enviar un PDF por WhatsApp funciona para el primer cliente. Con 10 clientes, se vuelve un caos:
          versiones desactualizadas, preguntas sobre ejercicios que ya explicaste, y ningún registro de
          lo que hizo cada uno. Esta guía compara los métodos reales que usan los entrenadores en 2025.
        </p>
        <hr className="border-border mb-8" />
        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">El problema del PDF</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              El PDF es el método más extendido entre entrenadores personales, y tiene sentido: es fácil de crear,
              todos los clientes pueden abrirlo, y queda "profesional". Pero tiene tres problemas graves:
            </p>
            <ul className="space-y-2">
              {[
                'Es estático: cuando actualizas el plan, tienes que reenviar un nuevo PDF y el cliente puede confundirse con versiones.',
                'No hay registro: el cliente lee el PDF pero no hay forma de saber si entrenó, con qué pesos, ni cuántas veces.',
                'No hay interactividad: el cliente no puede marcar series completadas, apuntar pesos, ni dejar notas.',
              ].map(item => (
                <li key={item} className="flex gap-3 text-text-secondary">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Comparativa de métodos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 font-semibold">Método</th>
                    <th className="text-center py-3 px-2 font-semibold">Sin instalar</th>
                    <th className="text-center py-3 px-2 font-semibold">Registro</th>
                    <th className="text-center py-3 px-2 font-semibold">Actualizable</th>
                    <th className="text-center py-3 px-2 font-semibold">Profesional</th>
                  </tr>
                </thead>
                <tbody>
                  {metodos.map(m => (
                    <tr key={m.nombre} className="border-b border-border">
                      <td className="py-3 pr-4 font-medium text-xs sm:text-sm">{m.nombre}</td>
                      {([m.cliente, m.registro, m.actualizable, m.professional] as boolean[]).map((v, i) => (
                        <td key={i} className="py-3 px-2 text-center">
                          {v ? <Check className="w-4 h-4 text-accent mx-auto" /> : <X className="w-4 h-4 text-text-secondary/30 mx-auto" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Por qué el cliente no instala la app</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Las apps de entrenamiento (Trainerize, MyFitnessPal, etc.) tienen el problema de la fricción de instalación.
              Estudios de UX muestran que cada paso adicional en un proceso reduce la tasa de completado en un 20-30%.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              En la práctica: le dices al cliente que instale la app, le mandas el enlace, y dos días después
              te pregunta por qué no ve su plan. No la instaló. O la instaló pero no creó la cuenta. O la creó
              pero con otro email y no encuentra su plan.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Un panel web accesible por enlace elimina todo eso: el cliente hace clic y ya está.
              Sin descarga, sin cuenta, sin fricción.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Qué debe tener el sistema ideal</h2>
            <ul className="space-y-2">
              {[
                'El cliente accede sin instalar nada — solo un enlace',
                'El plan está estructurado por días y semanas, no como texto plano',
                'El cliente puede registrar pesos y series completadas directamente',
                'Tú puedes actualizar el plan y el cliente ve los cambios al momento',
                'Tienes una vista de quién entrenó y cuándo sin tener que preguntar',
              ].map(item => (
                <li key={item} className="flex gap-3 text-text-secondary">
                  <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <hr className="border-border my-10" />
        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">PanelFit: el plan en un enlace</h3>
          <p className="text-text-secondary leading-relaxed">Tu cliente hace clic, ve su plan, registra la sesión. Tú ves quién entrenó. Sin apps, sin fricciones.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={onDemo} className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
              Ver demo <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onRegister} className="px-6 py-3 border border-border rounded-xl hover:bg-bg transition-colors text-sm">Solicitar acceso gratis</button>
          </div>
        </div>
        <div className="mt-12 space-y-3">
          <h3 className="text-lg font-semibold mb-4">Artículos relacionados</h3>
          <a href="/blog/mejor-software-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Mejor software para entrenador personal en 2025</p>
            <p className="text-sm text-text-secondary mt-1">Comparativa real entre las herramientas más usadas</p>
          </a>
          <a href="/blog/plantillas-entrenamiento-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Plantillas de entrenamiento para entrenador personal</p>
            <p className="text-sm text-text-secondary mt-1">Ahorra tiempo sin sacrificar calidad</p>
          </a>
        </div>
      </article>
      <footer className="border-t border-border px-4 sm:px-8 py-8 text-center text-sm text-text-secondary">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a href="/" className="hover:text-text">Inicio</a>
          <a href="/blog" className="hover:text-text">Blog</a>
          <a href="/precios" className="hover:text-text">Precios</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
