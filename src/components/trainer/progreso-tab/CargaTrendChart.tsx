import { useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Activity } from 'lucide-react'
import { TrainingLogs } from '../../../types'
import { computeLoadTrend } from '../../../lib/loadRisk'
import { EmptyState } from './helpers'

function CustomTrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="text-muted mb-1">{label}</p>
      <p style={{ color: '#6e5438' }} className="font-bold">Fitness: {p.fitness}</p>
      <p style={{ color: '#e07b54' }} className="font-bold">Fatiga: {p.fatigue}</p>
      <p style={{ color: p.form >= 0 ? '#22c55e' : '#ef4444' }} className="font-bold">Forma: {p.form >= 0 ? '+' : ''}{p.form}</p>
    </div>
  )
}

export function CargaTrendChart({ logs }: { logs: TrainingLogs }) {
  const data = useMemo(() => computeLoadTrend(logs, 12).map(p => ({
    ...p,
    semana: new Date(p.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  })), [logs])

  if (data.length < 2) return <EmptyState icon={<Activity className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita varias semanas de entrenos registrados" />

  const last = data[data.length - 1]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold" style={{ color: '#6e5438' }}>{last.fitness}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Fitness (28d)</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold" style={{ color: '#e07b54' }}>{last.fatigue}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Fatiga (7d)</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold" style={{ color: last.form >= 0 ? '#22c55e' : '#ef4444' }}>{last.form >= 0 ? '+' : ''}{last.form}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Forma</p>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTrendTooltip />} />
            <ReferenceLine y={0} stroke="#d8d2c8" strokeWidth={1} />
            <Area type="monotone" dataKey="fitness" name="Fitness" stroke="#6e5438" fill="#6e5438" fillOpacity={0.12} strokeWidth={2} />
            <Line type="monotone" dataKey="fatigue" name="Fatiga" stroke="#e07b54" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="form" name="Forma" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted">
        <span style={{ color: '#6e5438' }}>Fitness</span> = carga crónica media (28d) · <span style={{ color: '#e07b54' }}>Fatiga</span> = carga aguda media (7d) · <span style={{ color: '#3b82f6' }}>Forma</span> = fitness − fatiga (positivo = fresco, negativo = fatigado). Mismo concepto que el Performance Management Chart, aplicado al tonelaje de fuerza.
      </p>
    </div>
  )
}
