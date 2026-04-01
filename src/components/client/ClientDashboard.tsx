import { useState, useEffect } from 'react'
import { Flame, Dumbbell, Trophy, TrendingUp, Play, CheckCircle2, MessageSquare, Scale, Bell } from 'lucide-react'
import { TrainingPlan, TrainingLogs, WeightEntry } from '../../types'
import { TrainingSession } from '../trainer/TrainingSession'
import { supabase } from '../../lib/supabase'

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

export function ClientDashboard({ plan, logs, onLogsChange, weightHistory, clientName, clientId }: Props) {
  const [session, setSession] = useState<{ day: any; dayKey: string } | null>(null)
  const [weights, setWeights] = useState<{ date: string; weight: number }[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [showWeightInput, setShowWeightInput] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(false)

  const LS_W = `pf_weight_${clientId}`

  useEffect(() => {
    try { setWeights(JSON.parse(localStorage.getItem(LS_W) || '[]')) } catch {}
    // Verificar permisos de notificación
    if ('Notification' in window) {
      setNotifEnabled(Notification.permission === 'granted')
    }
  }, [clientId])

  const saveWeight = () => {
    const w = parseFloat(newWeight)
    if (!w || w < 20 || w > 300) return
    const date = new Date().toISOString().split('T')[0]
    const updated = [{ date, weight: w }, ...weights.filter(x => x.date !== date)]
      .sort((a, b) => b.date.localeCompare(a.date))
    setWeights(updated)
    localStorage.setItem(LS_W, JSON.stringify(updated))
    setNewWeight(''); setShowWeightInput(false)
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifEnabled(perm === 'granted')
    if (perm === 'granted') {
      new Notification('PanelFit', {
        body: '¡Perfecto! Te recordaremos cuando tengas entreno pendiente.',
        icon: '/favicon.ico'
      })
    }
  }

  const streak = calcStreak(logs)
  const todaySession = getTodaySession(plan)
  const totalExDone = Object.values(logs).filter(l => l.done).length
  const pesoActual = weights[0]?.weight || weightHistory[weightHistory.length - 1]?.v || null
  const pesoCambio = weights.length >= 2 ? weights[0].weight - weights[weights.length - 1].weight : null

  const todayLogs = todaySession
    ? todaySession.day.exercises.map((_: any, ri: number) => logs[`ex_${todaySession.dayKey}_r${ri}`])
    : []
  const todayDone = todayLogs.filter(l => l?.done).length
  const todayTotal = todaySession?.day.exercises.length || 0
  const todayPct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0

  // Historial de entrenos recientes
  const byDate: Record<string, number> = {}
  Object.values(logs).forEach(l => {
    if (l.done && l.dateDone) byDate[l.dateDone] = (byDate[l.dateDone] || 0) + 1
  })
  const recentDays = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7)

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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold">{saludo}, {clientName.split(' ')[0]} 👋</h2>
          {plan.message && (
            <div className="mt-3 flex gap-2 bg-accent/5 border border-accent/20 rounded-xl p-3">
              <MessageSquare className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-sm text-accent italic">"{plan.message}"</p>
            </div>
          )}
        </div>
        {!notifEnabled && 'Notification' in window && (
          <button onClick={requestNotifications}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-xs text-muted hover:border-accent hover:text-accent transition-all flex-shrink-0"
            title="Activar recordatorios de entreno">
            <Bell className="w-3.5 h-3.5" /> Recordatorios
          </button>
        )}
      </div>

      {/* Stats */}
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
        <button onClick={() => setShowWeightInput(v => !v)}
          className="bg-card border border-border rounded-2xl p-4 text-center hover:border-accent transition-colors">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Scale className="w-4 h-4 text-accent" />
            <span className="text-2xl font-serif font-bold">{pesoActual ?? '—'}</span>
          </div>
          <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">
            kg {pesoCambio !== null ? (pesoCambio > 0 ? `+${pesoCambio.toFixed(1)}` : pesoCambio.toFixed(1)) : ''}
          </p>
        </button>
      </div>

      {/* Input peso */}
      {showWeightInput && (
        <div className="flex gap-2 animate-fade-in">
          <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveWeight()}
            placeholder="Tu peso hoy (kg)"
            autoFocus
            className="flex-1 px-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <button onClick={saveWeight}
            className="px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
            Guardar
          </button>
        </div>
      )}

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
            <div className="mt-3 h-1.5 bg-bg-alt rounded-full overflow-hidden">
              <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${todayPct}%` }} />
            </div>
          </div>
          <div className="divide-y divide-border">
            {todaySession.day.exercises.slice(0, 4).map((ex: any, ri: number) => {
              const log = logs[`ex_${todaySession.dayKey}_r${ri}`]
              return (
                <div key={ri} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    log?.done ? 'bg-ok text-white' : 'bg-bg-alt text-muted'
                  }`}>{log?.done ? '✓' : ri + 1}</div>
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
            <button onClick={() => setSession({ day: todaySession.day, dayKey: todaySession.dayKey })}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-ink text-white rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
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

      {/* Historial reciente */}
      {recentDays.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h4 className="font-serif font-bold text-sm mb-4">Últimos 7 días</h4>
          <div className="flex gap-2 justify-between">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(); d.setDate(d.getDate() - (6 - i))
              const key = d.toISOString().split('T')[0]
              const count = byDate[key] || 0
              const isToday = i === 6
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full rounded-lg transition-all ${
                    count > 0 ? 'bg-ok' : 'bg-bg-alt'
                  } ${isToday ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                    style={{ height: count > 0 ? `${Math.min(count * 10 + 20, 48)}px` : '8px' }}
                  />
                  <p className="text-[9px] text-muted">{d.toLocaleDateString('es-ES', { weekday: 'narrow' })}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Historial de peso */}
      {weights.length >= 2 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h4 className="font-serif font-bold text-sm mb-4">Evolución de peso</h4>
          <div className="space-y-2">
            {weights.slice(0, 5).map((w, i) => (
              <div key={w.date} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-accent' : 'bg-bg-alt border border-border'}`} />
                <p className="text-xs text-muted flex-1">
                  {new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-sm font-semibold">{w.weight} kg</p>
                {i > 0 && (
                  <p className={`text-xs font-semibold ${
                    w.weight > weights[i-1].weight ? 'text-warn' : w.weight < weights[i-1].weight ? 'text-ok' : 'text-muted'
                  }`}>
                    {w.weight > weights[i-1].weight ? '+' : ''}{(w.weight - weights[i-1].weight).toFixed(1)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
