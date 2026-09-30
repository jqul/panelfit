import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { CustomTooltip } from './helpers'

export function AdherenciaChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const diasProgramados = plan?.weeks?.reduce((acc, w) => acc + w.days.filter(d => d.exercises.length > 0).length, 0) || 0
  const semanas = plan?.weeks?.length || 1
  const diasPorSemana = diasProgramados / semanas
  const data = useMemo(() => {
    const byWeek: Record<string, Set<string>> = {}
    Object.values(logs).forEach(log => {
      if (!log.dateDone || !log.done) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const lunes = new Date(d); lunes.setDate(diff)
      const key = lunes.toISOString().split('T')[0]
      if (!byWeek[key]) byWeek[key] = new Set()
      byWeek[key].add(log.dateDone)
    })
    return Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([date, dias]) => ({
      semana: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      pct: diasPorSemana > 0 ? Math.min(100, Math.round(dias.size / diasPorSemana * 100)) : 0,
      dias: dias.size
    }))
  }, [logs, diasPorSemana])
  const avgPct = data.length ? Math.round(data.reduce((a, d) => a + d.pct, 0) / data.length) : 0
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg rounded-xl p-3 text-center"><p className={`text-2xl font-bold ${avgPct >= 80 ? 'text-ok' : avgPct >= 50 ? 'text-accent' : 'text-warn'}`}>{avgPct}%</p><p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Adherencia media</p></div>
        <div className="bg-bg rounded-xl p-3 text-center"><p className="text-2xl font-bold text-ink">{diasPorSemana > 0 ? diasPorSemana.toFixed(0) : '—'}</p><p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Días/sem planificados</p></div>
      </div>
      {data.length >= 2 ? (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
              <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} unit="%" />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <ReferenceLine y={80} stroke="#4caf7d" strokeDasharray="4 2" strokeWidth={1} label={{ value: '80%', position: 'right', fontSize: 9, fill: '#4caf7d' }} />
              <Bar dataKey="pct" name="Adherencia" radius={[4,4,0,0]} fill="#6e5438" label={{ position: 'top', fontSize: 9, fill: '#8a8278', formatter: (v: number) => v > 0 ? `${v}%` : '' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="py-6 text-center text-muted text-sm">Necesita datos de al menos 2 semanas</div>}
    </div>
  )
}
