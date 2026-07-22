import { useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  onDemo: () => void
  onRegister: () => void
  onLogin: () => void
}

const ARTICLES = [
  {
    href: '/blog/mejor-software-entrenador-personal',
    title: 'Mejor software para entrenador personal en 2025',
    desc: 'Comparativa real entre PanelFit, Harbiz, Trainerize y TrueCoach. Precios, pros y contras para entrenadores en España.',
    mins: 8,
    date: 'Feb 2025',
  },
  {
    href: '/blog/como-organizar-clientes-entrenador-personal',
    title: 'Cómo organizar tus clientes como entrenador personal',
    desc: 'Sistema práctico para llevar el seguimiento de clientes, planes y registros sin morir en el intento.',
    mins: 7,
    date: 'Ene 2025',
  },
  {
    href: '/blog/como-hacer-seguimiento-clientes-gym',
    title: 'Cómo hacer seguimiento de clientes en el gym',
    desc: 'Qué métricas importan, cómo estructurar el seguimiento semanal y qué herramientas usar en 2025.',
    mins: 6,
    date: 'Mar 2025',
  },
]

export function BlogIndex({ onDemo, onRegister, onLogin }: Props) {
  useEffect(() => {
    document.title = 'Blog para entrenadores personales | PanelFit'
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'Guías prácticas para entrenadores personales: gestión de clientes, software, seguimiento y organización.'
    )
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-sm text-text-secondary mb-6">
          <a href="/" className="hover:text-text">PanelFit</a>
          <span className="mx-2">/</span>
          <span>Blog</span>
        </p>

        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3">Blog para entrenadores personales</h1>
        <p className="text-text-secondary mb-10">Guías prácticas sobre gestión de clientes, software y organización.</p>

        <div className="space-y-4">
          {ARTICLES.map(a => (
            <a key={a.href} href={a.href} className="block p-6 border border-border rounded-2xl hover:bg-surface transition-colors group">
              <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                <span>{a.date}</span>
                <span>·</span>
                <span>{a.mins} min</span>
              </div>
              <h2 className="text-lg font-semibold mb-2 group-hover:text-accent transition-colors">{a.title}</h2>
              <p className="text-text-secondary text-sm leading-relaxed">{a.desc}</p>
              <div className="flex items-center gap-1 text-accent text-sm mt-3 font-medium">
                Leer artículo <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 bg-surface rounded-2xl p-8 text-center space-y-4">
          <h3 className="text-xl font-serif font-bold">¿Quieres ver PanelFit en acción?</h3>
          <p className="text-text-secondary text-sm">Demo en vivo con clientes ficticios. Sin registro, sin tarjeta.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onDemo} className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              Ver demo <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onRegister} className="px-6 py-3 border border-border rounded-xl hover:bg-bg transition-colors text-sm">
              Solicitar acceso gratis
            </button>
          </div>
        </div>
      </div>

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
