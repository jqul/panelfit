import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { resumen7d, fraseTendencia, type Resumen7d } from '../../../lib/tendencia7d'

// "Esfuerzo y sensaciones · 7 días": el RPE medio de las sesiones y cada escala del check-in, esta semana frente a la
// anterior. Responde a "¿cómo lo está llevando?" sin abrir gráficas.

export interface FilaBienestar { date: string; sleep: number; soreness: number; stress: number; motivation: number }

const ESCALAS: { key: keyof Omit<FilaBienestar, 'date'>; label: string }[] = [
  { key: 'motivation', label: 'Energía' },
  { key: 'sleep', label: 'Sueño' },
  { key: 'soreness', label: 'Sin agujetas' },
  { key: 'stress', label: 'Poco estrés' },
]

function Fila({ label, r, max, masEsMejor }: { label: string; r: Resumen7d; max: number; masEsMejor: boolean }) {
  const f = fraseTendencia(r.tendencia, masEsMejor)
  const Icono = r.tendencia === 'sube' ? TrendingUp : r.tendencia === 'baja' ? TrendingDown : Minus
  const color = f.tono === 'ok' ? 'text-ok' : f.tono === 'warn' ? 'text-warn' : 'text-muted'
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm flex-1">{label}</span>
      <span className="text-sm font-bold tabular-nums">{r.media !== null ? `${r.media.toLocaleString('es-ES')}/${max}` : '—'}</span>
      <span className={`w-28 flex items-center justify-end gap-1 text-xs ${color}`} title={f.texto}>
        {r.tendencia && <Icono className="w-3.5 h-3.5" aria-hidden />}
        {r.mediaAntes !== null ? `antes ${r.mediaAntes.toLocaleString('es-ES')}` : 'sin datos antes'}
        <span className="sr-only">. {f.texto}</span>
      </span>
    </div>
  )
}

export function SensacionesCard({ cargas, bienestar }: { cargas: { date: string; rpe: number | null }[]; bienestar: FilaBienestar[] }) {
  const rpe = resumen7d(cargas.map(c => ({ date: c.date, valor: c.rpe })))
  const escalas = ESCALAS.map(e => ({ ...e, r: resumen7d(bienestar.map(b => ({ date: b.date, valor: b[e.key] }))) }))
  if (rpe.media === null && rpe.mediaAntes === null && escalas.every(e => e.r.media === null && e.r.mediaAntes === null)) return null
  return (
    <section aria-label="Esfuerzo y sensaciones de los últimos 7 días" className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-bg-alt/30">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Esfuerzo y sensaciones · 7 días</p>
      </div>
      <div className="px-4 divide-y divide-border/60">
        <Fila label={`Esfuerzo (RPE medio${rpe.n ? `, ${rpe.n} ses.` : ''})`} r={rpe} max={10} masEsMejor={false} />
        {escalas.map(e => <Fila key={e.key} label={e.label} r={e.r} max={5} masEsMejor />)}
      </div>
    </section>
  )
}
