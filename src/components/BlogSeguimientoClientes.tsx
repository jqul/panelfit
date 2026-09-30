import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  onDemo: () => void
  onRegister: () => void
  onLogin: () => void
}

export function BlogSeguimientoClientes({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Cómo hacer seguimiento de clientes en el gym (guía 2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'Guía para entrenadores de gimnasio: cómo hacer un seguimiento real de tus clientes, qué métricas importan y qué herramientas usar en 2025.'
    )
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'ld-blog-seguimiento'
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Cómo hacer seguimiento de clientes en el gym (guía 2025)',
      description: 'Guía para entrenadores de gimnasio: seguimiento real de clientes, métricas y herramientas.',
      author: { '@type': 'Organization', name: 'PanelFit' },
      publisher: { '@type': 'Organization', name: 'PanelFit', url: 'https://panelfit.vercel.app' },
      datePublished: '2025-03-01',
      dateModified: '2025-07-01',
      url: 'https://panelfit.vercel.app/blog/como-hacer-seguimiento-clientes-gym',
    })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-blog-seguimiento')?.remove() }
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
          <span>Seguimiento de clientes en el gym</span>
        </p>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight mb-4">
          Cómo hacer seguimiento de clientes en el gym: guía práctica 2025
        </h1>
        <p className="text-text-secondary text-sm mb-8">Actualizado julio 2025 · 6 min de lectura</p>

        <p className="text-lg text-text-secondary leading-relaxed mb-8">
          El seguimiento de clientes es lo que diferencia a un entrenador personal que retiene clientes durante años
          del que los pierde a los tres meses. No se trata solo de apuntar pesos — se trata de tener suficiente
          información para tomar decisiones y para que el cliente sienta que su progreso importa.
        </p>

        <hr className="border-border mb-8" />

        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Por qué la mayoría de entrenadores hace mal el seguimiento</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              El error más común es confundir "dar un plan" con "hacer seguimiento". Un plan de entrenamiento es
              el punto de partida, no el resultado. El seguimiento es lo que ocurre después: ¿lo siguió el cliente?
              ¿con qué cargas? ¿cómo se sintió? ¿qué hay que ajustar?
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              Sin respuestas a esas preguntas, el entrenador está programando a ciegas. El cliente, por su parte,
              siente que podría estar siguiendo cualquier plan genérico de internet — porque en la práctica,
              sin seguimiento, lo está haciendo.
            </p>
            <p className="text-text-secondary leading-relaxed">
              La retención de clientes está directamente ligada a cuánto sienten que su entrenador
              <em> les está prestando atención</em>. El seguimiento es la herramienta principal para generar esa sensación.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Qué métricas seguir (y cuáles ignorar)</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              No todas las métricas tienen el mismo valor. Estas son las que realmente importan:
            </p>
            <div className="space-y-4">
              {[
                {
                  title: 'Adherencia al plan',
                  desc: '¿Cuántos días de los planificados entrenó realmente? Si un cliente tiene un plan de 4 días y entrena 2, el problema no es el plan — es la adherencia. Sin este dato, no puedes distinguir falta de progreso por mal programa de falta de progreso por falta de consistencia.',
                },
                {
                  title: 'Progresión de carga',
                  desc: 'Los pesos que mueve cada semana en los ejercicios principales. Es la métrica más objetiva de progreso en fuerza. Un cliente que lleva 3 meses sin aumentar peso en sentadilla tiene un problema que hay que diagnosticar.',
                },
                {
                  title: 'Última sesión registrada',
                  desc: 'Cuándo fue la última vez que el cliente entrenó. Un cliente que lleva 8 días sin actividad está en riesgo de abandono — si lo detectas a tiempo, puedes actuar.',
                },
                {
                  title: 'Peso corporal y medidas',
                  desc: 'Solo si el objetivo es composición corporal. Tomarlas cada 2-4 semanas es suficiente — más frecuente genera ansiedad sin aportar más información.',
                },
              ].map(({ title, desc }) => (
                <div key={title} className="p-4 bg-surface rounded-xl">
                  <p className="font-semibold mb-2">{title}</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-text-secondary leading-relaxed mt-4">
              Métricas que puedes ignorar al principio: frecuencia cardíaca en reposo, VFC, sueño.
              Son interesantes pero añaden complejidad sin cambiar mucho las decisiones de programación
              para la mayoría de clientes.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">El sistema de seguimiento en 3 pasos</h2>
            <div className="space-y-6">
              {[
                {
                  n: '1',
                  title: 'El cliente registra cada sesión',
                  desc: 'El registro tiene que ser lo más fácil posible para el cliente. Si requiere más de 2 minutos, no lo hará de forma consistente. Lo ideal: entra al plan, apunta los pesos y series que hizo, y listo. Sin apps, sin formularios complicados.',
                },
                {
                  n: '2',
                  title: 'Tú revisas una vez por semana',
                  desc: 'No necesitas revisar cada sesión en tiempo real. Una revisión semanal de 15-20 minutos para ver todos tus clientes es suficiente: quién entrenó, qué progresó, quién lleva días sin actividad. Con esta información, decides a quién contactar y qué ajustar.',
                },
                {
                  n: '3',
                  title: 'Ajustas el plan según los datos',
                  desc: 'El seguimiento solo tiene valor si lo usas para tomar decisiones. Si un cliente lleva 3 semanas sin progresar en press de banca, hay que cambiar algo: más volumen, más descanso, técnica, nutrición. Los datos te dicen cuándo actuar.',
                },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex gap-4">
                  <div className="w-10 h-10 bg-accent text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">{n}</div>
                  <div>
                    <p className="font-semibold mb-1">{title}</p>
                    <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Seguimiento presencial vs online</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              El seguimiento funciona igual para entrenamiento presencial y online, pero los retos son distintos.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              En <strong>presencial</strong>, el problema es que el registro ocurre durante la sesión
              (en papel o en la cabeza del entrenador) y después se pierde o no se digitaliza.
              Muchos entrenadores presenciales no tienen ningún histórico de los pesos que movió un cliente
              hace 6 meses.
            </p>
            <p className="text-text-secondary leading-relaxed">
              En <strong>online</strong>, el reto es la visibilidad: no ves al cliente entrenar,
              así que el registro es la única forma de saber qué está pasando. Aquí el seguimiento
              no es opcional — sin datos, el entrenamiento online es solo vender PDFs.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Herramientas para el seguimiento</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Las opciones van de lo más simple a lo más completo:
            </p>
            <ul className="space-y-3 text-text-secondary">
              <li><strong className="text-text">Papel:</strong> el registro más rápido durante la sesión presencial, pero no tiene histórico digital ni es accesible para el cliente.</li>
              <li><strong className="text-text">Google Sheets:</strong> flexible y gratis, pero no tiene panel de cliente ni vista de resumen automática. Funciona hasta ~8 clientes.</li>
              <li><strong className="text-text">Software especializado (PanelFit, Harbiz, Trainerize):</strong> el plan y el registro están en el mismo sitio, el cliente entra por enlace o app, y el entrenador tiene una vista de todos sus clientes. La opción más eficiente cuando tienes más de 10 clientes.</li>
            </ul>
          </div>
        </section>

        <hr className="border-border my-10" />

        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">PanelFit: seguimiento sin fricciones</h3>
          <p className="text-text-secondary leading-relaxed">
            El cliente entra por enlace, registra la sesión en 2 minutos, y tú ves de un vistazo
            quién entrenó y quién no. Sin apps, sin complicaciones.
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
              <p className="text-sm text-text-secondary mt-1">Sistema para estructurar tu trabajo y escalar sin caos</p>
            </a>
            <a href="/blog/mejor-software-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
              <p className="font-medium">Mejor software para entrenador personal en 2025</p>
              <p className="text-sm text-text-secondary mt-1">Comparativa real: PanelFit, Harbiz, Trainerize y más</p>
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
