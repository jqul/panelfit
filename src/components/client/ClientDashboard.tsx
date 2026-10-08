import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Flame, Dumbbell, Play, CheckCircle2, Target, MessageSquare, TrendingUp, Trophy, Clock, Zap } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { Exercise } from '../../types'
import { ActiveWorkout } from './ActiveWorkout'
import { SeriesTypeDef } from '../trainer/TrainingPlanEditor'
import { getEffectiveWeekIdx } from '../../lib/planWeek'
import { adherence28, streakDays, collectSessionBests, strengthChange, latestAchievement } from '../../lib/progressSummary'
import { localDateKey } from '../../lib/dates'

interface Props {
  plan: TrainingPlan
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  clientName: string
  clientId: string
  trainerId?: string
  objetivo?: string
  welcomeMsg?: string
  motivMsg?: string
  restDayMsg?: string
  brandBg?: string
  brandColor?: string
  seriesTypes?: SeriesTypeDef[]
}

// Lunes=0 ... domingo=6, igual que Date.getDay() ajustado (domingo=0 -> 6).
const WEEKDAY_NAMES = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
function weekdayFromTitle(title: string): number | null {
  const norm = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos: "miércoles" -> "miercoles"
  const idx = WEEKDAY_NAMES.findIndex(name => norm.includes(name))
  return idx === -1 ? null : idx
}

