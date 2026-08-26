import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Moon } from 'lucide-react'
import { TrainingLogs } from '../../../types'
import { useCicloTracking, getCyclePhase, PHASE_INFO, CyclePhase } from '../../../lib/cyclePhase'
import { EmptyState, CustomTooltip } from './helpers'

const PHASE_ORDER: CyclePhase[] = ['menstrual', 'folicular', 'ovulacion', 'lutea']

// Cruza el volumen y el RIR medio de cada sesión con la fase estimada del
// ciclo en la que cayó, para ver si el rendimiento real varía por fase.
export function CicloRendimientoChart({ clientId, logs }: { clientId: string; logs: TrainingLogs }) {
  const { ciclo, loading } = useCicloTracking(clientId)

  const { data, totalSessions } = useMemo(() => {
    if (!ciclo?.activo || !ciclo.ultima_regla) return { data: [], totalSessions: 0 }

    // Una sesión = todos los ejercicios registrados con la misma fecha
    const bySession: Record<string, { vol: number; rirs: number[] }> = {}
    Object.values(logs).forEach(log => {
      if (!log.done || !log.dateDone) return
      const vol = Object.values(log.sets || {}).reduce((acc, s: any) => acc + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      const rirs = Object.values(log.sets || {}).map((s: any) => s.rir).filter((r: any) => r !== undefined) as number[]
      if (!bySession[log.dateDone]) bySession[log.dateDone] = { vol: 0, rirs: [] }
      bySession[log.dateDone].vol += vol
      bySession[log.dateDone].rirs.push(...rirs)
    })

    const byPhase: Record<CyclePhase, { vol: number; sessions: number; rirs: number[] }> = {
      menstrual: { vol: 0, sessions: 0, rirs: [] }, folicular: { vol: 0, sessions: 0, rirs: [] },
      ovulacion: { vol: 0, sessions: 0, rirs: [] }, lutea: { vol: 0, sessions: 0, rirs: [] },
    }
    Object.entries(bySession).forEach(([date, s]) => {
      if (s.vol <= 0) return
      const { phase } = getCyclePhase(ciclo.ultima_regla!, ciclo.duracion_ciclo, new Date(date + 'T00:00:00'))
      byPhase[phase].vol += s.vol
      byPhase[phase].sessions += 1
      byPhase[phase].rirs.push(...s.rirs)
    })

    const totalSessions = Object.values(byPhase).reduce((a, p) => a + p.sessions, 0)
    const data = PHASE_ORDER.map(phase => {
      const p = byPhase[phase]
      const avgVol = p.sessions ? Math.round(p.vol / p.sessions) : 0
      const avgRir = p.rirs.length ? Math.round((p.rirs.reduce((a, b) => a + b, 0) / p.rirs.length) * 10) / 10 : null
      return { fase: PHASE_INFO[phase].label, kg: avgVol, sesiones: p.sessions, rir: avgRir, color: PHASE_INFO[phase].color }
    })
    return { data, totalSessions }
  }, [ciclo, logs])

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!ciclo?.activo || !ciclo.ultima_regla) {
    return <EmptyState icon={<Moon className="w-8 h-8 opacity-30" />} text="Seguimiento no activado" sub="La clienta puede activarlo desde su panel, en Más → Seguimiento de ciclo" />
  }

  if (totalSessions < 4) {
    return <EmptyState icon={<Moon className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita más sesiones registradas repartidas entre fases del ciclo" />
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Volumen medio por sesión, según fase</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="fase" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="kg" name="Volumen medio" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {data.map(d => (
          <div key={d.fase} className="text-center">
            <p className="text-[9px] text-muted uppercase tracking-wider">{d.fase}</p>
            <p className="text-xs font-bold">{d.sesiones} ses.</p>
            <p className="text-[9px] text-muted">{d.rir !== null ? `RIR ${d.rir}` : '—'}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted leading-relaxed">
        Estimación orientativa: la fase de cada sesión pasada se calcula proyectando hacia atrás desde la última regla registrada, asumiendo ciclos de duración regular — no sustituye un registro real de reglas anteriores.
      </p>
    </div>
  )
}
