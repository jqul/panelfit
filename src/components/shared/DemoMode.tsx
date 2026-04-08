import { useState } from 'react'
import { Play, X, Users, Dumbbell, BarChart2, MessageCircle, Star } from 'lucide-react'

interface Props {
  onEnterDemo: () => void
}

export function DemoMode({ onEnterDemo }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted hover:border-accent hover:text-accent transition-all">
      <Play className="w-4 h-4" /> Ver demo
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-3xl overflow-hidden">
        <div className="bg-ink text-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span> Demo</h2>
              <p className="text-white/70 text-sm mt-1">Explora todas las funciones sin registrarte</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-white/50 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted">Accede como entrenador demo con clientes y datos de ejemplo ya configurados:</p>

          <div className="space-y-2">
            {[
              { icon: <Users className="w-4 h-4 text-accent" />, text: '3 clientes con perfiles distintos' },
              { icon: <Dumbbell className="w-4 h-4 text-ok" />, text: 'Planes de entrenamiento con vídeos' },
              { icon: <BarChart2 className="w-4 h-4 text-accent" />, text: 'Adherencia, insights y métricas reales' },
              { icon: <MessageCircle className="w-4 h-4 text-[#25D366]" />, text: 'Recordatorios y check-ins configurados' },
              { icon: <Star className="w-4 h-4 text-warn" />, text: 'White-label con tu marca activado' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                {f.icon}
                <p className="text-sm">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-warn/5 border border-warn/20 rounded-xl px-4 py-3">
            <p className="text-xs text-muted">Los cambios que hagas en el modo demo son visibles pero no afectan a datos reales de producción.</p>
          </div>

          <button onClick={() => { setOpen(false); onEnterDemo() }}
            className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-base hover:opacity-90 transition-opacity"
            style={{ minHeight: '52px' }}>
            Entrar al demo →
          </button>

          <p className="text-center text-xs text-muted">
            ¿Quieres tu propio panel? <a href="/" className="text-accent font-semibold hover:underline">Regístrate gratis</a>
          </p>
        </div>
      </div>
    </div>
  )
}
