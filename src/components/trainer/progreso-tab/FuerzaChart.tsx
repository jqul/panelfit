import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { ChevronDown, Dumbbell } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { estimate1RM } from '../../../lib/strength'
import { getExName, CustomTooltip, EmptyState } from './helpers'

export function FuerzaChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const [metric, setMetric] = useState<'peso' | '1rm'>('1rm')

  const ejercicios = useMemo(() => {
    const map: Record<string, Record<string, { peso: number; rm1: number }>> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.dateDone) return
      const name = getExName(key, plan)
      if (!name) return
      let bestPeso = 0, bestRM = 0
      Object.values(log.sets || {}).forEach((s: any) => {
        const w = parseFloat(s.weight) || 0
        const reps = parseFloat(s.reps) || 0
        if (w > bestPeso) bestPeso = w
        const rm = estimate1RM(w, reps)
        if (rm > bestRM) bestRM = rm
      })
      if (!bestPeso) return
      if (!map[name]) map[name] = {}
      if (!map[name][log.dateDone] || bestPeso > map[name][log.dateDone].peso) {
        map[name][log.dateDone] = { peso: bestPeso, rm1: bestRM || bestPeso }
      }
    })
    return Object.entries(map).filter(([, d]) => Object.keys(d).length >= 2).sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length)
  }, [logs, plan])

  const [selected, setSelected] = useState(0)
  if (!ejercicios.length) return <EmptyState icon={<Dumbbell className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita al menos 2 sesiones por ejercicio" />

  const [, dates] = ejercicios[selected]
  const data = Object.entries(dates).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
    fecha: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    kg: Math.round((metric === '1rm' ? v.rm1 : v.peso) * 10) / 10,
  }))
  const min = Math.min(...data.map(d => d.kg))
  const max = Math.max(...data.map(d => d.kg))
  const trend = data.length >= 2 ? data[data.length - 1].kg - data[0].kg : 0

  return (
    <div className="space-y-3">
      <div className="relative">
        <select value={selected} onChange={e => setSelected(+e.target.value)}
          className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm font-medium outline-none appearance-none pr-8">
          {ejercicios.map(([n], i) => <option key={i} value={i}>{n}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      </div>
      <div className="flex gap-1.5 text-xs font-semibold">
        <button onClick={() => setMetric('1rm')}
          className={`flex-1 py-1.5 rounded-lg ${metric === '1rm' ? 'bg-ink text-white' : 'bg-bg text-muted'}`}>1RM estimado</button>
        <button onClick={() => setMetric('peso')}
          className={`flex-1 py-1.5 rounded-lg ${metric === 'peso' ? 'bg-ink text-white' : 'bg-bg text-muted'}`}>Peso máximo</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: metric === '1rm' ? '1RM estimado' : 'Mejor marca', value: `${max} kg`, color: 'text-accent' },
          { label: 'Progreso total', value: `${trend >= 0 ? '+' : ''}${trend.toFixed(1)} kg`, color: trend >= 0 ? 'text-ok' : 'text-warn' },
          { label: 'Sesiones', value: data.length, color: 'text-ink' },
        ].map((k, i) => (
          <div key={i} className="bg-bg rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs><linearGradient id="gFuerza" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6e5438" stopOpacity={0.2} /><stop offset="95%" stopColor="#6e5438" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis domain={[min * 0.95, max * 1.05]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="kg" name="Peso" stroke="#6e5438" strokeWidth={2.5} fill="url(#gFuerza)" dot={{ fill: '#6e5438', r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
