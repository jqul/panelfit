import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  onDemo: () => void
  onRegister: () => void
  onLogin: () => void
}

export function BlogOrganizarClientes({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Cómo organizar tus clientes como entrenador personal (2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'Guía práctica para entrenadores personales: cómo llevar el seguimiento de clientes, planes de entrenamiento y pagos sin morir en el intento.'
    )
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'ld-blog-organizar'
    ld.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Cómo organizar tus clientes como entrenador personal (2025)',
      description: 'Guía práctica para entrenadores personales: seguimiento de clientes, planes y pagos.',
      author: { '@type': 'Organization', name: 'PanelFit' },
      publisher: { '@type': 'Organization', name: 'PanelFit', url: 'https://panelfit.vercel.app' },
      datePublished: '2025-01-15',
      dateModified: '2025-07-01',
      url: 'https://panelfit.vercel.app/blog/como-organizar-clientes-entrenador-personal',
    })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-blog-organizar')?.remove() }
  }, [])

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Nav */}
      <nav className="border-b border-border px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 bg-bg/95 backdrop-blur z-10">
        <a href="/" className="text-xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></a>
        <div className="flex items-center gap-4">
          <a href="/precios" className="text-sm text-text-secondary hover:text-text hidden sm:block">Precios</a>
          <button onClick={onLogin} className="text-sm text-text-secondary hover:text-text">Entrar</button>
          <button onClick={onDemo} className="text-sm bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90">Ver demo</button>
        </div>
      </nav>

      <article className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Breadcrumb */}
        <p className="text-sm text-text-secondary mb-6">
          <a href="/" className="hover:text-text">PanelFit</a>
          <span className="mx-2">/</span>
          <a href="/blog" className="hover:text-text">Blog</a>
          <span className="mx-2">/</span>
          <span>Organizar clientes</span>
        </p>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight mb-4">
          Cómo organizar tus clientes como entrenador personal (sin volverte loco)
        </h1>

        <p className="text-text-secondary text-sm mb-8">Actualizado julio 2025 · 7 min de lectura</p>

        <p className="text-lg text-text-secondary leading-relaxed mb-8">
          Cuando tienes 5 clientes, una hoja de cálculo funciona. Cuando llegas a 15 o 20, empiezan los problemas:
          ¿quién entrenó ayer? ¿cuál era el plan de Carlos esta semana? ¿le mandé los vídeos a Laura?
          Esta guía te explica cómo estructurar tu trabajo para que escale sin caos.
        </p>

        <hr className="border-border mb-8" />

        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">1. El problema de escalar con WhatsApp y Excel</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              La mayoría de entrenadores personales empiezan igual: un grupo de WhatsApp por cliente, una hoja de Excel
              con los pesos, y los planes en PDF adjuntos al chat. Funciona hasta que no funciona.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              El problema principal es que toda la información está dispersa. Para saber cómo va María, tienes que
              abrir su chat de WhatsApp, buscar el último PDF que le mandaste, recordar cuándo fue su última sesión,
              y comparar con... ¿dónde apuntaste los pesos?
            </p>
            <p className="text-text-secondary leading-relaxed">
              Con 10+ clientes, esto se vuelve insostenible. El 80% del tiempo de gestión se va en <strong>buscar información</strong>,
              no en usarla.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">2. Centraliza la información por cliente</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              La solución más importante es tener <strong>un único sitio por cliente</strong> donde esté todo:
              su plan actual, su historial de entrenamientos, sus métricas de progreso, y la comunicación contigo.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              Esto puede ser tan simple como una carpeta en Google Drive por cliente con documentos organizados,
              o tan avanzado como un software específico para entrenadores. Lo importante es la consistencia:
              siempre el mismo sitio, siempre la misma estructura.
            </p>
            <ul className="space-y-3 mt-4">
              {[
                'Ficha del cliente: objetivos, historial médico relevante, datos de contacto',
                'Plan de entrenamiento activo (semana actual)',
                'Registro de progreso: peso, medidas, marcas personales',
                'Notas de sesión: cómo fue cada entreno, qué hay que ajustar',
                'Historial de comunicación o incidencias',
              ].map(item => (
                <li key={item} className="flex gap-3 text-text-secondary">
                  <span className="text-accent mt-1">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">3. Diferencia entre plan y registro</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Uno de los errores más comunes es mezclar el plan (lo que el cliente <em>tiene que hacer</em>)
              con el registro (lo que <em>hizo realmente</em>). Son dos cosas distintas y ambas son valiosas.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              El <strong>plan</strong> te dice cuál es la programación: series, repeticiones, cargas progresivas,
              bloques de periodización. El <strong>registro</strong> te dice la realidad: si entrenó, con qué peso
              acabó, si tuvo dolor, si se saltó algún ejercicio.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Con ambos puedes hacer análisis reales: adherencia al plan, progresión de carga real vs esperada,
              patrones de abandono. Sin el registro, el plan es solo teoría.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">4. Automatiza el registro del cliente</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              El cuello de botella más grande en la organización de clientes es el registro manual.
              Si el cliente tiene que mandarte un mensaje con los pesos y tú tienes que copiarlo a algún lado,
              en algún momento ese dato se pierde o simplemente no llega.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              La solución es que el cliente registre directamente en el mismo sistema donde está su plan.
              Cuando el registro ocurre en el mismo lugar que el plan, la adherencia sube porque el cliente
              ve inmediatamente si está siguiendo la progresión marcada.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Esto no requiere una app de cliente compleja. Con un panel web accesible por enlace,
              sin descargas, es suficiente para que la mayoría de clientes lo use.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">5. Revisa de un vistazo, no cliente por cliente</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Cuando tienes 15 clientes, no puedes revisar la ficha de cada uno cada día. Necesitas una vista
              de control que te diga, sin entrar en ninguna ficha, quién entrenó ayer, quién lleva una semana
              sin actividad, y quién va a completar su plan esta semana.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              Esta vista de resumen te permite priorizar: contactar proactivamente al cliente que lleva 5 días
              sin entrenar antes de que abandone, felicitar al que acaba de hacer un récord personal,
              ajustar el plan del que está sobreentrenando.
            </p>
            <p className="text-text-secondary leading-relaxed">
              El objetivo es pasar de <em>reactivo</em> (el cliente te avisa cuando hay un problema) a
              <em>proactivo</em> (tú ves el problema antes de que el cliente lo note).
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">6. Plantillas para no empezar de cero</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Cada vez que creas un plan nuevo desde cero estás perdiendo tiempo que podrías dedicar a optimizar
              los planes existentes. La solución son las plantillas: programas base que puedes personalizar
              en minutos en vez de construir desde cero en horas.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Una buena biblioteca de plantillas cubre los casos más comunes: iniciación, pérdida de grasa,
              hipertrofia, fuerza base, rehabilitación. Con 10-15 plantillas bien construidas puedes
              cubrir el 90% de tus nuevos clientes.
            </p>
          </div>
        </section>

        <hr className="border-border my-10" />

        {/* CTA */}
        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">PanelFit hace todo esto</h3>
          <p className="text-text-secondary leading-relaxed">
            Panel único por cliente, registro sin app, vista de actividad de todos tus clientes de un vistazo,
            biblioteca de plantillas. Sin instalaciones, sin complicaciones.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={onDemo}
              className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Ver demo en vivo <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onRegister}
              className="px-6 py-3 border border-border rounded-xl hover:bg-surface transition-colors text-sm"
            >
              Solicitar acceso gratis
            </button>
          </div>
        </div>

        {/* Related */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-4">También puede interesarte</h3>
          <div className="space-y-3">
            <a href="/app-entrenadores" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
              <p className="font-medium">App para entrenadores personales: guía de 2025</p>
              <p className="text-sm text-text-secondary mt-1">Qué características debe tener una app de entrenamiento y cómo elegir la correcta</p>
            </a>
            <a href="/alternativas/harbiz" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
              <p className="font-medium">Alternativas a Harbiz en 2025</p>
              <p className="text-sm text-text-secondary mt-1">Comparativa honesta entre las opciones más populares para entrenadores españoles</p>
            </a>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-8 py-8 text-center text-sm text-text-secondary">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a href="/" className="hover:text-text">Inicio</a>
          <a href="/app-entrenadores" className="hover:text-text">App entrenadores</a>
          <a href="/precios" className="hover:text-text">Precios</a>
          <a href="/alternativas/harbiz" className="hover:text-text">vs Harbiz</a>
          <a href="/alternativas/trainerize" className="hover:text-text">vs Trainerize</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
