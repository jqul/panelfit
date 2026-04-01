import { useState, useEffect } from 'react'
import { Flame, Dumbbell, Trophy, TrendingUp, Play, CheckCircle2, MessageSquare, Scale, Clock, ChevronRight, Zap } from 'lucide-react'
import { TrainingPlan, TrainingLogs, WeightEntry } from '../../types'
import { Exercise } from '../../types'
import { TrainingSession } from '../trainer/TrainingSession'

interface Props {
  plan: TrainingPlan
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  weightHistory: WeightEntry[]
  clientName: string
  clientId: string
}

function calcStreak(logs: TrainingLogs): number {
  const dates = new Set(Object.values(logs).filter(l => l.dateDone).map(l => l.dateDone!))
  let streak = 0
  const d = new Date()
  while (true) {
    const key = d.toISOString().split('T')[0]
    if (dates.has(key)) { streak++; d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}

function getTodaySession(plan: TrainingPlan) {
  const currentWeek = plan.weeks?.find(w => w.isCurrent) || plan.weeks?.[0]
  if (!currentWeek) return null
  const weekIdx = plan.weeks.findIndex(w => w === currentWeek)
  const dayOfWeek = new Date().getDay()
  const dayIdx = Math.min(dayOfWeek === 0 ? 6 : dayOfWeek - 1, (currentWeek.days?.length || 1) - 1)
  const day = currentWeek.days?.[dayIdx]
  if (!day) return null
  return { day, weekIdx, dayIdx, dayKey: `w${weekIdx}_d${dayIdx}` }
}

function estimateMinutes(exercises: any[]): number {
  return exercises.reduce((acc, ex) => {
    const sets = parseInt(ex.sets?.split('×')[0] || '3')
    const restSecs = ex.isMain ? 180 : 90
    return acc + (sets * 45) + (sets * restSecs)
  }, 0) / 60
}

export function ClientDashboard({ plan, logs, onLogsChange, weightHistory, clientName, clientId }: Props) {
  const [session, setSession] = useState<{ day: any; dayKey: string } | null>(null)
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([])
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    try { setWeights(JSON.parse(localStorage.getItem(`pf_weight_${clientId}`) || '[]')) } catch {}
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [clientId])

  const saveWeight = () => {
    const w = parseFloat(newWeight)
    if (!w || w < 20 || w > 300) return
    const date = new Date().toISOString().split('T')[0]
    const updated = [{ date, weight: w }, ...weights.filter((x: { date: string; weight: number }) => x.date !== date)].sort((a, b) => b.date.localeCompare(a.date))
    setWeights(updated)
    localStorage.setItem(`pf_weight_${clientId}`, JSON.stringify(updated))
    setNewWeight(''); setShowWeightInput(false)
  }

  const streak = calcStreak(logs)
  const todaySession = getTodaySession(plan)
  const totalExDone = Object.values(logs).filter(l => l.done).length
  const pesoActual = weights[0]?.weight || null

  const todayLogs = todaySession
    ? todaySession.day.exercises.map((_: Exercise, ri: number) => logs[`ex_${todaySession.dayKey}_r${ri}`])
    : []
  const todayDone = todayLogs.filter(l => l?.done).length
  const todayTotal = todaySession?.day.exercises.length || 0
  const todayPct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0
  const estimatedMin = todaySession ? Math.round(estimateMinutes(todaySession.day.exercises)) : 0

  // Siguiente ejercicio pendiente
  const nextExIdx = todaySession
    ? todaySession.day.exercises.findIndex((_: any, ri: number) => !logs[`ex_${todaySession.dayKey}_r${ri}`]?.done)
    : -1
  const nextEx = nextExIdx >= 0 ? todaySession?.day.exercises[nextExIdx] : null

  if (session) return (
    <TrainingSession day={session.day} dayKey={session.dayKey} plan={plan}
      logs={logs} onLogsChange={onLogsChange} onFinish={() => setSession(null)} onBack={() => setSession(null)} />
  )

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-warn/10 border-b border-warn/20 px-4 py-2 text-center">
          <p className="text-xs font-semibold text-warn">Sin conexión — los datos se guardarán cuando vuelvas a conectarte</p>
        </div>
      )}

      <div className="px-4 pt-6 space-y-5">
        {/* Saludo + mensaje */}
        <div>
          <h2 className="text-2xl font-serif font-bold">{saludo}, {clientName.split(' ')[0]} 👋</h2>
          {plan.message && (
            <div className="mt-3 flex gap-2 bg-accent/5 border border-accent/20 rounded-xl p-3">
              <MessageSquare className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-accent italic">"{plan.message}"</p>
            </div>
          )}
        </div>

        {/* Stats compactos */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Flame className="w-4 h-4 text-warn" />, value: streak, label: 'Racha' },
            { icon: <CheckCircle2 className="w-4 h-4 text-ok" />, value: totalExDone, label: 'Hechos' },
            { icon: <Scale className="w-4 h-4 text-accent" />, value: pesoActual ?? '—', label: 'kg', onClick: () => setShowWeightInput(v => !v) },
          ].map((s, i) => (
            <button key={i} onClick={s.onClick}
              className={`bg-card border border-border rounded-2xl p-3 text-center ${s.onClick ? 'hover:border-accent transition-colors' : ''}`}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                {s.icon}
                <span className="text-xl font-serif font-bold">{s.value}</span>
              </div>
              <p className="text-[10px] text-muted uppercase tracking-wider">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Input peso inline */}
        {showWeightInput && (
          <div className="flex gap-2 animate-fade-in">
            <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveWeight()}
              placeholder="Tu peso hoy (kg)" autoFocus
              className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-base outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
            <button onClick={saveWeight} style={{ minHeight: '44px' }}
              className="px-5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
              OK
            </button>
          </div>
        )}

        {/* CARD PRINCIPAL — Sesión de hoy */}
        {todaySession ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Info sesión */}
            <div className="px-5 pt-5 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-1">Tu entrenamiento de hoy</p>
              <h3 className="font-serif font-bold text-xl leading-tight">{todaySession.day.title}</h3>
              {todaySession.day.focus && <p className="text-sm text-muted mt-0.5">{todaySession.day.focus}</p>}

              {/* Metadatos */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>{todayTotal} ejercicios</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>~{estimatedMin} min</span>
                </div>
                {todayDone > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-ok font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{todayDone}/{todayTotal} hechos</span>
                  </div>
                )}
              </div>

              {/* Barra de progreso */}
              {todayDone > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>Progreso</span>
                    <span className="font-semibold text-ok">{todayPct}%</span>
                  </div>
                  <div className="h-2 bg-bg-alt rounded-full overflow-hidden">
                    <div className="h-full bg-ok rounded-full transition-all duration-500" style={{ width: `${todayPct}%` }} />
                  </div>
                </div>
              )}

              {/* Siguiente ejercicio */}
              {nextEx && (
                <div className="mt-3 flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2">
                  <Zap className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  <p className="text-xs text-muted flex-1">Siguiente: <span className="font-semibold text-ink">{nextEx.name}</span></p>
                  <p className="text-xs text-muted">{nextEx.sets}</p>
                </div>
              )}
            </div>

            {/* CTA sticky */}
            <div className="px-4 pb-4">
              <button onClick={() => setSession({ day: todaySession.day, dayKey: todaySession.dayKey })}
                style={{ minHeight: '52px' }}
                className="w-full flex items-center justify-center gap-3 bg-ink text-white rounded-2xl font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all">
                <Play className="w-5 h-5" />
                {todayPct === 100 ? '¡Sesión completada! Repetir' :
                 todayDone > 0 ? `Continuar — ${todayTotal - todayDone} ejercicios restantes` :
                 'Empezar entrenamiento'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-bg-alt rounded-full flex items-center justify-center mx-auto mb-3">
              <Dumbbell className="w-7 h-7 text-muted opacity-40" />
            </div>
            <h3 className="font-serif font-bold text-lg">Día de descanso</h3>
            <p className="text-sm text-muted mt-1">Tu entrenador no ha programado sesión para hoy. ¡Recupera!</p>
          </div>
        )}

        {/* Historial últimos 7 días */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h4 className="font-serif font-bold text-sm mb-4">Esta semana</h4>
          <div className="flex gap-1.5 justify-between">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (6 - i))
              const key = d.toISOString().split('T')[0]
              const count = Object.values(logs).filter(l => l.done && l.dateDone === key).length
              const isToday = i === 6
              const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'narrow' })
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-full rounded-lg transition-all ${count > 0 ? 'bg-ok' : 'bg-bg-alt'} ${isToday ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                    style={{ height: count > 0 ? '32px' : '8px' }} />
                  <p className={`text-[9px] font-medium ${isToday ? 'text-accent' : 'text-muted'}`}>{dayLabel}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Mensaje motivacional si hay racha */}
        {streak >= 3 && (
          <div className="bg-warn/5 border border-warn/20 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="text-sm font-bold">{streak} días seguidos entrenando</p>
              <p className="text-xs text-muted mt-0.5">
                {streak >= 7 ? '¡Una semana completa! Increíble constancia.' :
                 streak >= 5 ? '¡Casi una semana! Sigue así.' :
                 '¡Buen ritmo! Mantén la racha.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
