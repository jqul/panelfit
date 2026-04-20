import { useState, useEffect, useMemo } from 'react'
import { Scale, Camera, Trophy, Plus, Trash2, ChevronDown, ChevronUp, Dumbbell, Flame, Calendar } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { supabase } from '../../lib/supabase'

interface Props {
  clientId: string
  logs: TrainingLogs
  plan?: TrainingPlan | null
}

interface WeightEntry { date: string; weight: number }
interface PhotoSession { id: string; date: string; front?: string; side?: string; back?: string; note?: string }

// ── Helpers ───────────────────────────────────────────────
function getExerciseName(key: string, plan?: TrainingPlan | null): string {
  const m = key.match(/ex_w(\d+)_d(\d+)_r(\d+)/)
  if (!m || !plan) return key
  return plan.weeks?.[+m[1]]?.days?.[+m[2]]?.exercises?.[+m[3]]?.name || key
}

function getDaySession(logs: TrainingLogs, date: string, plan?: TrainingPlan | null) {
  const entries = Object.entries(logs).filter(([, l]) => l.dateDone === date && l.done)
  if (!entries.length) return null
  const exercises = entries.map(([key, log]) => ({
    name: getExerciseName(key, plan),
    sets: Object.values(log.sets || {}),
    best: Math.max(0, ...Object.values(log.sets || {}).map((s: any) => parseFloat(s.weight) || 0))
  })).filter(e => e.name && e.name !== '')
  const volume = exercises.reduce((acc, ex) => acc + ex.sets.reduce((a, s: any) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0), 0)
  return { exercises, volume: Math.round(volume) }
}