function getTodaySession(plan: TrainingPlan, logs: TrainingLogs) {
  const weekIdx = getEffectiveWeekIdx(plan, logs)
  const currentWeek = plan.weeks?.[weekIdx]
  if (!currentWeek?.days?.length) return null
  const isDayDone = (di: number) => {
    if (logs[`finished_w${weekIdx}_d${di}`]?.sessionFinished) return true
    const dayExs = currentWeek.days[di].exercises || []
    if (!dayExs.length) return true
    return dayExs.every((_, ri) => logs[`ex_w${weekIdx}_d${di}_r${ri}`]?.done)
  }

  // 1) Si los títulos de los días llevan el nombre del día de la semana (p. ej.
  //    "LUNES — EMPUJE", "JUEVES — BANCA"...), usar ESE como el de hoy siempre
  //    que coincida con el día real — es como el propio cliente lo entiende, y
  //    no depende de qué se haya entrenado antes.
  const todayWeekday = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()
  const weekdayMatchIdx = currentWeek.days.findIndex(d => weekdayFromTitle(d.title) === todayWeekday)

  // 2) Si no hay nombres de día (p. ej. "Día A/B/C"), no hay forma de saber a
  //    qué día del calendario corresponde cada uno — en su lugar, "hoy" es el
  //    siguiente día sin terminar de la semana actual, por orden, volviendo a
  //    empezar por el primero si ya se completaron todos. ANTES se usaba el
  //    índice del día de la semana natural directo sobre el array de días,
  //    asumiendo 7 días exactos (uno por día del calendario) — con un split de
  //    3-4 días eso se salía del hueco real (p. ej. un jueves con un plan de 4
  //    días mostraba days[3] "Viernes" en vez del día que tocaba).
  let dayIdx = weekdayMatchIdx
  if (dayIdx === -1) {
    dayIdx = currentWeek.days.findIndex((_, di) => !isDayDone(di))
    if (dayIdx === -1) dayIdx = 0
  }
  const day = currentWeek.days[dayIdx]
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

export function ClientDashboard({ plan, logs, onLogsChange, clientName, trainerId, welcomeMsg, motivMsg, restDayMsg, brandBg, brandColor = '#6e5438' }: Props) {
  const [session, setSession] = useState<{ day: any; dayKey: string } | null>(null)
  const [sessionMinimized, setSessionMinimized] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  const streak = streakDays(logs, new Date(), false, true)
  const todaySession = getTodaySession(plan, logs)
  // Adherencia de las últimas 4 semanas: dice más que "42 ejercicios hechos".
  const adherencia = adherence28(plan, logs)
  // El peso corporal vive en Progreso → Cuerpo: el inicio responde a "qué toca
  // hoy" y a "cómo voy", no a "cuántos kilos pesas".
  const bests = collectSessionBests(logs, plan)
  const fuerza = strengthChange(bests)
  const logro = latestAchievement(bests)

  const todayLogs = todaySession
    ? todaySession.day.exercises.map((_: Exercise, ri: number) => logs[`ex_${todaySession.dayKey}_r${ri}`])
    : []
  const todayDone = todayLogs.filter(l => l?.done).length
  const todayTotal = todaySession?.day.exercises.length || 0
  const todayPct = todayTotal ? Math.round((todayDone / todayTotal) * 100) : 0
  // El cliente puede dar la sesión por terminada con ejercicios sin hacer (se
  // acabó el tiempo, etc.) — sin este flag seguiría apareciendo "Continuar"
  // como si la sesión estuviera a medias en vez de cerrada de verdad. El
  // progreso (todayPct) se sigue mostrando real; esto solo afecta al CTA.
  const todayFinishedEarly = todaySession ? !!logs[`finished_${todaySession.dayKey}`]?.sessionFinished : false
  const todayComplete = todayPct === 100 || todayFinishedEarly
  const estimatedMin = todaySession ? Math.round(estimateMinutes(todaySession.day.exercises)) : 0

  const nextExIdx = todaySession
    ? todaySession.day.exercises.findIndex((_: any, ri: number) => !logs[`ex_${todaySession.dayKey}_r${ri}`]?.done)
    : -1
  const nextEx = nextExIdx >= 0 ? todaySession?.day.exercises[nextExIdx] : null

  const sessionOverlay = session && (
    <>
      {/* En un portal: <main> de ClientView tiene z-10 y crea su propio contexto de
          capas, así que dentro de él el entreno quedaba por debajo de la cabecera
          de la app (z-20) y la tapaba (volver, cronómetro y Terminar). */}
      {!sessionMinimized && createPortal(
        <ActiveWorkout
          day={session.day}
          dayKey={session.dayKey}
          plan={plan}
          logs={logs}
          onLogsChange={onLogsChange}
          onFinish={() => { setSession(null); setSessionMinimized(false) }}
          onBack={() => setSessionMinimized(true)}
          trainerId={trainerId}
        />,
        document.body
      )}
      {sessionMinimized && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-1">
          <div
            className="bg-ink text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setSessionMinimized(false)}>
            <div className="w-3 h-3 rounded-full bg-ok flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{session.day.title}</p>
              <p className="text-xs text-white/60">
                {(() => {
                  const done = session.day.exercises.filter((_: any, ri: number) => logs[`ex_${session.dayKey}_r${ri}`]?.done).length
                  const total = session.day.exercises.length
                  return `${done}/${total} ejercicios · Toca para continuar`
                })()}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setSession(null); setSessionMinimized(false) }}
              className="flex-shrink-0 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-semibold transition-colors">
              Terminar
            </button>
          </div>
        </div>
      )}
    </>
  )

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="max-w-xl mx-auto" style={{ paddingTop: brandBg ? 8 : 0 }}>
      {sessionOverlay}

      {!isOnline && (
        <div className="bg-warn/10 border-b border-warn/20 px-4 py-2 text-center">
          <p className="text-xs font-semibold text-warn">Sin conexión — los datos se guardarán cuando vuelvas a conectarte</p>
        </div>
      )}

      <div className="px-4 pt-6 space-y-5">
        {/* Saludo */}
        <div>
          <h2 className="text-2xl font-serif font-bold">{saludo}, {clientName.split(' ')[0]} 👋</h2>
          {(welcomeMsg || plan.message) && (
            <div className="mt-3 flex gap-2 rounded-xl p-3"
              style={{ backgroundColor: `${brandColor}12`, border: `1px solid ${brandColor}30` }}>
              <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: brandColor }} />
              <p className="text-sm italic" style={{ color: brandColor }}>"{welcomeMsg || plan.message}"</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Flame className="w-4 h-4 text-warn" />, value: streak, label: 'Racha' },
            { icon: <Target className="w-4 h-4 text-ok" />, value: adherencia !== null ? `${adherencia}%` : '—', label: 'Adherencia' },
            { icon: <TrendingUp className="w-4 h-4 text-accent" />, value: fuerza ? `${fuerza.pct > 0 ? '+' : ''}${fuerza.pct}%` : '—', label: 'Fuerza' },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                {s.icon}
                <span className="text-xl font-serif font-bold">{s.value}</span>
              </div>
              <p className="text-[11px] text-muted uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Card sesión de hoy */}
        {todaySession ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4">
              <p className="text-[11px] uppercase tracking-widest text-muted font-bold mb-1">Tu entrenamiento de hoy</p>
              <h3 className="font-serif font-bold text-xl leading-tight">{todaySession.day.title}</h3>
              {todaySession.day.focus && <p className="text-sm text-muted mt-0.5">{todaySession.day.focus}</p>}

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

              {nextEx && (
                <div className="mt-3 flex items-center gap-2 bg-bg border border-border rounded-xl px-3 py-2">
                  <Zap className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  <p className="text-xs text-muted flex-1">Siguiente: <span className="font-semibold text-ink">{nextEx.name}</span></p>
                  <p className="text-xs text-muted">{nextEx.sets}</p>
                </div>
              )}
            </div>

            <div className="px-4 pb-4">
              <button onClick={() => setSession({ day: todaySession.day, dayKey: todaySession.dayKey })}
                style={{ minHeight: '52px' }}
                className="w-full flex items-center justify-center gap-3 bg-ink text-white rounded-2xl font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all">
                <Play className="w-5 h-5" />
                {todayComplete ? '¡Sesión completada! Repetir' :
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
            <p className="text-sm text-muted mt-1">{motivMsg || "Hoy toca descansar y recuperar. ¡Tu cuerpo lo necesita!"}</p>
          </div>
        )}

        {/* Racha semanal — círculos dorados de lunes a domingo, sin ser punitiva */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h4 className="font-serif font-bold text-sm mb-4">Esta semana</h4>
          <div className="flex gap-1.5 justify-between">
            {(() => {
              const now = new Date()
              const dow = now.getDay() // 0=domingo
              const monday = new Date(now); monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
              return Array.from({ length: 7 }, (_, i) => {
                const d = new Date(monday); d.setDate(monday.getDate() + i)
                const key = localDateKey(d)
                const todayKey = localDateKey(now)
                const count = Object.values(logs).filter(l => l.done && l.dateDone === key).length
                const isToday = key === todayKey
                const dayLabel = d.toLocaleDateString('es-ES', { weekday: 'narrow' })
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full bg-bg-alt flex items-center justify-center transition-all ${isToday ? 'ring-2 ring-accent ring-offset-1' : ''}`}
                      style={count > 0 ? { backgroundColor: '#e0a854' } : undefined}>
                      {count > 0 && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <p className={`text-[11px] font-medium ${isToday ? 'text-accent' : 'text-muted'}`}>{dayLabel}</p>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Macros */}
        {(() => {
          const macros = plan?.macros
          if (!macros?.kcal) return null
          return (
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-serif font-bold text-sm">Macros de hoy</h4>
                <span className="text-[11px] text-muted uppercase tracking-wider">objetivos diarios</span>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Kcal', value: macros.kcal, color: 'text-warn' },
                  { label: 'Prot', value: `${macros.protein}g`, color: 'text-ok' },
                  { label: 'Carbs', value: `${macros.carbs}g`, color: 'text-accent' },
                  { label: 'Grasas', value: `${macros.fats}g`, color: 'text-muted' },
                ].map(m => (
                  <div key={m.label} className="bg-bg border border-border rounded-xl p-2.5 text-center">
                    <p className={`font-serif font-bold text-lg ${m.color}`}>{m.value}</p>
                    <p className="text-[11px] text-muted">{m.label}</p>
                  </div>
                ))}
              </div>
              {macros.notaMacros && (
                <p className="text-xs text-muted leading-relaxed border-t border-border pt-3">{macros.notaMacros}</p>
              )}
            </div>
          )
        })()}

        {/* Último logro — la racha ya está arriba; aquí va lo que se ha conseguido */}
        {(logro || restDayMsg) && (
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-warn/10 flex items-center justify-center flex-shrink-0"><Trophy className="w-5 h-5 text-warn" /></span>
            <div className="min-w-0">
              {logro ? (
                <>
                  <p className="text-[11px] uppercase tracking-widest text-muted font-bold">Último logro</p>
                  <p className="text-sm font-bold truncate">{logro.name} · +{String(logro.delta).replace('.', ',')} kg</p>
                  <p className="text-xs text-muted mt-0.5">{new Date(logro.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}{restDayMsg ? ` · ${restDayMsg}` : ''}</p>
                </>
              ) : (
                <p className="text-sm text-muted">{restDayMsg}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SelectorDias({ plan, onUpdate }: { plan: any; clientId: string; onUpdate: (dias: number[]) => void }) {
  const diasSemana = plan?.diasSemana || 0
  const diasElegidos: number[] = plan?.diasElegidos || []
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  if (!diasSemana) return null
  const toggle = (d: number) => {
    let nuevos: number[]
    if (diasElegidos.includes(d)) { nuevos = diasElegidos.filter(x => x !== d) }
    else if (diasElegidos.length < diasSemana) { nuevos = [...diasElegidos, d].sort() }
    else return
    onUpdate(nuevos)
  }
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-serif font-bold text-sm">Mis días de entreno</h4>
        <span className="text-xs text-muted">{diasElegidos.length}/{diasSemana} seleccionados</span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DIAS.map((d, i) => {
          const selected = diasElegidos.includes(i)
          const disabled = !selected && diasElegidos.length >= diasSemana
          return (
            <button key={i} onClick={() => toggle(i)} disabled={disabled}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                selected ? 'bg-ink text-white' :
                disabled ? 'bg-bg-alt text-muted/40 cursor-not-allowed' :
                'bg-bg border border-border text-muted hover:border-accent'
              }`}>
              {d}
            </button>
          )
        })}
      </div>
      {diasElegidos.length === diasSemana && <p className="text-xs text-ok font-semibold text-center">✓ Días confirmados</p>}
      {diasElegidos.length < diasSemana && <p className="text-xs text-muted text-center">Elige {diasSemana - diasElegidos.length} día{diasSemana - diasElegidos.length > 1 ? 's' : ''} más</p>}
    </div>
  )
}
