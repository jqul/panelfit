import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import { TrendingUp, Dumbbell, Scale, Activity, ChevronDown, Camera, ChevronLeft, ChevronRight, X, Zap, AlertTriangle, Video, MessageCircle, Send, Clock } from 'lucide-react'
import { ClientData, TrainingPlan, TrainingLogs } from '../../types'
import { supabase } from '../../lib/supabase'

interface Props {
  client: ClientData
  plan?: TrainingPlan | null
  logs?: TrainingLogs
}

// ── Helpers ───────────────────────────────────────────────
function getExName(key: string, plan?: TrainingPlan | null) {
  const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
  if (!m || !plan) return null
  return plan.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]?.name || null
}

function useWeightHistory(clientId: string) {
  try {
    const raw = localStorage.getItem(`pf_weight_${clientId}`)
    return raw ? JSON.parse(raw) as { date: string; weight: number }[] : []
  } catch { return [] }
}

function CustomTooltip({ active, payload, label, unit = 'kg' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.value} {unit}</p>
      ))}
    </div>
  )
}

// ── Fuerza por ejercicio ──────────────────────────────────
function FuerzaChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const ejercicios = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.dateDone) return
      const name = getExName(key, plan)
      if (!name) return
      const best = Math.max(0, ...Object.values(log.sets || {}).map((s: any) => parseFloat(s.weight) || 0))
      if (!best) return
      if (!map[name]) map[name] = {}
      if (!map[name][log.dateDone] || best > map[name][log.dateDone]) map[name][log.dateDone] = best
    })
    return Object.entries(map).filter(([, d]) => Object.keys(d).length >= 2).sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length)
  }, [logs, plan])

  const [selected, setSelected] = useState(0)
  if (!ejercicios.length) return <EmptyState icon={<Dumbbell className="w-8 h-8 opacity-30" />} text="Sin datos suficientes" sub="Necesita al menos 2 sesiones por ejercicio" />

  const [name, dates] = ejercicios[selected]
  const data = Object.entries(dates).sort(([a], [b]) => a.localeCompare(b)).map(([date, best]) => ({
    fecha: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), kg: best
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
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Mejor marca', value: `${max} kg`, color: 'text-accent' },
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
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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

// ── Peso corporal ─────────────────────────────────────────
function PesoChart({ clientId }: { clientId: string }) {
  const weights = useWeightHistory(clientId)
  if (weights.length < 2) return <EmptyState icon={<Scale className="w-8 h-8 opacity-30" />} text="Sin historial de peso aún" sub="El cliente registra su peso desde su panel" />
  const data = [...weights].reverse().map(w => ({ fecha: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), kg: w.weight }))
  const min = Math.min(...data.map(d => d.kg))
  const max = Math.max(...data.map(d => d.kg))
  const cambio = data[data.length - 1].kg - data[0].kg
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Peso inicial', value: `${data[0].kg} kg`, color: 'text-muted' },
          { label: 'Peso actual', value: `${data[data.length-1].kg} kg`, color: 'text-ink' },
          { label: 'Cambio total', value: `${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)} kg`, color: cambio <= 0 ? 'text-ok' : 'text-warn' },
        ].map((k, i) => <div key={i} className="bg-bg rounded-xl p-3 text-center"><p className={`text-lg font-bold ${k.color}`}>{k.value}</p><p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p></div>)}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs><linearGradient id="gPeso" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4caf7d" stopOpacity={0.2} /><stop offset="95%" stopColor="#4caf7d" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis domain={[min * 0.98, max * 1.02]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="kg" name="Peso" stroke="#4caf7d" strokeWidth={2.5} fill="url(#gPeso)" dot={{ fill: '#4caf7d', r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Volumen semanal ───────────────────────────────────────
