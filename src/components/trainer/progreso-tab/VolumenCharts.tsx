import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { Activity } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../../types'
import { getExName, CustomTooltip, EmptyState, GROUP_COLORS, getMuscleGroup, useLibraryMuscleMap, VOLUME_LANDMARKS, getVolumeStatus } from './helpers'
import { localDateKey } from '../../../lib/dates'
import { volumenLog } from '../../../lib/volumen'
import { contarSeries, RIR_EFECTIVA } from '../../../lib/seriesEfectivas'

// ── Volumen semanal ───────────────────────────────────────
export function VolumenChart({ logs }: { logs: TrainingLogs }) {
  const data = useMemo(() => {
    const semanas: Record<string, number> = {}
    Object.values(logs).forEach(log => {
      if (!log.dateDone || !log.done) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const lunes = new Date(d); lunes.setDate(diff)
      const key = localDateKey(lunes)
      const vol = volumenLog(log)
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
        ].map((k, i) => <div key={i} className="bg-bg rounded-xl p-3 text-center"><p className={`text-base font-bold ${k.color}`}>{k.value}</p><p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p></div>)}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avg} stroke="#8a8278" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'media', position: 'right', fontSize: 11, fill: '#8a8278' }} />
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
  // Todas las series o solo las efectivas (RIR ≤ 3): los rangos MEV/MAV/MRV se pensaron para series duras
  const [modo, setModo] = useState<'todas' | 'efectivas'>('todas')

  const { data, groups, faciles, sinRir } = useMemo(() => {
    const byWeek: Record<string, Record<string, number>> = {}
    const groupSet = new Set<string>()
    const porSemana: Record<string, { faciles: number; sinRir: number }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done || !log.dateDone) return
      const name = getExName(key, plan)
      if (!name) return
      const g = getMuscleGroup(name, libraryMap)
      const cuenta = contarSeries(Object.values(log.sets || {}))
      const setsDone = modo === 'efectivas' ? cuenta.efectivas : (cuenta.todas || 1)
      const d = new Date(log.dateDone + 'T00:00:00')
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const lunes = new Date(d); lunes.setDate(diff)
      const weekKey = localDateKey(lunes)
      if (!byWeek[weekKey]) byWeek[weekKey] = {}
      byWeek[weekKey][g] = (byWeek[weekKey][g] || 0) + setsDone
      const p = porSemana[weekKey] ?? (porSemana[weekKey] = { faciles: 0, sinRir: 0 })
      p.faciles += cuenta.faciles; p.sinRir += cuenta.sinRir
      groupSet.add(g)
    })
    const groups = [...groupSet].sort()
    const semanas = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).slice(-8)
    const data = semanas.map(([date, counts]) => ({
      semana: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      ...counts,
    }))
    // Lo que se deja fuera (o se da por bueno) en las semanas que se ven, para explicarlo debajo del selector
    const faciles = semanas.reduce((a, [w]) => a + (porSemana[w]?.faciles || 0), 0)
    const sinRir = semanas.reduce((a, [w]) => a + (porSemana[w]?.sinRir || 0), 0)
    return { data, groups, faciles, sinRir }
  }, [logs, plan, libraryMap, modo])

  if (data.length < 2) return <EmptyState icon={<Activity className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita actividad en al menos 2 semanas" />

  const lastWeek = data[data.length - 1] as Record<string, any>
  const withLandmarks = groups.filter(g => VOLUME_LANDMARKS[g])

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="inline-flex p-0.5 bg-bg-alt rounded-xl" role="group" aria-label="Qué series contar">
          {([['todas', 'Todas las series'], ['efectivas', `Efectivas (RIR ≤ ${RIR_EFECTIVA})`]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setModo(id)} aria-pressed={modo === id}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${modo === id ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        {modo === 'efectivas' && (
          <p className="text-[11px] text-muted" data-testid="nota-efectivas">
            Solo cuentan las series hechas cerca del fallo (RIR {RIR_EFECTIVA} o menos).
            {faciles > 0 && ` ${faciles} ${faciles === 1 ? 'serie' : 'series'} con RIR ${RIR_EFECTIVA + 1} o más no ${faciles === 1 ? 'cuenta' : 'cuentan'}.`}
            {sinRir > 0 && ` ${sinRir} sin RIR apuntado se dan por efectivas.`}
          </p>
        )}
      </div>
      {withLandmarks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Esta semana vs. rango recomendado</p>
          {withLandmarks.map(g => {
            const sets = lastWeek[g] || 0
            const status = getVolumeStatus(g, sets)!
            const l = VOLUME_LANDMARKS[g]
            const pct = Math.min(100, (sets / l.mrv) * 100)
            const mevPct = (l.mev / l.mrv) * 100
            const mavPct = (l.mav / l.mrv) * 100
            return (
              <div key={g} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{g}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold">{sets} {modo === 'efectivas' ? 'efectivas' : 'series'}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: status.color }}>{status.label}</span>
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-bg-alt overflow-hidden">
                  <div className="absolute inset-y-0 left-0" style={{ width: `${mevPct}%`, backgroundColor: '#e2ddd4' }} />
                  <div className="absolute inset-y-0" style={{ left: `${mevPct}%`, width: `${mavPct - mevPct}%`, backgroundColor: '#cfe8da' }} />
                  <div className="absolute inset-y-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: status.color }} />
                </div>
              </div>
            )
          })}
          <p className="text-[11px] text-muted">Estimación orientativa (principios de volumen MEV/MAV/MRV para lifters intermedios), no sustituye el criterio del entrenador.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {groups.map(g => (
          <span key={g} className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[g] || '#94a3b8' }} />{g}
          </span>
        ))}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} label={{ value: 'series', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip unit="series" />} />
            {groups.map(g => (
              <Bar key={g} dataKey={g} name={g} stackId="vol" fill={GROUP_COLORS[g] || '#94a3b8'} radius={groups.indexOf(g) === groups.length - 1 ? [4, 4, 0, 0] : undefined} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted">
        {library?.length ? 'Grupos según la biblioteca de ejercicios (con fallback por nombre).' : 'Grupos estimados por el nombre del ejercicio — configura la biblioteca para mayor precisión.'}
      </p>
    </div>
  )
}
