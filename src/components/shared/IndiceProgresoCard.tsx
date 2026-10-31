import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'
import { TrainingLogs, TrainingPlan } from '../../types'
import { indiceProgreso, fmtPct } from '../../lib/indiceProgreso'

// Tarjeta del índice de progreso (lib/indiceProgreso): el número, si sube o baja, y de dónde sale cada parte. La usan
// el cliente (Progreso › Resumen) y el entrenador (Progreso), con el texto en segunda o tercera persona.
export function IndiceProgresoCard({ logs, plan, quien = 'cliente' }: { logs: TrainingLogs; plan?: TrainingPlan | null; quien?: 'cliente' | 'entrenador' }) {
  const r = useMemo(() => indiceProgreso(logs, plan), [logs, plan])
  const [abierto, setAbierto] = useState(false)
  const tu = quien === 'cliente'

  if (!r) return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">📈 Índice de progreso</p>
      <p className="text-sm text-muted">
        {tu ? 'Con sesiones en dos periodos de 4 semanas seguidos verás aquí si progresas y por qué.'
          : 'Hace falta que haya entrenado en las últimas 4 semanas y en las 4 anteriores para compararlas.'}
      </p>
    </div>
  )

  const color = r.estado === 'sube' ? 'text-ok' : r.estado === 'baja' ? 'text-warn' : 'text-muted'
  const Icono = r.estado === 'sube' ? TrendingUp : r.estado === 'baja' ? TrendingDown : Minus
  const frase = r.estado === 'sube' ? (tu ? 'Estás progresando' : 'Progresa')
    : r.estado === 'baja' ? (tu ? 'Este mes has bajado un poco' : 'Ha bajado este mes') : (tu ? 'Te mantienes estable' : 'Se mantiene estable')

  return (
    <div className="bg-card border border-border rounded-2xl p-5" aria-label="Índice de progreso">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">📈 Índice de progreso</p>
      <div className="flex items-center gap-3">
        <p className={`font-serif font-bold text-3xl tabular-nums whitespace-nowrap ${color}`}>{fmtPct(r.indice)}</p>
        <div className="min-w-0">
          <p className={`text-sm font-semibold flex items-center gap-1 ${color}`}><Icono className="w-4 h-4 flex-shrink-0" /> {frase}</p>
          <p className="text-xs text-muted">Últimas 4 semanas frente a las 4 anteriores</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {r.partes.map(p => (
          <li key={p.id}>
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-semibold">{p.label}</span>
              <span className="text-[11px] text-muted">{Math.round(p.peso * 100)} %</span>
              <span className={`ml-auto font-bold tabular-nums ${p.pct === null ? 'text-muted' : p.pct > 0 ? 'text-ok' : p.pct < 0 ? 'text-warn' : 'text-muted'}`}>
                {p.pct === null ? '—' : fmtPct(p.pct)}
              </span>
            </div>
            <p className="text-xs text-muted leading-snug">{p.detalle}</p>
          </li>
        ))}
      </ul>
      {r.rirMedio !== null && (
        <p className="mt-3 text-xs text-muted">
          Esfuerzo: RIR medio {r.rirMedio.toLocaleString('es-ES')} en las últimas 4 semanas
          {r.rirMedio < 1 ? ' (muy cerca del fallo).' : r.rirMedio <= 3 ? ' (en la zona que más suma).' : ' (con margen: hay sitio para apretar).'}
        </p>
      )}

      <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-accent">
        ¿Cómo se calcula? <ChevronDown className={`w-3.5 h-3.5 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Es una media ponderada de tres cambios: la fuerza (60 %, la mediana de lo que ha cambiado el 1RM estimado de cada
          ejercicio que se repite), el volumen (25 %, kilos × repeticiones) y la constancia (15 %, sesiones hechas). Cada parte
          cuenta como mucho ±25 % (fuerza) o ±50 % (volumen y constancia), para que una semana rara no lo dispare. Si una
          parte no se puede calcular, las otras se reparten su peso. Por encima de +1,5 % es progresar; por debajo de −1,5 %, bajar.
        </p>
      )}
    </div>
  )
}
