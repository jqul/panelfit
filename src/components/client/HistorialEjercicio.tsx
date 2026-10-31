import { useMemo, useState } from 'react'
import { ChevronDown, Dumbbell, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { TrainingLogs, TrainingPlan } from '../../types'
import { historialPorEjercicio, cambioE1rm, HistorialDeEjercicio } from '../../lib/historialEjercicio'

const kg = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
const fecha = (d: string, year = false) => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}) })

// Línea del 1RM estimado (o del mejor peso si no hay series de ≤10 reps) de la más antigua a la más reciente
function Tendencia({ valores, label }: { valores: number[]; label: string }) {
  if (valores.length < 2) return null
  const min = Math.min(...valores), max = Math.max(...valores), rango = max - min || 1
  const pts = valores.map((v, i) => `${(i / (valores.length - 1)) * 100},${28 - ((v - min) / rango) * 24}`).join(' ')
  const [ux, uy] = pts.split(' ').pop()!.split(',')
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-12" role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ux} cy={uy} r="2.5" fill="var(--color-accent)" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Lo hecho en un ejercicio sesión a sesión: tendencia, mejor marca y las series de cada día. */
export function DetalleEjercicio({ historial, max = 12 }: { historial: HistorialDeEjercicio; max?: number }) {
  const { sesiones } = historial
  const usaE1rm = sesiones.some(s => s.e1rm > 0)
  const serie = [...sesiones].reverse().map(s => usaE1rm ? s.e1rm : (s.mejor?.weight ?? 0)).filter(v => v > 0)
  const record = sesiones.reduce<{ weight: number; reps: number; date: string } | null>((r, s) =>
    s.mejor && (!r || s.mejor.weight > r.weight) ? { ...s.mejor, date: s.date } : r, null)
  const cambio = cambioE1rm(sesiones)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-[11px] uppercase text-muted font-bold tracking-wider">Sesiones</p><p className="text-sm font-bold tabular-nums">{sesiones.length}</p></div>
        <div><p className="text-[11px] uppercase text-muted font-bold tracking-wider">Mejor</p><p className="text-sm font-bold tabular-nums">{record ? `${kg(record.weight)}×${record.reps}` : '—'}</p></div>
        <div><p className="text-[11px] uppercase text-muted font-bold tracking-wider">1RM est.</p>
          <p className="text-sm font-bold tabular-nums">
            {sesiones[0].e1rm > 0 ? kg(sesiones[0].e1rm) : '—'}
            {cambio !== null && cambio !== 0 && <span className={`ml-1 text-[11px] ${cambio > 0 ? 'text-ok' : 'text-warn'}`}>{cambio > 0 ? '+' : ''}{kg(cambio)}</span>}
          </p>
        </div>
      </div>
      <Tendencia valores={serie} label={`Evolución del ${usaE1rm ? '1RM estimado' : 'mejor peso'} de ${historial.name}`} />
      <ul className="divide-y divide-border/70">
        {sesiones.slice(0, max).map(s => {
          const iMejor = s.series.findIndex(x => s.mejor && x.weight === s.mejor.weight && x.reps === s.mejor.reps)
          return (
          <li key={s.date} className="py-2 flex items-start gap-3">
            <span className="text-xs text-muted w-16 flex-shrink-0 pt-0.5">{fecha(s.date)}</span>
            <div className="flex-1 min-w-0 flex flex-wrap gap-1">
              {s.series.map((x, i) => (
                <span key={i} className={`text-[11px] px-1.5 py-0.5 rounded tabular-nums ${i === iMejor ? 'bg-accent/15 text-accent font-bold' : 'bg-bg-alt text-muted'}`}>
                  {x.weight > 0 ? `${kg(x.weight)}×${x.reps}` : `${x.reps} reps`}
                </span>
              ))}
            </div>
            {s.volumen > 0 && <span className="text-[11px] text-muted flex-shrink-0 tabular-nums pt-0.5">{kg(s.volumen)} kg</span>}
          </li>
          )
        })}
      </ul>
      {sesiones.length > max && <p className="text-[11px] text-muted text-center">y {sesiones.length - max} sesiones más antiguas</p>}
    </div>
  )
}

/** Progreso › Entrenos › Por ejercicio: cada ejercicio que ha hecho, con su evolución al tocarlo. */
export function HistorialPorEjercicio({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const lista = useMemo(() => historialPorEjercicio(logs, plan), [logs, plan])
  const [busca, setBusca] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const filtro = busca.trim().toLowerCase()
  const visibles = filtro ? lista.filter(e => e.name.toLowerCase().includes(filtro)) : lista

  if (!lista.length) return (
    <div className="text-center py-12 text-muted">
      <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Completa entrenamientos para ver cada ejercicio</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {lista.length > 5 && (
        <label className="flex items-center gap-2 px-3 bg-card border border-border rounded-xl focus-within:border-accent">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ejercicio" aria-label="Buscar ejercicio"
            className="flex-1 py-2.5 bg-transparent text-sm outline-none" />
        </label>
      )}
      {visibles.length === 0 && <p className="text-sm text-muted text-center py-6">Ningún ejercicio con «{busca}»</p>}
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {visibles.map(e => {
          const ultima = e.sesiones[0]
          const cambio = cambioE1rm(e.sesiones)
          const open = abierto === e.name
          return (
            <div key={e.name}>
              <button type="button" onClick={() => setAbierto(open ? null : e.name)} aria-expanded={open}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-alt/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{e.name}</p>
                  <p className="text-[11px] text-muted">
                    {fecha(ultima.date, true)} · {e.sesiones.length} {e.sesiones.length === 1 ? 'sesión' : 'sesiones'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold tabular-nums">{ultima.mejor ? `${kg(ultima.mejor.weight)}×${ultima.mejor.reps}` : `${ultima.series.length} series`}</p>
                  {cambio !== null && cambio !== 0 && (
                    <p className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${cambio > 0 ? 'text-ok' : 'text-warn'}`}>
                      {cambio > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{cambio > 0 ? '+' : ''}{kg(cambio)} kg 1RM
                    </p>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && <div className="px-4 pb-3"><DetalleEjercicio historial={e} /></div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
