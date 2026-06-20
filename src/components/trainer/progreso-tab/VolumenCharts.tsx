import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { Activity } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, CustomTooltip, EmptyState, GROUP_COLORS, getMuscleGroup, useLibraryMuscleMap } from './helpers'

// ── Volumen semanal ───────────────────────────────────────
export function VolumenChart({ logs }: { logs: TrainingLogs }) {
  const data = useMemo(() => {
    const semanas: Record<string, number> = {}
    Object.values(logs).forEach(log => {
      if (!log.dateDone || !log.done) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const lunes = new Date(d); lunes.setDate(diff)
      const key = lunes.toISOString().split('T')[0]
      const vol = Object.values(log.sets || {}).reduce((acc, s: any) => acc + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      semanas[key] = (semanas[key] || 0) + vol
    })
    return Object.entries(semanas).sort(([a], [b]) => a.localeCompare(b)).slice(-10).map(([date, vol]) => ({
      semana: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), kg: Math.round(vol)
    }))
  }, [logs])

  if (data.length < 2) return <EmptyState icon={<Activity className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita actividad en al menos 2 semanas" />
  const maxVol = Math.max(...data.map(d => d.kg))
  const avg = Math.round(data.reduce((a, d) => a + d.kg, 0) / data.length)
  const trend = data[data.length - 1].kg - data[0].kg
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Pico semanal', value: `${maxVol.toLocaleString()} kg`, color: 'text-accent' },
          { label: 'Media/semana', value: `${avg.toLocaleString()} kg`, color: 'text-ink' },
          { label: 'Tendencia', value: `${trend >= 0 ? '+' : ''}${trend.toLocaleString()} kg`, color: trend >= 0 ? 'text-ok' : 'text-warn' },
        ].map((k, i) => <div key={i} className="bg-bg rounded-xl p-3 text-center"><p className={`text-base font-bold ${k.color}`}>{k.value}</p><p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p></div>)}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avg} stroke="#8a8278" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'media', position: 'right', fontSize: 9, fill: '#8a8278' }} />
            <Bar dataKey="kg" name="Volumen" fill="#6e5438" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Volumen semanal por grupo muscular ─────────────────────
export function VolumenGrupoChart({ logs, plan, library }: { logs: TrainingLogs; plan?: TrainingPlan | null; library?: { name: string; category?: string }[] }) {
  const libraryMap = useLibraryMuscleMap(library)

  const { data, groups } = useMemo(() => {
    const byWeek: Record<string, Record<string, number>> = {}
    const groupSet = new Set<string>()
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done || !log.dateDone) return
      const name = getExName(key, plan)
      if (!name) return
      const g = getMuscleGroup(name, libraryMap)
      const setsDone = Object.values(log.sets || {}).filter((s: any) => (parseFloat(s.weight) || 0) > 0 || (parseInt(s.reps) || 0) > 0).length || 1
      const d = new Date(log.dateDone + 'T00:00:00')
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const lunes = new Date(d); lunes.setDate(diff)
      const weekKey = lunes.toISOString().split('T')[0]
      if (!byWeek[weekKey]) byWeek[weekKey] = {}
      byWeek[weekKey][g] = (byWeek[weekKey][g] || 0) + setsDone
      groupSet.add(g)
    })
    const groups = [...groupSet].sort()
    const data = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).slice(-8).map(([date, counts]) => ({
      semana: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      ...counts,
    }))
    return { data, groups }
  }, [logs, plan, libraryMap])

  if (data.length < 2) return <EmptyState icon={<Activity className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita actividad en al menos 2 semanas" />

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {groups.map(g => (
          <span key={g} className="flex items-center gap-1.5 text-[10px] font-semibold text-muted">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[g] || '#94a3b8' }} />{g}
          </span>
        ))}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} label={{ value: 'series', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip unit="series" />} />
            {groups.map(g => (
              <Bar key={g} dataKey={g} name={g} stackId="vol" fill={GROUP_COLORS[g] || '#94a3b8'} radius={groups.indexOf(g) === groups.length - 1 ? [4, 4, 0, 0] : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted">
        {library?.length ? 'Grupos según la biblioteca de ejercicios (con fallback por nombre).' : 'Grupos estimados por el nombre del ejercicio — configura la biblioteca para mayor precisión.'}
      </p>
    </div>
  )
}