function VolumenChart({ logs }: { logs: TrainingLogs }) {
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

// ── Adherencia ────────────────────────────────────────────
function AdherenciaChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
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
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
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

// ── Récords ───────────────────────────────────────────────
function RecordsTable({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const records = useMemo(() => {
    const r: Record<string, { best: number; date: string; reps: string }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan)
      if (!name) return
      Object.values(log.sets || {}).forEach((s: any) => {
        const w = parseFloat(s.weight) || 0
        if (!r[name] || w > r[name].best) r[name] = { best: w, date: log.dateDone || '', reps: s.reps || '?' }
      })
    })
    return Object.entries(r).filter(([, v]) => v.best > 0).sort((a, b) => b[1].best - a[1].best)
  }, [logs, plan])

  if (!records.length) return <div className="text-center py-8 text-muted text-sm">Sin marcas personales registradas aún</div>
  return (
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
      {records.map(([name, rec], i) => (
        <div key={name} className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-sm w-6 text-center flex-shrink-0">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs text-muted">{i+1}</span>}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            {rec.date && <p className="text-[10px] text-muted">{new Date(rec.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          </div>
          <div className="text-right flex-shrink-0"><p className="text-sm font-bold text-accent">{rec.best} kg</p><p className="text-[10px] text-muted">×{rec.reps}</p></div>
        </div>
      ))}
    </div>
  )
}

// ── Comparativa semanas ───────────────────────────────────
function ComparativaChart({ logs }: { logs: TrainingLogs }) {
  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day
    const lunesEsta = new Date(now); lunesEsta.setDate(now.getDate() + diffToMon); lunesEsta.setHours(0,0,0,0)
    const lunesAnterior = new Date(lunesEsta); lunesAnterior.setDate(lunesEsta.getDate() - 7)
    const domAnterior = new Date(lunesEsta); domAnterior.setDate(lunesEsta.getDate() - 1)
    let thisVol = 0, lastVol = 0, thisSes = new Set<string>(), lastSes = new Set<string>()
    Object.values(logs).forEach((log: any) => {
      if (!log.dateDone || !log.done) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const vol = Object.values(log.sets || {}).reduce((a: number, s: any) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      if (d >= lunesEsta) { thisVol += vol; thisSes.add(log.dateDone) }
      else if (d >= lunesAnterior && d <= domAnterior) { lastVol += vol; lastSes.add(log.dateDone) }
    })
    return { thisWeek: { vol: Math.round(thisVol), ses: thisSes.size }, lastWeek: { vol: Math.round(lastVol), ses: lastSes.size } }
  }, [logs])

  const volDiff = thisWeek.vol - lastWeek.vol
  const sesDiff = thisWeek.ses - lastWeek.ses
  const data = [{ label: 'Sem. pasada', vol: lastWeek.vol }, { label: 'Esta sem.', vol: thisWeek.vol }]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Volumen esta semana', value: `${thisWeek.vol.toLocaleString()} kg`, diff: volDiff, unit: 'kg' },
          { label: 'Sesiones esta semana', value: thisWeek.ses, diff: sesDiff, unit: '' },
        ].map(({ label, value, diff, unit }) => (
          <div key={label} className="bg-bg rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-ink">{value}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{label}</p>
            {diff !== 0 && <p className={`text-[10px] font-bold mt-1 ${diff > 0 ? 'text-ok' : 'text-warn'}`}>{diff > 0 ? '↑' : '↓'} {Math.abs(diff)}{unit} vs ant.</p>}
          </div>
        ))}
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="vol" name="Volumen" fill="#6e5438" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Distribución muscular ─────────────────────────────────
const MUSCLE_GROUPS: Record<string, string[]> = {
  'Pecho':     ['press','pecho','bench','aperturas','fondos'],
  'Espalda':   ['remo','dominadas','jalón','pull','espalda','trapecio','lumbar','jalon'],
  'Piernas':   ['squat','sentadilla','prensa','leg','femoral','cuádricep','gemelo','pantorrilla','lunges','zancada','cuadricep'],
  'Hombros':   ['press hombro','elevaciones','deltoides','hombro','military'],
  'Bíceps':    ['curl','bícep','bicep'],
  'Tríceps':   ['trícep','tricep','extensión','francés','frances'],
  'Core':      ['plancha','abdominales','crunch','core','oblicuos'],
  'Glúteos':   ['hip thrust','glúteo','gluteo','patada'],
}
function getMuscleGroup(name: string) {
  const lower = name.toLowerCase()
  for (const [group, kws] of Object.entries(MUSCLE_GROUPS)) if (kws.some(k => lower.includes(k))) return group
  return 'Otros'
}

function DistribucionChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan)
      if (!name) return
      const g = getMuscleGroup(name)
      counts[g] = (counts[g] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [logs, plan])

  if (!data.length) return <div className="text-center py-8 text-muted text-sm">Sin datos de ejercicios aún</div>
  const total = data.reduce((a, d) => a + d.value, 0)
  const COLORS = ['#6e5438','#4caf7d','#e0a854','#e07b54','#3b82f6','#8b5cf6','#ec4899','#64748b','#06b6d4']
  return (
    <div className="space-y-3">
      {data.map(({ name, value }, i) => {
        const pct = Math.round((value / total) * 100)
        return (
          <div key={name} className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-semibold">{name}</p>
                <p className="text-xs text-muted">{value} series · {pct}%</p>
              </div>
              <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          </div>
        )
      })}
      <p className="text-[10px] text-muted pt-1">Basado en {total} series registradas</p>
    </div>
  )
}

// ── Estimación 1RM ────────────────────────────────────────
function RMChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const estimaciones = useMemo(() => {
    const best: Record<string, { rm: number; peso: number; reps: number; date: string }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan)
      if (!name) return
      Object.values(log.sets || {}).forEach((s: any) => {
        const w = parseFloat(s.weight) || 0; const r = parseInt(s.reps) || 0
        if (!w || !r || r > 15) return
        const rm = Math.round(w * (1 + r / 30) * 10) / 10
        if (!best[name] || rm > best[name].rm) best[name] = { rm, peso: w, reps: r, date: log.dateDone || '' }
      })
    })
    return Object.entries(best).sort((a, b) => b[1].rm - a[1].rm).slice(0, 10)
  }, [logs, plan])

  if (!estimaciones.length) return <EmptyState icon={<TrendingUp className="w-8 h-8 opacity-30" />} text="Sin datos para calcular 1RM" sub="Necesita series con peso y repeticiones" />
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-3">Fórmula Epley: 1RM = peso × (1 + reps/30)</p>
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
        {estimaciones.map(([name, { rm, peso, reps, date }], i) => (
          <div key={name} className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm w-6 text-center flex-shrink-0 font-bold text-muted">{i+1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-[10px] text-muted">{peso}kg × {reps} reps{date ? ` · ${new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : ''}</p>
            </div>
            <div className="text-right flex-shrink-0"><p className="text-sm font-bold text-accent">~{rm} kg</p><p className="text-[9px] text-muted uppercase">1RM est.</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Racha y stats globales ────────────────────────────────
function RachaStats({ logs }: { logs: TrainingLogs }) {
  const stats = useMemo(() => {
    const dates = [...new Set(Object.values(logs).filter((l: any) => l.done && l.dateDone).map((l: any) => l.dateDone as string))].sort()
    if (!dates.length) return null
    let rachaActual = 0
    const hoy = new Date().toISOString().split('T')[0]
    const checkDate = new Date()
    let checking = true
    while (checking) {
      const ds = checkDate.toISOString().split('T')[0]
      if (dates.includes(ds)) { rachaActual++; checkDate.setDate(checkDate.getDate() - 1) }
      else if (ds === hoy) { checkDate.setDate(checkDate.getDate() - 1) }
      else checking = false
    }
    let maxRacha = 0, tempRacha = 1
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]+'T00:00:00').getTime() - new Date(dates[i-1]+'T00:00:00').getTime()) / 86400000
      if (diff === 1) { tempRacha++; maxRacha = Math.max(maxRacha, tempRacha) } else tempRacha = 1
    }
    maxRacha = Math.max(maxRacha, tempRacha)
    const diasTotal = Math.round((new Date(dates[dates.length-1]+'T00:00:00').getTime() - new Date(dates[0]+'T00:00:00').getTime()) / 86400000) + 1
    const frecuencia = diasTotal > 0 ? Math.round((dates.length / diasTotal) * 7 * 10) / 10 : 0
    return { rachaActual, maxRacha, totalSesiones: dates.length, frecuencia, primera: dates[0], ultima: dates[dates.length-1] }
  }, [logs])

  if (!stats) return <div className="text-center py-8 text-muted text-sm">Sin sesiones registradas aún</div>
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Racha actual', value: `${stats.rachaActual}d`, icon: '🔥', color: stats.rachaActual >= 7 ? 'text-warn' : 'text-ok' },
          { label: 'Racha máxima', value: `${stats.maxRacha}d`, icon: '🏆', color: 'text-accent' },
          { label: 'Total sesiones', value: stats.totalSesiones, icon: '📅', color: 'text-ok' },
          { label: 'Frec. semanal', value: `${stats.frecuencia}d/sem`, icon: '📊', color: 'text-ink' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-bg rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">{icon}</p>
            <p className={`text-2xl font-serif font-bold ${color}`}>{value}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-bg rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between text-xs"><span className="text-muted">Primera sesión</span><span className="font-semibold">{new Date(stats.primera+'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
        <div className="flex justify-between text-xs"><span className="text-muted">Última sesión</span><span className="font-semibold">{new Date(stats.ultima+'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      </div>
    </div>
  )
}

// ── Fotos ─────────────────────────────────────────────────
interface PhotoSession { id: string; date: string; front?: string; side?: string; back?: string; note?: string }

function FotosTab({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<PhotoSession[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<{ session: PhotoSession; type: 'front'|'side'|'back' } | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    supabase.from('foto_sessions').select('*').eq('client_id', clientId).order('date', { ascending: false })
      .then(({ data }) => { if (data) setPhotos(data.map((r: any) => ({ id: r.id, date: r.date, front: r.front_url, side: r.side_url, back: r.back_url, note: r.note || '' }))); setLoading(false) })
  }, [clientId])
  const TYPES: ('front'|'side'|'back')[] = ['front','side','back']
  const TYPE_LABELS = { front: 'Frente', side: 'Lateral', back: 'Espalda' }
  const allImages = useMemo(() => { const imgs: { session: PhotoSession; type: 'front'|'side'|'back' }[] = []; photos.forEach(s => TYPES.forEach(t => { if (s[t]) imgs.push({ session: s, type: t }) })); return imgs }, [photos])
  const lightboxIdx = lightbox ? allImages.findIndex(i => i.session.id === lightbox.session.id && i.type === lightbox.type) : -1
  if (loading) return <div className="py-8 text-center text-muted text-sm">Cargando fotos...</div>
  if (!photos.length) return <EmptyState icon={<Camera className="w-8 h-8 opacity-30" />} text="Sin fotos aún" sub="Las fotos aparecerán cuando el cliente las suba desde su panel" />
  const sessionsWithPhotos = photos.filter(s => s.front || s.side || s.back)
  return (
    <div className="space-y-4">
      {sessionsWithPhotos.length >= 2 && (
        <button onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null) }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${compareMode ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
          🔄 {compareMode ? 'Salir de comparativa' : 'Comparar fechas'}
        </button>
      )}
      {compareMode && (
        <div className="grid grid-cols-2 gap-3">
          {(['A','B'] as const).map((slot, si) => {
            const selectedId = si === 0 ? compareA : compareB
            const session = photos.find(p => p.id === selectedId)
            return (
              <div key={slot} className="space-y-2">
                <p className="text-xs font-bold text-muted uppercase">Sesión {slot}</p>
                <select value={selectedId || ''} onChange={e => si === 0 ? setCompareA(e.target.value) : setCompareB(e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs outline-none">
                  <option value="">Seleccionar...</option>
                  {sessionsWithPhotos.map(s => <option key={s.id} value={s.id}>{new Date(s.date+'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</option>)}
                </select>
                {session && <div className="grid grid-cols-3 gap-1">{TYPES.map(t => session[t] ? <div key={t}><p className="text-[9px] text-muted text-center font-semibold">{TYPE_LABELS[t]}</p><img src={session[t]} className="w-full aspect-[3/4] object-cover rounded-lg border border-border" alt="" /></div> : null)}</div>}
              </div>
            )
          })}
        </div>
      )}
      {!compareMode && sessionsWithPhotos.map(session => (
        <div key={session.id} className="bg-bg rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Camera className="w-4 h-4 text-muted flex-shrink-0" />
            <div className="flex-1"><p className="text-sm font-semibold">{new Date(session.date+'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>{session.note && <p className="text-xs text-muted mt-0.5 italic">"{session.note}"</p>}</div>
            <span className="text-xs text-muted">{TYPES.filter(t => session[t]).length}/3</span>
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            {TYPES.map(type => session[type] ? (
              <div key={type} className="space-y-1"><p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{TYPE_LABELS[type]}</p><button onClick={() => setLightbox({ session, type })} className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-border hover:border-accent transition-colors"><img src={session[type]} className="w-full h-full object-cover" alt="" /></button></div>
            ) : (
              <div key={type} className="space-y-1"><p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{TYPE_LABELS[type]}</p><div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border flex items-center justify-center"><Camera className="w-4 h-4 text-muted/30" /></div></div>
            ))}
          </div>
        </div>
      ))}
      {lightbox && lightbox.session[lightbox.type] && (
        <div className="fixed inset-0 z-[200] bg-ink/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {lightboxIdx > 0 && <button onClick={e => { e.stopPropagation(); setLightbox(allImages[lightboxIdx-1]) }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><ChevronLeft className="w-6 h-6" /></button>}
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm font-semibold">{new Date(lightbox.session.date+'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · {TYPE_LABELS[lightbox.type]}</p>
              <button onClick={() => setLightbox(null)} className="p-1 text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <img src={lightbox.session[lightbox.type]} className="w-full rounded-2xl" alt="" />
          </div>
          {lightboxIdx < allImages.length - 1 && <button onClick={e => { e.stopPropagation(); setLightbox(allImages[lightboxIdx+1]) }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><ChevronRight className="w-6 h-6" /></button>}
        </div>
      )}
    </div>
  )
}

// ── Pesos sugeridos próximo entreno (basado en RIR) ───────
const RIR_SUGGESTION_PCT: Record<number, { pct: number; label: string; color: string }> = {
  0: { pct: -5,  label: 'Bajar peso', color: '#ef4444' },
  1: { pct: -2.5, label: 'Bajar ligero', color: '#f97316' },
  2: { pct: 0,   label: 'Mantener', color: '#f59e0b' },
  3: { pct: 0,   label: 'Mantener', color: '#eab308' },
  4: { pct: 2.5, label: 'Subir ligero', color: '#84cc16' },
  5: { pct: 5,   label: 'Subir peso', color: '#22c55e' },
}

function PesosSugeridosChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const sugeridos = useMemo(() => {
    const lastByExercise: Record<string, { weight: number; reps: string; rir?: number; date: string }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done || !log.dateDone) return
      const name = getExName(key, plan)
      if (!name) return
      const setsArr = Object.values(log.sets || {}) as any[]
      if (!setsArr.length) return
      // Tomar el set con mayor peso de esa sesión
      const best = setsArr.reduce((max, s) => (parseFloat(s.weight) || 0) > (parseFloat(max.weight) || 0) ? s : max, setsArr[0])
      const w = parseFloat(best.weight) || 0
      if (!w) return
      if (!lastByExercise[name] || log.dateDone > lastByExercise[name].date) {
        lastByExercise[name] = { weight: w, reps: best.reps || '', rir: best.rir, date: log.dateDone }
      }
    })
    return Object.entries(lastByExercise)
      .filter(([, v]) => v.rir !== undefined)
      .map(([name, v]) => {
        const suggestion = RIR_SUGGESTION_PCT[v.rir as number] || RIR_SUGGESTION_PCT[3]
        const suggestedWeight = Math.round((v.weight * (1 + suggestion.pct / 100)) * 4) / 4 // redondeo a 0.25kg
        return { name, ...v, suggestion, suggestedWeight }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [logs, plan])

  if (!sugeridos.length) return (
    <EmptyState icon={<Zap className="w-8 h-8 opacity-30" />} text="Sin datos de RIR registrados aún"
      sub="El cliente debe indicar el RIR (repeticiones en reserva) al marcar cada serie" />
  )

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-3">Sugerencia automática basada en el RIR de la última sesión de cada ejercicio</p>
      <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
        {sugeridos.map(({ name, weight, reps, rir, suggestion, suggestedWeight, date }) => (
          <div key={name} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-[10px] text-muted">Último: {weight}kg × {reps} · RIR {rir} · {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold" style={{ color: suggestion.color }}>{suggestedWeight} kg</p>
              <p className="text-[9px] font-semibold" style={{ color: suggestion.color }}>{suggestion.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Fatiga / riesgo de sobreentrenamiento ─────────────────
function FatigaChart({ logs }: { logs: TrainingLogs }) {
  const analysis = useMemo(() => {
    const now = new Date()
    const hace7 = new Date(now); hace7.setDate(now.getDate() - 7)
    const hace14 = new Date(now); hace14.setDate(now.getDate() - 14)

    let rirsThisWeek: number[] = []
    let rirsLastWeek: number[] = []
    let volThisWeek = 0
    let volLastWeek = 0
    let sesionesThisWeek = 0

    Object.values(logs).forEach((log: any) => {
      if (!log.done || !log.dateDone) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const setsArr = Object.values(log.sets || {}) as any[]
      const vol = setsArr.reduce((a, s) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      const rirs = setsArr.filter(s => s.rir !== undefined).map(s => s.rir as number)

      if (d >= hace7) {
        rirsThisWeek.push(...rirs)
        volThisWeek += vol
      } else if (d >= hace14 && d < hace7) {
        rirsLastWeek.push(...rirs)
        volLastWeek += vol
      }
    })

    const datesThisWeek = new Set(Object.values(logs).filter((l: any) => l.dateDone && new Date(l.dateDone + 'T00:00:00') >= hace7).map((l: any) => l.dateDone))
    sesionesThisWeek = datesThisWeek.size

    const avgRirThis = rirsThisWeek.length ? rirsThisWeek.reduce((a, b) => a + b, 0) / rirsThisWeek.length : null
    const avgRirLast = rirsLastWeek.length ? rirsLastWeek.reduce((a, b) => a + b, 0) / rirsLastWeek.length : null
    const volChangePct = volLastWeek > 0 ? Math.round(((volThisWeek - volLastWeek) / volLastWeek) * 100) : null

    // Heurística de riesgo: RIR bajando + volumen subiendo mucho = riesgo
    let riskLevel: 'bajo' | 'moderado' | 'alto' = 'bajo'
    let riskReasons: string[] = []

    if (avgRirThis !== null && avgRirThis <= 1.5) {
      riskLevel = 'alto'
      riskReasons.push('RIR medio muy bajo esta semana (entrenando casi al fallo constantemente)')
    }
    if (avgRirThis !== null && avgRirLast !== null && avgRirThis < avgRirLast - 1) {
      riskLevel = riskLevel === 'alto' ? 'alto' : 'moderado'
      riskReasons.push('El RIR ha bajado significativamente respecto a la semana anterior (más fatiga acumulada)')
    }
    if (volChangePct !== null && volChangePct > 30) {
      riskLevel = riskLevel === 'alto' ? 'alto' : 'moderado'
      riskReasons.push(`El volumen ha subido un ${volChangePct}% respecto a la semana anterior`)
    }
    if (sesionesThisWeek >= 6) {
      riskLevel = riskLevel === 'alto' ? 'alto' : 'moderado'
      riskReasons.push('6 o más sesiones esta semana sin días claros de descanso')
    }

    return { avgRirThis, avgRirLast, volChangePct, sesionesThisWeek, riskLevel, riskReasons, hasData: rirsThisWeek.length > 0 }
  }, [logs])

  if (!analysis.hasData) return (
    <EmptyState icon={<AlertTriangle className="w-8 h-8 opacity-30" />} text="Sin datos suficientes"
      sub="Necesita RIR registrado en la última semana para analizar fatiga" />
  )

  const RISK_META = {
    bajo: { color: '#22c55e', bg: '#f0fdf4', label: 'Riesgo bajo', emoji: '✅' },
    moderado: { color: '#f59e0b', bg: '#fffbeb', label: 'Riesgo moderado', emoji: '⚠️' },
    alto: { color: '#ef4444', bg: '#fef2f2', label: 'Riesgo alto', emoji: '🚨' },
  }
  const meta = RISK_META[analysis.riskLevel]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: meta.bg }}>
        <p className="text-3xl mb-1">{meta.emoji}</p>
        <p className="text-xl font-serif font-bold" style={{ color: meta.color }}>{meta.label}</p>
        <p className="text-xs text-muted mt-1">Basado en RIR, volumen y frecuencia de la última semana</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-ink">{analysis.avgRirThis !== null ? analysis.avgRirThis.toFixed(1) : '—'}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">RIR medio semana</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className={`text-lg font-bold ${analysis.volChangePct !== null && analysis.volChangePct > 20 ? 'text-warn' : 'text-ink'}`}>
            {analysis.volChangePct !== null ? `${analysis.volChangePct >= 0 ? '+' : ''}${analysis.volChangePct}%` : '—'}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Cambio volumen</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-ink">{analysis.sesionesThisWeek}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Sesiones semana</p>
        </div>
      </div>

      {analysis.riskReasons.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 bg-bg-alt/30">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Por qué este nivel de riesgo</p>
          </div>
          <div className="divide-y divide-border/50">
            {analysis.riskReasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-3">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                <p className="text-sm text-ink/80">{reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.riskLevel !== 'bajo' && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-ink">💡 Recomendación</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {analysis.riskLevel === 'alto'
              ? 'Considera programar una semana de descarga (reducir volumen o intensidad) para que el cliente recupere.'
              : 'Vigila la evolución la próxima semana. Si el RIR sigue bajando, programa descanso adicional.'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Vídeo-feedback: revisión del entrenador ───────────────
interface VideoFeedbackRow {
  id: string
  trainer_id: string
  client_id: string
  exercise_name: string
  video_url: string
  client_note: string | null
  trainer_comment: string | null
  trainer_comment_video_url: string | null
  status: 'pendiente' | 'comentado'
  created_at: number
  commented_at: number | null
}

function VideoFeedbackTab({ client }: { client: ClientData }) {
  const [videos, setVideos] = useState<VideoFeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeVideo, setActiveVideo] = useState<VideoFeedbackRow | null>(null)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => { loadVideos() }, [client.id])

  const loadVideos = async () => {
    setLoading(true)
    const { data } = await supabase.from('video_feedback').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
    if (data) setVideos(data as VideoFeedbackRow[])
    setLoading(false)
  }

  const sendComment = async (videoId: string) => {
    if (!comment.trim()) return
    setSending(true)
    const { error } = await supabase.from('video_feedback')
      .update({ trainer_comment: comment.trim(), status: 'comentado', commented_at: Date.now() })
      .eq('id', videoId)
    setSending(false)
    if (error) return
    setVideos(v => v.map(vid => vid.id === videoId ? { ...vid, trainer_comment: comment.trim(), status: 'comentado', commented_at: Date.now() } : vid))
    setComment('')
    setActiveVideo(null)
  }

  if (loading) return (
    <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
  )

  if (!videos.length) return (
    <EmptyState icon={<Video className="w-8 h-8 opacity-30" />} text="Sin vídeos enviados aún"
      sub="Aparecerán aquí cuando el cliente pida feedback de técnica desde su entreno" />
  )

  const pendientes = videos.filter(v => v.status === 'pendiente')
  const comentados = videos.filter(v => v.status === 'comentado')

  return (
    <div className="space-y-5">
      {pendientes.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-warn mb-2">Pendientes de comentar ({pendientes.length})</p>
          <div className="space-y-2">
            {pendientes.map(v => (
              <VideoFeedbackCard key={v.id} video={v} onOpen={() => { setActiveVideo(v); setComment('') }} />
            ))}
          </div>
        </div>
      )}

      {comentados.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Ya comentados ({comentados.length})</p>
          <div className="space-y-2">
            {comentados.map(v => (
              <VideoFeedbackCard key={v.id} video={v} onOpen={() => { setActiveVideo(v); setComment(v.trainer_comment || '') }} />
            ))}
          </div>
        </div>
      )}

      {/* Modal de revisión */}
      {activeVideo && (
        <div className="fixed inset-0 z-[60] bg-ink/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActiveVideo(null)}>
          <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-serif font-bold text-lg">{activeVideo.exercise_name}</p>
                  <p className="text-[10px] text-muted">{new Date(activeVideo.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button onClick={() => setActiveVideo(null)} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><X className="w-4 h-4" /></button>
              </div>

              <video src={activeVideo.video_url} controls className="w-full rounded-2xl bg-black max-h-80" />

              {activeVideo.client_note && (
                <div className="bg-bg rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Nota del cliente</p>
                  <p className="text-sm">{activeVideo.client_note}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu comentario sobre la técnica</p>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Ej: Baja un poco más la cadera en la sentadilla, las rodillas se van hacia dentro..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none resize-none" />
                <button onClick={() => sendComment(activeVideo.id)} disabled={!comment.trim() || sending}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
                  <Send className="w-4 h-4" /> {sending ? 'Enviando...' : 'Enviar comentario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VideoFeedbackCard({ video, onOpen }: { video: VideoFeedbackRow; onOpen: () => void }) {
  const isPending = video.status === 'pendiente'
  return (
    <button onClick={onOpen}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all ${
        isPending ? 'bg-warn/5 border-warn/20' : 'bg-card border-border'
      }`}>
      <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center flex-shrink-0">
        <Video className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{video.exercise_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock className="w-2.5 h-2.5 text-muted" />
          <p className="text-[10px] text-muted">{new Date(video.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</p>
          {video.client_note && <MessageCircle className="w-2.5 h-2.5 text-accent ml-1" />}
        </div>
      </div>
      {isPending ? (
        <span className="text-[9px] font-bold text-warn bg-warn/10 px-2 py-1 rounded-full flex-shrink-0">Pendiente</span>
      ) : (
        <span className="text-[9px] font-bold text-ok bg-ok/10 px-2 py-1 rounded-full flex-shrink-0">✓ Comentado</span>
      )}
    </button>
  )
}

// ── Empty state helper ────────────────────────────────────
function EmptyState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
      {icon}
      <p className="text-sm">{text}</p>
      {sub && <p className="text-xs">{sub}</p>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
type Section = 'fuerza' | 'peso' | 'volumen' | 'adherencia' | 'records' | 'comparativa' | 'distribucion' | 'rm' | 'racha' | 'fotos' | 'pesos_sugeridos' | 'fatiga' | 'videos'

const SECTIONS: { id: Section; icon: string; label: string; desc: string }[] = [
  { id: 'pesos_sugeridos', icon: '🎯', label: 'Pesos sugeridos', desc: 'Próximo entreno según RIR registrado' },
  { id: 'fatiga',        icon: '⚠️', label: 'Fatiga',         desc: 'Riesgo de sobreentrenamiento' },
  { id: 'videos',        icon: '🎥', label: 'Vídeos',         desc: 'Feedback de técnica pendiente' },
  { id: 'fuerza',       icon: '💪', label: 'Fuerza',        desc: 'Progreso de peso por ejercicio' },
  { id: 'records',      icon: '🏆', label: 'Récords',       desc: 'Marcas personales' },
  { id: 'rm',           icon: '⚡', label: '1RM est.',       desc: 'Estimación de fuerza máxima' },
  { id: 'volumen',      icon: '📊', label: 'Volumen',        desc: 'Carga total semanal' },
  { id: 'comparativa',  icon: '↔️', label: 'Esta semana',   desc: 'Esta semana vs anterior' },
  { id: 'distribucion', icon: '🎯', label: 'Músculos',      desc: 'Distribución por grupos musculares' },
  { id: 'adherencia',   icon: '📅', label: 'Adherencia',    desc: '% días entrenados vs planificados' },
  { id: 'racha',        icon: '🔥', label: 'Racha',         desc: 'Racha y estadísticas globales' },
  { id: 'peso',         icon: '⚖️', label: 'Peso',          desc: 'Evolución del peso corporal' },
  { id: 'fotos',        icon: '📸', label: 'Fotos',         desc: 'Fotos de progreso del cliente' },
]

export function ProgresoTab({ client, plan, logs = {} }: Props) {
  const [section, setSection] = useState<Section>('fuerza')
  const current = SECTIONS.find(s => s.id === section)!
  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div>
        <h3 className="font-serif font-bold text-lg">Progreso de {client.name}</h3>
        <p className="text-xs text-muted mt-0.5">Análisis de rendimiento y evolución</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${section === s.id ? 'bg-ink text-white border-ink' : 'bg-white border-border text-muted hover:border-accent'}`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="mb-4">
          <p className="text-sm font-bold">{current.icon} {current.label}</p>
          <p className="text-xs text-muted mt-0.5">{current.desc}</p>
        </div>
        {section === 'pesos_sugeridos' && <PesosSugeridosChart logs={logs} plan={plan} />}
        {section === 'fatiga'       && <FatigaChart       logs={logs} />}
        {section === 'videos'       && <VideoFeedbackTab   client={client} />}
        {section === 'fuerza'       && <FuerzaChart       logs={logs} plan={plan} />}
        {section === 'peso'         && <PesoChart         clientId={client.id} />}
        {section === 'volumen'      && <VolumenChart       logs={logs} />}
        {section === 'adherencia'   && <AdherenciaChart    logs={logs} plan={plan} />}
        {section === 'records'      && <RecordsTable       logs={logs} plan={plan} />}
        {section === 'comparativa'  && <ComparativaChart   logs={logs} />}
        {section === 'distribucion' && <DistribucionChart  logs={logs} plan={plan} />}
        {section === 'rm'           && <RMChart            logs={logs} plan={plan} />}
        {section === 'racha'        && <RachaStats         logs={logs} />}
        {section === 'fotos'        && <FotosTab           clientId={client.id} />}
      </div>
      <p className="text-[10px] text-muted text-center">Datos calculados a partir de los entrenos registrados · Se actualiza en tiempo real</p>
    </div>
  )
}
