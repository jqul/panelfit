import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

export function BlogConseguirClientes({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Cómo conseguir clientes como entrenador personal online (2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Estrategias reales para conseguir tus primeros clientes de entrenamiento personal online en España. Sin gastar en publicidad.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-conseguir'
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article',
      headline: 'Cómo conseguir clientes como entrenador personal online (2025)',
      author: { '@type': 'Organization', name: 'PanelFit' },
      publisher: { '@type': 'Organization', name: 'PanelFit', url: 'https://panelfit.vercel.app' },
      datePublished: '2025-05-01', dateModified: '2025-07-01',
      url: 'https://panelfit.vercel.app/blog/conseguir-clientes-entrenador-personal-online' })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-conseguir')?.remove() }
  }, [])

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
          <span>Conseguir clientes online</span>
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight mb-4">
          Cómo conseguir clientes como entrenador personal online en 2025
        </h1>
        <p className="text-text-secondary text-sm mb-8">Actualizado julio 2025 · 8 min de lectura</p>
        <p className="text-lg text-text-secondary leading-relaxed mb-8">
          El entrenamiento personal online ha explotado en los últimos años, pero la competencia también.
          Esta guía se centra en estrategias que funcionan para entrenadores que empiezan — sin presupuesto
          de publicidad y sin ser influencer.
        </p>
        <hr className="border-border mb-8" />
        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">La trampa del "primero necesito X seguidores"</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Muchos entrenadores posponen el lanzamiento online hasta tener más seguidores, un mejor perfil de Instagram,
              o una web más profesional. Es una trampa. Los primeros 10 clientes online no van a venir de tu cuenta
              de Instagram — van a venir de tu red existente y de la confianza que ya tienes.
            </p>
            <p className="text-text-secondary leading-relaxed">
              La audiencia en redes es útil para escalar, no para empezar. Empieza a vender antes de tener
              la audiencia perfecta.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Canales que funcionan para los primeros clientes</h2>
            <div className="space-y-4">
              {[
                { title: 'Tu red actual', desc: 'El canal más subestimado. Avisa a conocidos, excompañeros, y familiares de que ofreces entrenamiento online. No como spam — como una conversación real. "Estoy empezando a entrenar a gente online, si conoces a alguien que lo esté buscando..." Un mensaje así a 30 contactos puede darte 2-3 clientes sin invertir nada.' },
                { title: 'Clientes presenciales que se mueven o viajan', desc: 'Si ya tienes clientes en persona, algunos van a dejar de poder verte presencialmente. Ofréceles continuar online antes de que lo des por perdido. Son clientes que ya te conocen y ya confían en ti.' },
                { title: 'Grupos de Facebook y foros', desc: 'Hay grupos de entrenamiento, pérdida de peso, y fitness en español con decenas de miles de miembros. Participa con contenido útil (responde preguntas, comparte consejos) durante unas semanas antes de mencionar tus servicios. La venta directa en estos grupos está penalizada — el valor primero.' },
                { title: 'Instagram con contenido específico', desc: 'No necesitas 10.000 seguidores. Necesitas que las personas adecuadas te encuentren. Publica contenido específico para tu nicho (mujeres mayores de 40, personas con dolor lumbar, runners) y sé consistente. 3-4 publicaciones por semana durante 3 meses suelen ser suficientes para empezar a recibir consultas.' },
                { title: 'Google (SEO local)', desc: 'Si también haces presencial, crea un perfil en Google Business. Aparece en búsquedas como "entrenador personal [tu ciudad]" sin coste. Las reseñas de clientes actuales son el mejor activo.' },
              ].map(({ title, desc }) => (
                <div key={title} className="p-4 bg-surface rounded-xl">
                  <p className="font-semibold mb-2">{title}</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Cómo estructurar tu oferta online</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              El error más común al empezar online es vender "entrenamiento personalizado" sin concretar qué incluye.
              Los clientes necesitan saber exactamente qué van a recibir.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">Define claramente:</p>
            <ul className="space-y-2">
              {[
                'Qué incluye: plan de entrenamiento, seguimiento semanal, ajustes, comunicación',
                'Con qué frecuencia: revisión quincenal, mensual, semanal',
                'Por qué canal: WhatsApp, email, videollamada',
                'Precio mensual fijo (no por sesión — la previsibilidad te beneficia a ti y al cliente)',
                'Cómo accede el cliente al plan y cómo te manda los registros',
              ].map(item => (
                <li key={item} className="flex gap-3 text-text-secondary">
                  <ArrowRight className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">La prueba gratuita: cuándo sí y cuándo no</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Ofrecer una semana o dos de prueba gratuita puede ayudar a que clientes indecisos den el paso.
              Pero tiene un riesgo: clientes que solo quieren lo gratuito y desaparecen.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Una alternativa mejor: una videollamada inicial gratuita de 20-30 minutos donde evalúas al cliente,
              le explicas cómo trabajarías con él, y le presentas tu propuesta. Eso filtra mejor y genera
              más compromiso que una semana de plan gratis.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Retención: el cliente que no se va es mejor que uno nuevo</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Conseguir un cliente nuevo cuesta 5-7 veces más esfuerzo que retener uno existente.
              Si tus clientes se van a los 3 meses, tienes un problema de retención, no de captación.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Las claves de la retención en entrenamiento online: resultados visibles, comunicación proactiva,
              y sensación de que el entrenador está pendiente. El seguimiento sistemático (ver quién entrenó,
              contactar cuando alguien lleva días inactivo) es lo que marca la diferencia entre un cliente
              que dura 3 meses y uno que lleva 2 años.
            </p>
          </div>
        </section>
        <hr className="border-border my-10" />
        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">Cuando consigas el cliente, PanelFit lo gestiona</h3>
          <p className="text-text-secondary leading-relaxed">Panel de seguimiento, plan accesible por enlace, registro sin app. Para que tu cliente sienta que estás encima.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button onClick={onDemo} className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 flex items-center justify-center gap-2">
              Ver demo <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onRegister} className="px-6 py-3 border border-border rounded-xl hover:bg-bg transition-colors text-sm">Solicitar acceso gratis</button>
          </div>
        </div>
        <div className="mt-12 space-y-3">
          <h3 className="text-lg font-semibold mb-4">Artículos relacionados</h3>
          <a href="/blog/como-organizar-clientes-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Cómo organizar tus clientes como entrenador personal</p>
            <p className="text-sm text-text-secondary mt-1">Sistema práctico para escalar sin caos</p>
          </a>
          <a href="/blog/gestionar-pagos-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Cómo gestionar los pagos como entrenador personal</p>
            <p className="text-sm text-text-secondary mt-1">Métodos, control de cobros y facturación</p>
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
