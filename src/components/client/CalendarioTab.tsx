import { useState, useMemo } from 'react'
import { Flame, Calendar, Dumbbell } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { localDateKey } from '../../lib/dates'
import { streakDays } from '../../lib/progressSummary'

function getExerciseName(key: string, plan?: TrainingPlan | null): string {
  const m = key.match(/ex_w(d+)_d(d+)_r(d+)/)
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

// Calendario de entrenos del cliente: qué días entrenó y, al tocar uno, qué hizo.
// Vive en la pestaña Entreno, junto a la semana en curso, no en Progreso.
export function CalendarioTab({ logs, plan }: { logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [monthOffset, setMonthOffset] = useState(0)

  const trainingDates = useMemo(() => {
    const s = new Set<string>()
    Object.values(logs).forEach(l => { if (l.dateDone && l.done) s.add(l.dateDone) })
    return s
  }, [logs])

  const totalDays = trainingDates.size
  // Misma racha que el inicio (con la gracia de la mañana) y fechas locales, no UTC.
  const streak = useMemo(() => streakDays(logs, new Date(), false, true), [logs])
  const last30 = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 29)
    const from = localDateKey(cutoff)
    return [...trainingDates].filter(d => d >= from).length
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
  const today = localDateKey()

  const selectedSession = selectedDay ? getDaySession(logs, selectedDay, plan) : null

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Calendar className="w-4 h-4 text-accent" />, value: totalDays, label: 'Días totales' },
          { icon: <Flame className="w-4 h-4 text-warn" />, value: streak, label: 'Racha actual' },
          { icon: <Dumbbell className="w-4 h-4 text-ok" />, value: last30, label: 'Últimos 30 días' },
        ].map((k, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-3 text-center">
            <div className="flex justify-center mb-1">{k.icon}</div>
            <p className="text-xl font-serif font-bold">{k.value}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">{k.label}</p>
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
                      {ex.sets.map((s, si) => (
                        <span key={si} className="text-[10px] bg-bg-alt text-muted px-1.5 py-0.5 rounded">
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
          <span className="text-[10px] text-muted">hace 12 semanas</span>
          <span className="text-[10px] text-muted">hoy</span>
        </div>
      </div>
    </div>
  )
}

