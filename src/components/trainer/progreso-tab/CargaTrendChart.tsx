import { useMemo, useState } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Activity } from 'lucide-react'
import { TrainingLogs } from '../../../types'
import { computeLoadTrend, computeSessionLoadTrend, FITNESS_DIAS, SessionLoadRow } from '../../../lib/loadRisk'
import { estadoForma, SEMANAS_MIN_FORMA, EstadoForma } from '../../../lib/estadoForma'
import { EmptyState } from './helpers'

function CustomTrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="text-muted mb-1">{label}</p>
      <p style={{ color: '#6e5438' }} className="font-bold">Fitness: {p.fitness}</p>
      <p style={{ color: '#e07b54' }} className="font-bold">Fatiga: {p.fatigue}</p>
      <p style={{ color: p.form >= 0 ? '#22c55e' : '#ef4444' }} className="font-bold">Forma: {p.form >= 0 ? '+' : ''}{p.form}</p>
    </div>
  )
}

const TONO_ESTADO: Record<EstadoForma['tono'], string> = {
  ok: 'bg-ok/10 border-ok/30 text-ok',
  neutro: 'bg-bg-alt border-border text-ink',
  aviso: 'bg-warn/10 border-warn/30 text-warn',
}

type Fuente = 'sesion' | 'tonelaje'

// Fitness / Fatiga / Forma con su estado en una frase. Por defecto usa la carga de sesión
// (minutos × RPE), que también cuenta cardio, pista y técnica; si no hay, el tonelaje.
export function CargaTrendChart({ logs, sessionLoadRows = [] }: { logs: TrainingLogs; sessionLoadRows?: SessionLoadRow[] }) {
  const porSesion = useMemo(() => computeSessionLoadTrend(sessionLoadRows, 12), [sessionLoadRows])
  const porTonelaje = useMemo(() => computeLoadTrend(logs, 12), [logs])
  const hayAmbas = porSesion.length >= 2 && porTonelaje.length >= 2
  const [elegida, setElegida] = useState<Fuente | null>(null)
  const fuente: Fuente = elegida ?? (porSesion.length >= 2 ? 'sesion' : 'tonelaje')
  const trend = fuente === 'sesion' ? porSesion : porTonelaje

  const data = useMemo(() => trend.map(p => ({
    ...p,
    semana: new Date(p.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  })), [trend])
  const estado = useMemo(() => estadoForma(trend), [trend])

  if (data.length < 2) return <EmptyState icon={<Activity className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita varias semanas de entrenos registrados" />

  const last = data[data.length - 1]

  return (
    <div className="space-y-3">
      {hayAmbas && (
        <div className="flex gap-1.5" role="group" aria-label="Carga con la que se calcula">
          {([['sesion', 'Carga de sesión'], ['tonelaje', 'Tonelaje']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setElegida(id)} aria-pressed={fuente === id}
              className={`px-3 min-h-[36px] rounded-lg text-xs font-semibold border transition-colors ${fuente === id ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {!estado && (
        <p className="rounded-xl border border-border bg-bg-alt/40 px-4 py-3 text-xs text-muted">
          Con {data.length} {data.length === 1 ? 'semana' : 'semanas'} de carga aún no hay un estado fiable: aparece a partir de {SEMANAS_MIN_FORMA}, cuando la media de {FITNESS_DIAS} días se asienta.
        </p>
      )}

      {estado && (
        <div className={`rounded-xl border px-4 py-3 ${TONO_ESTADO[estado.tono]}`} role="status">
          <p className="text-sm font-bold">{estado.etiqueta} <span className="font-semibold opacity-80">· forma {estado.formaPct > 0 ? '+' : ''}{estado.formaPct} %</span></p>
          <p className="text-xs text-ink/80 mt-0.5">{estado.frase}</p>
          {estado.rampaPct !== null && Math.abs(estado.rampaPct) >= 1 && (
            <p className="text-[11px] text-muted mt-1">Fitness {estado.rampaPct > 0 ? '↑' : '↓'} {Math.abs(estado.rampaPct)} % respecto a la semana anterior</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold" style={{ color: '#6e5438' }}>{last.fitness}</p>
          <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">Fitness ({FITNESS_DIAS}d)</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold" style={{ color: '#e07b54' }}>{last.fatigue}</p>
          <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">Fatiga (7d)</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold" style={{ color: last.form >= 0 ? '#22c55e' : '#ef4444' }}>{last.form >= 0 ? '+' : ''}{last.form}</p>
          <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">Forma</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
            <Tooltip content={<CustomTrendTooltip />} />
            <ReferenceLine y={0} stroke="#d8d2c8" strokeWidth={1} />
            <Area type="monotone" dataKey="fitness" name="Fitness" stroke="#6e5438" fill="#6e5438" fillOpacity={0.12} strokeWidth={2} />
            <Line type="monotone" dataKey="fatigue" name="Fatiga" stroke="#e07b54" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="form" name="Forma" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-muted">
        <span style={{ color: '#6e5438' }}>Fitness</span> = carga crónica media ({FITNESS_DIAS}d) · <span style={{ color: '#e07b54' }}>Fatiga</span> = carga aguda media (7d) · <span style={{ color: '#3b82f6' }}>Forma</span> = fitness − fatiga (positivo = fresco, negativo = fatigado), calculado con {fuente === 'sesion' ? 'la carga de sesión (minutos × RPE)' : 'el tonelaje (peso × repeticiones)'}. El estado compara la forma con el fitness: así vale igual para cualquier volumen.
      </p>
    </div>
  )
}