// ── Calendario ────────────────────────────────────────────
function CalendarioTab({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [monthOffset, setMonthOffset] = useState(0)

  const trainingDates = useMemo(() => {
    const s = new Set<string>()
    Object.values(logs).forEach(l => { if (l.dateDone && l.done) s.add(l.dateDone) })
    return s
  }, [logs])

  const totalDays = trainingDates.size
  const streakDays = useMemo(() => {
    let streak = 0
    const d = new Date()
    while (true) {
      const k = d.toISOString().split('T')[0]
      if (trainingDates.has(k)) { streak++; d.setDate(d.getDate() - 1) }
      else break
    }
    return streak
  }, [trainingDates])

  // Mes a mostrar
  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthLabel = viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  // Días del mes
  const firstDay = new Date(year, month, 1).getDay() // 0=dom
  const startOffset = firstDay === 0 ? 6 : firstDay - 1 // lunes primero
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const selectedSession = selectedDay ? getDaySession(logs, selectedDay, plan) : null

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Calendar className="w-4 h-4 text-accent" />, value: totalDays, label: 'Días totales' },
          { icon: <Flame className="w-4 h-4 text-warn" />, value: streakDays, label: 'Racha actual' },
          { icon: <Dumbbell className="w-4 h-4 text-ok" />, value: `${Math.round(totalDays / Math.max(1, 4))}`, label: 'Días/mes media' },
        ].map((k, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex justify-center mb-1">{k.icon}</div>
            <p className="text-xl font-serif font-bold">{k.value}</p>
            <p className="text-[9px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Navegación mes */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setMonthOffset(m => m - 1)}
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">‹</button>
          <p className="text-sm font-semibold capitalize">{monthLabel}</p>
          <button onClick={() => setMonthOffset(m => Math.min(0, m + 1))} disabled={monthOffset >= 0}
            className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors disabled:opacity-30">›</button>
        </div>

        {/* Cabecera días semana */}
        <div className="grid grid-cols-7 mb-1">
          {['L','M','X','J','V','S','D'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-muted py-1">{d}</div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 gap-1">
          {/* Espacios vacíos inicio */}
          {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}

          {/* Días del mes */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const trained = trainingDates.has(dateStr)
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDay
            const isFuture = dateStr > today

            return (
              <button key={day}
                onClick={() => !isFuture && setSelectedDay(isSelected ? null : dateStr)}
                disabled={isFuture}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                  isSelected ? 'ring-2 ring-accent scale-110' :
                  trained ? 'bg-ok text-white shadow-sm' :
                  isToday ? 'bg-accent/20 text-accent border border-accent/40' :
                  isFuture ? 'text-muted/30 cursor-default' :
                  'text-muted hover:bg-bg-alt'
                }`}
                style={{ minHeight: '32px' }}>
                {trained && !isSelected ? '✓' : day}
              </button>
            )
          })}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-ok" /><span className="text-[10px] text-muted">Entrenó</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-accent/20 border border-accent/40" /><span className="text-[10px] text-muted">Hoy</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-bg-alt border border-border" /><span className="text-[10px] text-muted">Sin entreno</span></div>
        </div>
      </div>

      {/* Detalle del día seleccionado */}
      {selectedDay && (
        <div className="bg-card border border-accent/20 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-accent/5 border-b border-accent/20">
            <p className="text-sm font-semibold">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {selectedSession && (
              <p className="text-xs text-muted mt-0.5">{selectedSession.exercises.length} ejercicios · {selectedSession.volume.toLocaleString()} kg volumen</p>
            )}
          </div>
          {selectedSession ? (
            <div className="divide-y divide-border">
              {selectedSession.exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-3.5 h-3.5 text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {(ex.sets as any[]).map((s, si) => (
                        <span key={si} className="text-[9px] bg-bg-alt text-muted px-1.5 py-0.5 rounded">
                          {s.weight}kg×{s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                  {ex.best > 0 && <span className="text-xs font-bold text-accent flex-shrink-0">{ex.best}kg</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-muted text-sm">Sin actividad registrada este día</div>
          )}
        </div>
      )}

      {/* Actividad últimas 12 semanas estilo GitHub */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted mb-3">Últimas 12 semanas</p>
        <div className="flex gap-1">
          {Array.from({ length: 12 }, (_, wi) => {
            const weekStart = new Date()
            weekStart.setDate(weekStart.getDate() - (11 - wi) * 7 - weekStart.getDay() + 1)
            return (
              <div key={wi} className="flex flex-col gap-1 flex-1">
                {Array.from({ length: 7 }, (_, di) => {
                  const d = new Date(weekStart)
                  d.setDate(d.getDate() + di)
                  const dateStr = d.toISOString().split('T')[0]
                  const trained = trainingDates.has(dateStr)
                  const isFuture = dateStr > today
                  return (
                    <div key={di}
                      className={`w-full aspect-square rounded-sm ${
                        isFuture ? 'bg-transparent' :
                        trained ? 'bg-ok' : 'bg-bg-alt border border-border/50'
                      }`}
                      title={dateStr}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[9px] text-muted">hace 12 semanas</span>
          <span className="text-[9px] text-muted">hoy</span>
        </div>
      </div>
    </div>
  )
}

// ── Historial de entrenos ─────────────────────────────────
function HistorialTab({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const sessions = useMemo(() => {
    const byDate: Record<string, { exercises: { name: string; sets: any[]; best: number }[]; volume: number }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.dateDone || !log.done) return
      if (!byDate[log.dateDone]) byDate[log.dateDone] = { exercises: [], volume: 0 }
      const name = getExerciseName(key, plan)
      const sets = Object.values(log.sets || {})
      const best = Math.max(0, ...sets.map((s: any) => parseFloat(s.weight) || 0))
      const vol = sets.reduce((a, s: any) => a + ((parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0)), 0)
      byDate[log.dateDone].exercises.push({ name, sets, best })
      byDate[log.dateDone].volume += vol
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({ date, ...data, volume: Math.round(data.volume) }))
  }, [logs, plan])

  if (!sessions.length) return (
    <div className="text-center py-12 text-muted">
      <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Completa entrenamientos para ver tu historial</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {sessions.map(session => (
        <div key={session.date} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-alt/30 transition-colors"
            onClick={() => setExpanded(expanded === session.date ? null : session.date)}>
            {/* Fecha */}
            <div className="bg-accent/10 rounded-xl px-2.5 py-1.5 text-center flex-shrink-0">
              <p className="text-[10px] font-bold text-accent uppercase">
                {new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' })}
              </p>
              <p className="text-lg font-serif font-bold text-accent leading-tight">
                {new Date(session.date + 'T00:00:00').getDate()}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold capitalize">
                {new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {session.exercises.length} ejercicios · {session.volume.toLocaleString()} kg volumen
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-ok/10 flex items-center justify-center">
                <span className="text-ok text-sm">✓</span>
              </div>
              {expanded === session.date
                ? <ChevronUp className="w-4 h-4 text-muted" />
                : <ChevronDown className="w-4 h-4 text-muted" />}
            </div>
          </div>

          {expanded === session.date && (
            <div className="border-t border-border divide-y divide-border">
              {session.exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-bg flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-3.5 h-3.5 text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {(ex.sets as any[]).map((s, si) => (
                        <span key={si} className="text-[9px] bg-bg-alt text-muted px-1.5 py-0.5 rounded">
                          {s.weight}kg×{s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                  {ex.best > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-accent">{ex.best}kg</p>
                      <p className="text-[9px] text-muted">mejor</p>
                    </div>
                  )}
                </div>
              ))}
              {/* Volumen total */}
              <div className="px-4 py-2 bg-bg-alt/50 flex justify-between">
                <span className="text-xs text-muted">Volumen total</span>
                <span className="text-xs font-bold">{session.volume.toLocaleString()} kg</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Récords ───────────────────────────────────────────────
function RecordsTab({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const records = useMemo(() => {
    const r: Record<string, { best: number; date: string; reps: string }> = {}
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExerciseName(key, plan)
      Object.values(log.sets || {}).forEach((s: any) => {
        const w = parseFloat(s.weight) || 0
        if (!r[name] || w > r[name].best) {
          r[name] = { best: w, date: log.dateDone || '', reps: s.reps || '?' }
        }
      })
    })
    return Object.entries(r).filter(([, v]) => v.best > 0).sort((a, b) => b[1].best - a[1].best)
  }, [logs, plan])

  if (!records.length) return (
    <div className="text-center py-12 text-muted">
      <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="text-sm">Completa entrenamientos para ver tus récords</p>
    </div>
  )

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted px-1">{records.length} ejercicios con marca personal</p>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {records.map(([name, rec], i) => (
          <div key={name} className="flex items-center gap-3 px-4 py-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold ${
              i === 0 ? 'bg-yellow-100 text-yellow-700' :
              i === 1 ? 'bg-gray-100 text-gray-600' :
              i === 2 ? 'bg-orange-100 text-orange-600' :
              'bg-bg-alt text-muted text-xs'
            }`}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              {rec.date && (
                <p className="text-[10px] text-muted">
                  {new Date(rec.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-accent">{rec.best} kg</p>
              <p className="text-[10px] text-muted">×{rec.reps} reps</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export function ProgresoClienteTab({ clientId, logs, plan }: Props) {
  const [subtab, setSubtab] = useState<'calendario' | 'historial' | 'peso' | 'fotos' | 'records'>('calendario')
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [photos, setPhotos] = useState<PhotoSession[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [uploading, setUploading] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const LS_W = `pf_weight_${clientId}`
  const LS_P = `pf_photos_${clientId}`

  useEffect(() => {
    try { setWeights(JSON.parse(localStorage.getItem(LS_W) || '[]')) } catch {}
    try { setPhotos(JSON.parse(localStorage.getItem(LS_P) || '[]')) } catch {}
  }, [clientId])

  const saveWeights = (w: WeightEntry[]) => { setWeights(w); localStorage.setItem(LS_W, JSON.stringify(w)) }
  const savePhotos = (p: PhotoSession[]) => { setPhotos(p); localStorage.setItem(LS_P, JSON.stringify(p)) }

  const addWeight = () => {
    const w = parseFloat(newWeight)
    if (!w || w < 20 || w > 300) return
    const date = new Date().toISOString().split('T')[0]
    saveWeights([{ date, weight: w }, ...weights.filter(x => x.date !== date)].sort((a, b) => b.date.localeCompare(a.date)))
    setNewWeight('')
  }

  const uploadPhoto = async (sessionId: string, type: 'front' | 'side' | 'back', file: File) => {
    if (file.size > 10 * 1024 * 1024) return
    setUploading(true)
    const path = `fotos/${clientId}/${sessionId}/${type}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      savePhotos(photos.map(s => s.id === sessionId ? { ...s, [type]: data.publicUrl } : s))
    }
    setUploading(false)
  }

  const pesoInicial = weights[weights.length - 1]?.weight
  const pesoActual = weights[0]?.weight
  const pesoCambio = pesoInicial && pesoActual ? pesoActual - pesoInicial : null

  const TABS = [
    { id: 'calendario', icon: '📅', label: 'Calendario' },
    { id: 'historial',  icon: '📋', label: 'Historial' },
    { id: 'records',    icon: '🏆', label: 'Récords' },
    { id: 'peso',       icon: '⚖️', label: 'Peso' },
    { id: 'fotos',      icon: '📸', label: 'Fotos' },
  ]

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-4">
      <h3 className="font-serif font-bold text-xl">Tu progreso</h3>

      {/* Tabs — scroll horizontal en móvil */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSubtab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              subtab === t.id ? 'bg-ink text-white' : 'bg-card border border-border text-muted hover:border-accent'
            }`}
            style={{ minHeight: '40px' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {subtab === 'calendario' && <CalendarioTab logs={logs} plan={plan} />}
      {subtab === 'historial'  && <HistorialTab  logs={logs} plan={plan} />}
      {subtab === 'records'    && <RecordsTab    logs={logs} plan={plan} />}

      {subtab === 'peso' && (
        <div className="space-y-4">
          {weights.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-serif font-bold">{pesoActual}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">kg actual</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className={`text-2xl font-serif font-bold ${pesoCambio === null ? 'text-muted' : pesoCambio < 0 ? 'text-ok' : pesoCambio > 0 ? 'text-warn' : 'text-muted'}`}>
                  {pesoCambio === null ? '—' : `${pesoCambio > 0 ? '+' : ''}${pesoCambio.toFixed(1)}`}
                </p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">cambio total</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-serif font-bold">{weights.length}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">registros</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWeight()}
              placeholder="Registrar peso de hoy (kg)"
              className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-base outline-none focus:ring-2 focus:ring-accent/20"
              style={{ fontSize: '16px' }} />
            <button onClick={addWeight} className="px-5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 flex-shrink-0" style={{ minHeight: '44px' }}>
              + Añadir
            </button>
          </div>
          {weights.length >= 3 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted mb-3">Evolución</p>
              <div className="flex items-end gap-1 h-16">
                {weights.slice(0, 12).reverse().map((w, i) => {
                  const min = Math.min(...weights.map(x => x.weight))
                  const max = Math.max(...weights.map(x => x.weight))
                  const range = max - min || 1
                  const h = Math.max(8, ((w.weight - min) / range) * 48 + 8)
                  const isLast = i === Math.min(weights.length, 12) - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-sm ${isLast ? 'bg-accent' : 'bg-bg-alt border border-border'}`} style={{ height: `${h}px` }} />
                      <p className="text-[8px] text-muted">{w.weight}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {weights.length > 0 && (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {weights.map((w, i) => (
                <div key={w.date} className="flex items-center gap-4 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-accent' : 'bg-bg-alt border border-border'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{w.weight} kg</p>
                    <p className="text-xs text-muted">{new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  {i > 0 && (
                    <p className={`text-xs font-bold ${w.weight > weights[i-1].weight ? 'text-warn' : w.weight < weights[i-1].weight ? 'text-ok' : 'text-muted'}`}>
                      {w.weight > weights[i-1].weight ? '+' : ''}{(w.weight - weights[i-1].weight).toFixed(1)}
                    </p>
                  )}
                  <button onClick={() => saveWeights(weights.filter((_, idx) => idx !== i))} className="p-2 text-muted hover:text-warn" style={{ minWidth: '44px', minHeight: '44px' }}>
                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {weights.length === 0 && <div className="text-center py-10 text-muted"><Scale className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Registra tu peso para ver tu evolución</p></div>}
        </div>
      )}

      {subtab === 'fotos' && (
        <div className="space-y-4">
          <button onClick={() => {
            const s: PhotoSession = { id: `s_${Date.now()}`, date: new Date().toISOString().split('T')[0] }
            savePhotos([s, ...photos]); setExpandedSession(s.id)
          }} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-2xl text-muted hover:border-accent hover:text-accent transition-all text-sm font-semibold" style={{ minHeight: '44px' }}>
            <Plus className="w-4 h-4" /> Nueva sesión de fotos
          </button>
          {photos.length === 0 && <div className="text-center py-10 text-muted"><Camera className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Sin fotos aún.</p></div>}
          {photos.map(session => (
            <div key={session.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}>
                <Camera className="w-4 h-4 text-muted" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="text-xs text-muted">{[session.front, session.side, session.back].filter(Boolean).length}/3 fotos</p>
                </div>
                <button onClick={e => { e.stopPropagation(); savePhotos(photos.filter(s => s.id !== session.id)) }} className="p-2 text-muted hover:text-warn" style={{ minWidth: '44px', minHeight: '44px' }}><Trash2 className="w-3.5 h-3.5" /></button>
                {expandedSession === session.id ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </div>
              {expandedSession === session.id && (
                <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(['front', 'side', 'back'] as const).map(type => {
                      const labels = { front: 'Frente', side: 'Lado', back: 'Espalda' }
                      const url = session[type]
                      return (
                        <div key={type} className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{labels[type]}</p>
                          <label className={`block cursor-pointer rounded-xl overflow-hidden border-2 aspect-[3/4] ${url ? 'border-border' : 'border-dashed border-border hover:border-accent'}`}>
                            {url ? <img src={url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted p-2"><Camera className="w-5 h-5 opacity-40" /><span className="text-[10px] text-center">Toca para subir</span></div>}
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(session.id, type, f) }} />
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  {uploading && <p className="text-xs text-accent text-center">Subiendo foto...</p>}
                  <textarea rows={2} value={session.note || ''} onChange={e => savePhotos(photos.map(s => s.id === session.id ? { ...s, note: e.target.value } : s))}
                    placeholder="Nota de esta sesión..." className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none resize-none" style={{ fontSize: '16px' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
