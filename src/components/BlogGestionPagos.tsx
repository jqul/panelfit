import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props { onDemo: () => void; onRegister: () => void; onLogin: () => void }

export function BlogGestionPagos({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Cómo gestionar los pagos como entrenador personal (2025) | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute('content',
      'Guía práctica para entrenadores personales: cómo cobrar a tus clientes, qué métodos usar y cómo llevar el control de pagos sin complicarte.')
    const ld = document.createElement('script')
    ld.type = 'application/ld+json'; ld.id = 'ld-pagos'
    ld.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article',
      headline: 'Cómo gestionar los pagos como entrenador personal (2025)',
      author: { '@type': 'Organization', name: 'PanelFit' },
      publisher: { '@type': 'Organization', name: 'PanelFit', url: 'https://panelfit.vercel.app' },
      datePublished: '2025-04-01', dateModified: '2025-07-01',
      url: 'https://panelfit.vercel.app/blog/gestionar-pagos-entrenador-personal' })
    document.head.appendChild(ld)
    return () => { document.getElementById('ld-pagos')?.remove() }
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
          <span>Gestionar pagos</span>
        </p>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight mb-4">
          Cómo gestionar los pagos como entrenador personal sin volverte loco
        </h1>
        <p className="text-text-secondary text-sm mb-8">Actualizado julio 2025 · 6 min de lectura</p>
        <p className="text-lg text-text-secondary leading-relaxed mb-8">
          Cobrar a tus clientes debería ser lo más fácil del mundo, pero para muchos entrenadores personales
          se convierte en una fuente de estrés: clientes que pagan tarde, facturas que no se emiten,
          y un registro de pagos que vive en la cabeza. Esta guía te explica cómo montar un sistema simple.
        </p>
        <hr className="border-border mb-8" />
        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">El problema de cobrar "cuando toca"</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              La mayoría de entrenadores autónomos cobra de forma reactiva: cuando el cliente lleva X sesiones,
              mandan un mensaje pidiendo el pago. El problema es que esto convierte cada cobro en una conversación
              incómoda, y si el cliente está poco satisfecho ese mes, la fricción del cobro puede ser el detonante
              para que abandone.
            </p>
            <p className="text-text-secondary leading-relaxed">
              La solución es sistematizar: mismo día del mes, mismo método, mismo importe. Cuando el cobro
              es predecible, deja de ser una negociación y se convierte en un trámite.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Métodos de cobro: qué funciona en España</h2>
            <div className="space-y-4">
              {[
                { title: 'Bizum', desc: 'El método más usado entre entrenadores autónomos en España. Rápido, sin comisiones, y todos los clientes lo tienen. El problema: no queda registro formal, no hay factura automática, y requiere que el cliente tome la iniciativa cada mes.' },
                { title: 'Transferencia bancaria', desc: 'Más formal que Bizum y deja rastro en el extracto. Bien para clientes empresas o cuando necesitas justificar ingresos. El inconveniente es el mismo: el cliente tiene que acordarse de hacerla.' },
                { title: 'Domiciliación (SEPA)', desc: 'El sistema ideal para entrenamiento online con muchos clientes: tú cobras automáticamente el día acordado. Requiere que el cliente firme un mandato SEPA y que uses una plataforma que lo soporte (Stripe, GoCardless). Más fricción al principio, cero fricción después.' },
                { title: 'Plataformas de pago (Stripe, PayPal)', desc: 'Útiles para clientes internacionales o para crear suscripciones automáticas. Cobran comisión (~1,4% + 0,25€ por transacción en Stripe). Para volúmenes bajos, la comisión no merece la pena frente a Bizum.' },
              ].map(({ title, desc }) => (
                <div key={title} className="p-4 bg-surface rounded-xl">
                  <p className="font-semibold mb-2">{title}</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Cómo llevar el control de pagos</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Con menos de 10 clientes, una hoja de cálculo funciona: nombre del cliente, importe mensual,
              fecha de pago acordada, y una columna de "pagado" con la fecha real. Revísala el día 1 de cada mes.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              Con más clientes, necesitas que el sistema te avise en vez de tener que ir a mirarlo.
              Algunas opciones: recordatorios en el calendario, un software de facturación simple (Holded, Factura Directa),
              o plataformas especializadas para entrenadores que integran el control de pagos con la gestión de clientes.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Lo importante no es qué herramienta uses, sino que haya una sola fuente de verdad:
              un único sitio donde sepas quién debe, cuánto, y desde cuándo.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Facturación como autónomo</h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              Si eres autónomo, estás obligado a emitir factura por cada servicio prestado. En la práctica,
              muchos entrenadores cobran por Bizum sin emitir factura — pero es un riesgo fiscal.
            </p>
            <p className="text-text-secondary leading-relaxed mb-4">
              La forma más simple de cumplir: usa una app de facturación gratuita (Invoice Ninja, Suma, o la del banco)
              y emite una factura mensual por cliente. Si el cliente es particular (no empresa), técnicamente
              solo necesitas factura si la pide, pero llevar el registro te protege ante una inspección.
            </p>
            <p className="text-text-secondary leading-relaxed">
              IVA: los servicios de entrenamiento personal están exentos de IVA cuando los presta un profesional
              del deporte con titulación reconocida. Consulta con tu gestor si aplica en tu caso.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-semibold mb-4">Sistema recomendado para empezar</h2>
            <div className="space-y-3">
              {[
                'Define un día fijo de cobro (ej. día 1 de cada mes)',
                'Comunica el método y el importe al cliente antes de empezar',
                'Usa Bizum para clientes particulares, transferencia para empresas',
                'Lleva una hoja simple con el estado de pagos de cada cliente',
                'Si superas los 15 clientes, evalúa domiciliación o plataforma de pagos',
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-text-secondary">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <hr className="border-border my-10" />
        <div className="bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-2xl font-serif font-bold">PanelFit gestiona tus clientes, tú los cobros</h3>
          <p className="text-text-secondary leading-relaxed">Panel único por cliente, seguimiento de entrenamientos, sin app. Pruébalo gratis.</p>
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
            <p className="text-sm text-text-secondary mt-1">Sistema para estructurar tu trabajo y escalar sin caos</p>
          </a>
          <a href="/blog/mejor-software-entrenador-personal" className="block p-4 border border-border rounded-xl hover:bg-surface transition-colors">
            <p className="font-medium">Mejor software para entrenador personal en 2025</p>
            <p className="text-sm text-text-secondary mt-1">Comparativa real entre las herramientas más usadas</p>
          </a>
        </div>
      </article>
      <footer className="border-t border-border px-4 sm:px-8 py-8 text-center text-sm text-text-secondary">
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          <a href="/" className="hover:text-text">Inicio</a>
          <a href="/blog" className="hover:text-text">Blog</a>
          <a href="/precios" className="hover:text-text">Precios</a>
          <a href="/alternativas/harbiz" className="hover:text-text">vs Harbiz</a>
        </div>
        <p>© 2025 PanelFit</p>
      </footer>
    </div>
  )
}
