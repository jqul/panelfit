import { useState } from 'react'
import { Flame, Dumbbell, Trophy, TrendingUp, Play, CheckCircle2, MessageSquare } from 'lucide-react'
import { TrainingPlan, TrainingLogs, WeightEntry } from '../../types'
import { TrainingSession } from '../trainer/TrainingSession'

interface Props {
  plan: TrainingPlan
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  weightHistory: WeightEntry[]
  clientName: string
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

export function ClientDashboard({ plan, logs, onLogsChange, weightHistory, clientName }: Props) {
  const [session, setSession] = useState<{ day: any; dayKey: string } | null>(null)

  const streak = calcStreak(logs)
  const todaySession = getTodaySession(plan)
  const totalExDone = Object.values(logs).filter(l => l.done).length

  // Stats de hoy
  const todayLogs = todaySession
    ? todaySession.day.exercises.map((_: any, ri: number) => logs[`ex_${todaySession.dayKey}_r${ri}`])
    : []
  const todayDone = todayLogs.filter(l => l?.done).length
  const todayTotal = todaySession?.day.exercises.length || 0
  const todayPct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0

  if (session) {
    return (
      <TrainingSession
        day={session.day}
        dayKey={session.dayKey}
        plan={plan}
        logs={logs}
        onLogsChange={onLogsChange}
        onFinish={() => setSession(null)}
        onBack={() => setSession(null)}
      />
    )
  }

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="space-y-5 max-w-xl mx-auto py-6 px-4">
      {/* Saludo */}
      <div>
        <h2 className="text-2xl font-serif font-bold">{saludo}, {clientName.split(' ')[0]} 👋</h2>
        {plan.message && (
          <div className="mt-3 flex gap-2 bg-accent/5 border border-accent/20 rounded-xl p-3">
            <MessageSquare className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm text-accent italic">"{plan.message}"</p>
          </div>
        )}
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame className="w-4 h-4 text-warn" />
            <span className="text-2xl font-serif font-bold">{streak}</span>
          </div>
          <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Racha días</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="w-4 h-4 text-ok" />
            <span className="text-2xl font-serif font-bold">{totalExDone}</span>
          </div>
          <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Completados</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-accent" />
            <span className="text-2xl font-serif font-bold">{weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].v : '—'}</span>
          </div>
          <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">kg actual</p>
        </div>
      </div>

      {/* Sesión de hoy */}
      {todaySession ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-0.5">Hoy</p>
                <h3 className="font-serif font-bold text-lg leading-tight">{todaySession.day.title}</h3>
                {todaySession.day.focus && <p className="text-xs text-muted mt-0.5">{todaySession.day.focus}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-serif font-bold text-ok">{todayPct}%</p>
                <p className="text-[10px] text-muted">{todayDone}/{todayTotal} ej.</p>
              </div>
            </div>
            {/* Barra progreso */}
            <div className="mt-3 h-1.5 bg-bg-alt rounded-full overflow-hidden">
              <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${todayPct}%` }} />
            </div>
          </div>

          {/* Lista ejercicios preview */}
          <div className="divide-y divide-border">
            {todaySession.day.exercises.slice(0, 4).map((ex: any, ri: number) => {
              const log = logs[`ex_${todaySession.dayKey}_r${ri}`]
              return (
                <div key={ri} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    log?.done ? 'bg-ok text-white' : 'bg-bg-alt text-muted'
                  }`}>
                    {log?.done ? '✓' : ri + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <p className="text-xs text-muted">{ex.sets} {ex.weight ? `· ${ex.weight}` : ''}</p>
                  </div>
                  {ex.isMain && <Trophy className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                </div>
              )
            })}
            {todaySession.day.exercises.length > 4 && (
              <p className="px-5 py-2 text-xs text-muted">+{todaySession.day.exercises.length - 4} ejercicios más</p>
            )}
          </div>

          <div className="p-4">
            <button
              onClick={() => setSession({ day: todaySession.day, dayKey: todaySession.dayKey })}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink text-white rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <Play className="w-4 h-4" />
              {todayDone > 0 ? 'Continuar entrenamiento' : 'Empezar entrenamiento'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Dumbbell className="w-10 h-10 text-muted/30 mx-auto mb-3" />
          <h3 className="font-serif font-bold">Sin sesión para hoy</h3>
          <p className="text-sm text-muted mt-1">Tu entrenador no ha programado ejercicios para hoy. ¡Descansa!</p>
        </div>
      )}
    </div>
  )
}
