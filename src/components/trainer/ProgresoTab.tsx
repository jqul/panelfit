import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import { TrendingUp, Dumbbell, Scale, Activity, ChevronDown } from 'lucide-react'
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

// ── Tooltip personalizado ─────────────────────────────────
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

// ── Gráfica fuerza por ejercicio ──────────────────────────
function FuerzaChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  // Construir mapa ejercicio → historial de mejor peso por fecha
  const ejercicios = useMemo(() => {
    const map: Record<string, Record<string, number>> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.dateDone) return
      const name = getExName(key, plan)
      if (!name) return
      const best = Math.max(0, ...Object.values(log.sets || {}).map((s: any) => parseFloat(s.weight) || 0))
      if (!best) return
      if (!map[name]) map[name] = {}
      if (!map[name][log.dateDone] || best > map[name][log.dateDone]) {
        map[name][log.dateDone] = best
      }
    })
    return Object.entries(map)
      .filter(([, dates]) => Object.keys(dates).length >= 2)
      .sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length)
  }, [logs, plan])

  const [selected, setSelected] = useState(0)

  if (!ejercicios.length) return (
    <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
      <Dumbbell className="w-8 h-8 opacity-30" />
      <p className="text-sm">Sin datos suficientes aún</p>
      <p className="text-xs">Necesita al menos 2 sesiones por ejercicio</p>
    </div>
  )

  const [name, dates] = ejercicios[selected]
  const data = Object.entries(dates)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, best]) => ({
      fecha: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      kg: best
    }))

  const min = Math.min(...data.map(d => d.kg))
  const max = Math.max(...data.map(d => d.kg))
  const trend = data.length >= 2 ? data[data.length - 1].kg - data[0].kg : 0

  return (
    <div className="space-y-3">
      {/* Selector ejercicio */}
      <div className="relative">
        <select value={selected} onChange={e => setSelected(+e.target.value)}
          className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-sm font-medium outline-none appearance-none pr-8">
          {ejercicios.map(([n], i) => <option key={i} value={i}>{n}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      </div>

      {/* KPIs del ejercicio */}
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

      {/* Gráfica */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gFuerza" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6e5438" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6e5438" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis domain={[min * 0.95, max * 1.05]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="kg" name="Peso" stroke="#6e5438" strokeWidth={2.5}
              fill="url(#gFuerza)" dot={{ fill: '#6e5438', r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Gráfica peso corporal ─────────────────────────────────
function PesoChart({ clientId, clientWeight }: { clientId: string; clientWeight?: number }) {
  const weights = useWeightHistory(clientId)

  if (weights.length < 2) return (
    <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
      <Scale className="w-8 h-8 opacity-30" />
      <p className="text-sm">Sin historial de peso aún</p>
      <p className="text-xs">El cliente debe registrar su peso desde su panel</p>
    </div>
  )

  const data = [...weights].reverse().map(w => ({
    fecha: new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    kg: w.weight
  }))

  const min = Math.min(...data.map(d => d.kg))
  const max = Math.max(...data.map(d => d.kg))
  const inicio = data[0].kg
  const actual = data[data.length - 1].kg
  const cambio = actual - inicio

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Peso inicial', value: `${inicio} kg`, color: 'text-muted' },
          { label: 'Peso actual', value: `${actual} kg`, color: 'text-ink' },
          { label: 'Cambio total', value: `${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)} kg`, color: cambio <= 0 ? 'text-ok' : 'text-warn' },
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
            <defs>
              <linearGradient id="gPeso" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4caf7d" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4caf7d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis domain={[min * 0.98, max * 1.02]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="kg" name="Peso" stroke="#4caf7d" strokeWidth={2.5}
              fill="url(#gPeso)" dot={{ fill: '#4caf7d', r: 3 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Gráfica volumen semanal ───────────────────────────────
function VolumenChart({ logs }: { logs: TrainingLogs }) {
  const data = useMemo(() => {
    const semanas: Record<string, number> = {}
    Object.values(logs).forEach(log => {
      if (!log.dateDone || !log.done) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) // lunes
      const lunes = new Date(d)
      lunes.setDate(diff)
      const key = lunes.toISOString().split('T')[0]
      const vol = Object.values(log.sets || {}).reduce((acc, s: any) =>
        acc + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      semanas[key] = (semanas[key] || 0) + vol
    })
    return Object.entries(semanas)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([date, vol]) => ({
        semana: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        kg: Math.round(vol)
      }))
  }, [logs])

  if (data.length < 2) return (
    <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
      <Activity className="w-8 h-8 opacity-30" />
      <p className="text-sm">Sin datos suficientes</p>
      <p className="text-xs">Necesita actividad en al menos 2 semanas</p>
    </div>
  )

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
        ].map((k, i) => (
          <div key={i} className="bg-bg rounded-xl p-3 text-center">
            <p className={`text-base font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ede8" />
            <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a8278' }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={avg} stroke="#8a8278" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'media', position: 'right', fontSize: 9, fill: '#8a8278' }} />
            <Bar dataKey="kg" name="Volumen" fill="#6e5438" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Adherencia mensual ────────────────────────────────────
function AdherenciaChart({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const diasProgramados = plan?.weeks?.reduce((acc, w) => acc + w.days.filter(d => d.exercises.length > 0).length, 0) || 0
  const semanas = plan?.weeks?.length || 1
  const diasPorSemana = diasProgramados / semanas

  const data = useMemo(() => {
    const byWeek: Record<string, Set<string>> = {}
    Object.values(logs).forEach(log => {
      if (!log.dateDone || !log.done) return
      const d = new Date(log.dateDone + 'T00:00:00')
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const lunes = new Date(d); lunes.setDate(diff)
      const key = lunes.toISOString().split('T')[0]
      if (!byWeek[key]) byWeek[key] = new Set()
      byWeek[key].add(log.dateDone)
    })
    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([date, dias]) => {
        const pct = diasPorSemana > 0 ? Math.min(100, Math.round(dias.size / diasPorSemana * 100)) : 0
        return {
          semana: new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          pct,
          dias: dias.size
        }
      })
  }, [logs, diasPorSemana])

  const avgPct = data.length ? Math.round(data.reduce((a, d) => a + d.pct, 0) / data.length) : 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className={`text-2xl font-bold ${avgPct >= 80 ? 'text-ok' : avgPct >= 50 ? 'text-accent' : 'text-warn'}`}>{avgPct}%</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Adherencia media</p>
        </div>
        <div className="bg-bg rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-ink">{diasPorSemana > 0 ? diasPorSemana.toFixed(0) : '—'}</p>
          <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">Días/semana planificados</p>
        </div>
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
              <Bar dataKey="pct" name="Adherencia" radius={[4, 4, 0, 0]}
                fill="#6e5438"
                label={{ position: 'top', fontSize: 9, fill: '#8a8278', formatter: (v: number) => v > 0 ? `${v}%` : '' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-6 text-center text-muted text-sm">Necesita datos de al menos 2 semanas</div>
      )}
    </div>
  )
}

// ── Récords del cliente ───────────────────────────────────
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

  if (!records.length) return (
    <div className="text-center py-8 text-muted text-sm">Sin marcas personales registradas aún</div>
  )

  return (
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
      {records.map(([name, rec], i) => (
        <div key={name} className="flex items-center gap-3 px-4 py-2.5">
          <span className="text-sm w-6 text-center flex-shrink-0">
            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs text-muted">{i+1}</span>}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            {rec.date && <p className="text-[10px] text-muted">{new Date(rec.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-accent">{rec.best} kg</p>
            <p className="text-[10px] text-muted">×{rec.reps}</p>
          </div>
        </div>
      ))}
    </div>
  )
}


// ── Fotos del cliente ─────────────────────────────────────
interface PhotoSession { id: string; date: string; front?: string; side?: string; back?: string; note?: string }

function FotosTab({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<PhotoSession[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<{ session: PhotoSession; type: 'front'|'side'|'back' } | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)

  // Cargar fotos desde Supabase
  useEffect(() => {
    setLoading(true)
    supabase
      .from('foto_sessions')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setPhotos(data.map((r: any) => ({
            id: r.id, date: r.date,
            front: r.front_url, side: r.side_url, back: r.back_url,
            note: r.note || ''
          })))
        }
        setLoading(false)
      })
  }, [clientId])

  const TYPES: ('front'|'side'|'back')[] = ['front', 'side', 'back']
  const TYPE_LABELS = { front: 'Frente', side: 'Lateral', back: 'Espalda' }

  // Navegar lightbox
  const allImages = useMemo(() => {
    const imgs: { session: PhotoSession; type: 'front'|'side'|'back' }[] = []
    photos.forEach(s => TYPES.forEach(t => { if (s[t]) imgs.push({ session: s, type: t }) }))
    return imgs
  }, [photos])

  const lightboxIdx = lightbox ? allImages.findIndex(i => i.session.id === lightbox.session.id && i.type === lightbox.type) : -1
  const prevImg = () => lightboxIdx > 0 ? setLightbox(allImages[lightboxIdx - 1]) : null
  const nextImg = () => lightboxIdx < allImages.length - 1 ? setLightbox(allImages[lightboxIdx + 1]) : null

  if (loading) return <div className="py-8 text-center text-muted text-sm">Cargando fotos...</div>

  if (!photos.length) return (
    <div className="flex flex-col items-center justify-center py-10 text-muted gap-2">
      <Camera className="w-8 h-8 opacity-30" />
      <p className="text-sm">El cliente aún no ha subido fotos</p>
      <p className="text-xs">Las fotos aparecerán aquí cuando las suba desde su panel</p>
    </div>
  )

  const sessionsWithPhotos = photos.filter(s => s.front || s.side || s.back)

  return (
    <div className="space-y-4">
      {/* Toggle comparativa */}
      {sessionsWithPhotos.length >= 2 && (
        <div className="flex items-center gap-3">
          <button onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${compareMode ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
            🔄 {compareMode ? 'Salir de comparativa' : 'Comparar fechas'}
          </button>
          {compareMode && (
            <p className="text-xs text-muted">Selecciona dos sesiones para comparar</p>
          )}
        </div>
      )}

      {/* Modo comparativa */}
      {compareMode && (
        <div className="grid grid-cols-2 gap-3">
          {(['A', 'B'] as const).map((slot, si) => {
            const selectedId = si === 0 ? compareA : compareB
            const session = photos.find(p => p.id === selectedId)
            return (
              <div key={slot} className="space-y-2">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Sesión {slot}</p>
                <select value={selectedId || ''} onChange={e => si === 0 ? setCompareA(e.target.value) : setCompareB(e.target.value)}
                  className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs outline-none">
                  <option value="">Seleccionar fecha...</option>
                  {sessionsWithPhotos.map(s => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </option>
                  ))}
                </select>
                {session && (
                  <div className="grid grid-cols-3 gap-1">
                    {TYPES.map(t => session[t] ? (
                      <div key={t} className="space-y-0.5">
                        <p className="text-[9px] text-muted text-center font-semibold">{TYPE_LABELS[t]}</p>
                        <img src={session[t]} className="w-full aspect-[3/4] object-cover rounded-lg border border-border" alt={TYPE_LABELS[t]} />
                      </div>
                    ) : null)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lista de sesiones */}
      {!compareMode && sessionsWithPhotos.map(session => (
        <div key={session.id} className="bg-bg rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Camera className="w-4 h-4 text-muted flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              {session.note && <p className="text-xs text-muted mt-0.5 italic">"{session.note}"</p>}
            </div>
            <span className="text-xs text-muted">{TYPES.filter(t => session[t]).length}/3</span>
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            {TYPES.map(type => session[type] ? (
              <div key={type} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{TYPE_LABELS[type]}</p>
                <button onClick={() => setLightbox({ session, type })}
                  className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-border hover:border-accent transition-colors">
                  <img src={session[type]} className="w-full h-full object-cover" alt={TYPE_LABELS[type]} />
                </button>
              </div>
            ) : (
              <div key={type} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{TYPE_LABELS[type]}</p>
                <div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                  <Camera className="w-4 h-4 text-muted/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Lightbox */}
      {lightbox && lightbox.session[lightbox.type] && (
        <div className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button onClick={e => { e.stopPropagation(); prevImg() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            style={{ display: lightboxIdx > 0 ? 'block' : 'none' }}>
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm font-semibold">
                {new Date(lightbox.session.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}{TYPE_LABELS[lightbox.type]}
              </p>
              <button onClick={() => setLightbox(null)} className="p-1 text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={lightbox.session[lightbox.type]} className="w-full rounded-2xl" alt="" />
            {lightbox.session.note && (
              <p className="text-white/60 text-xs mt-2 italic text-center">"{lightbox.session.note}"</p>
            )}
          </div>

          <button onClick={e => { e.stopPropagation(); nextImg() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            style={{ display: lightboxIdx < allImages.length - 1 ? 'block' : 'none' }}>
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
type Section = 'fuerza' | 'peso' | 'volumen' | 'adherencia' | 'records' | 'fotos'

const SECTIONS: { id: Section; icon: string; label: string; desc: string }[] = [
  { id: 'fuerza',     icon: '💪', label: 'Fuerza',     desc: 'Progreso de peso por ejercicio' },
  { id: 'peso',       icon: '⚖️', label: 'Peso',        desc: 'Evolución del peso corporal' },
  { id: 'volumen',    icon: '📊', label: 'Volumen',     desc: 'Carga total semanal' },
  { id: 'adherencia', icon: '🎯', label: 'Adherencia',  desc: '% días entrenados vs planificados' },
  { id: 'records',    icon: '🏆', label: 'Récords',     desc: 'Marcas personales' },
  { id: 'fotos',      icon: '📸', label: 'Fotos',       desc: 'Fotos de progreso del cliente' },
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

      {/* Nav secciones */}
      <div className="flex gap-2 flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
              section === s.id ? 'bg-ink text-white border-ink' : 'bg-white border-border text-muted hover:border-accent'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Gráfica activa */}
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="mb-4">
          <p className="text-sm font-bold">{current.icon} {current.label}</p>
          <p className="text-xs text-muted mt-0.5">{current.desc}</p>
        </div>

        {section === 'fuerza'     && <FuerzaChart     logs={logs} plan={plan} />}
        {section === 'peso'       && <PesoChart       clientId={client.id} clientWeight={client.weight} />}
        {section === 'volumen'    && <VolumenChart     logs={logs} />}
        {section === 'adherencia' && <AdherenciaChart  logs={logs} plan={plan} />}
        {section === 'records'    && <RecordsTable     logs={logs} plan={plan} />}
        {section === 'fotos'      && <FotosTab         clientId={client.id} />}
      </div>

      {/* Info pie */}
      <p className="text-[10px] text-muted text-center">
        Datos calculados a partir de los entrenos registrados · Se actualiza en tiempo real
      </p>
    </div>
  )
}
