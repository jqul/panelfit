import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { Flame, Dumbbell, Play, Target, MessageSquare, TrendingUp, Trophy, Clock, Zap } from 'lucide-react'
import { TrainingPlan, TrainingLogs } from '../../types'
import { Exercise } from '../../types'
import { ActiveWorkout, usePrefetchActiveWorkout } from './ActiveWorkoutLazy'
import { ParaHoy } from './ParaHoy'
// Se descarga solo al mostrarse: espera a sus propios datos de todos modos.
const FechaClaveHoy = lazy(() => import('./FechaClaveHoy').then(m => ({ default: m.FechaClaveHoy })))
import type { SeriesTypeDef } from '../trainer/training-plan-editor/seriesTypesData'
import { getTodaySession } from '../../lib/sesionHoy'
import { getEffectiveWeekIdx } from '../../lib/planWeek'
import { adherence28, streakDays, collectSessionBests, strengthChange, latestAchievement } from '../../lib/progressSummary'
import { localDateKey } from '../../lib/dates'
import { estimarMinutos, presupuestosUtiles, versionCorta } from '../../lib/duracionSesion'
import { AnilloProgreso } from './AnilloProgreso'
import { semanaResumen, fraseSemana, fraseRacha, fraseAdherencia, tendenciaFuerza, nombreDePila, type Tono } from '../../lib/hoyResumen'

// Color solo para estados: verde = bien, naranja/rojo = atención, gris = neutro.
const TONO_CLASE: Record<Tono, string> = { ok: 'text-ok', atencion: 'text-attn', neutro: 'text-muted' }

// La hoja de "registrar entreno ya hecho" solo se descarga al abrirla.
const QuickLogSheet = lazy(() => import('./QuickLogSheet').then(m => ({ default: m.QuickLogSheet })))

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
  /** Logo o foto de la marca del entrenador: acompaña a su nota. */
  trainerLogo?: string | null
  brandColor?: string
  seriesTypes?: SeriesTypeDef[]
  /** Quien deja la nota de bienvenida (entrenador): se enseña su nombre de pila. */
  trainerName?: string
}

export function ClientDashboard({ plan, logs, onLogsChange, clientName, clientId, trainerId, trainerName, welcomeMsg, motivMsg, restDayMsg, brandBg, trainerLogo, brandColor = '#6e5438' }: Props) {
  usePrefetchActiveWorkout()
  const [session, setSession] = useState<{ day: any; dayKey: string } | null>(null)
  const [sessionMinimized, setSessionMinimized] = useState(false)
  const [quickLogOpen, setQuickLogOpen] = useState(false)
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
  // Plan asignado con fecha de inicio futura: en vez de "Día de descanso", cuándo empieza.
  const empiezaEl = plan.fechaInicio && plan.fechaInicio > localDateKey()
    ? new Date(plan.fechaInicio + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  const weekIdx = getEffectiveWeekIdx(plan, logs)
  const weekLabel = plan.weeks?.[weekIdx]?.label
  const semana = semanaResumen(plan, logs, weekIdx)
  const fraseSem = fraseSemana(semana.hechas, semana.previstas)
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
  const estimatedMin = todaySession ? estimarMinutos(todaySession.day.exercises, plan) : 0
  // "¿Poco tiempo?": una guía de qué hacer con 30/45/60 min. No cambia el entreno ni los registros (van por posición):
  // se hace en orden y, si no llega, se termina con «Terminar igual».
  const [pocoTiempo, setPocoTiempo] = useState<number | null>(null)
  const presupuestos = todaySession && todayDone === 0 ? presupuestosUtiles(todaySession.day.exercises, plan) : []
  const corta = todaySession && pocoTiempo ? versionCorta(todaySession.day.exercises, plan, pocoTiempo) : null
  const nTotalSemanas = plan.weeks?.length ?? 0
  // El botón de empezar se queda a mano: cuando el de la tarjeta sale de la pantalla al desplazar, aparece uno fijo abajo.
  const botonHero = useRef<HTMLButtonElement>(null)
  const [botonVisible, setBotonVisible] = useState(true)
  useEffect(() => {
    const el = botonHero.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setBotonVisible(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [todaySession?.dayKey, todayComplete])

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

      {/* Botón fijo: aparece cuando el de la tarjeta de hoy se ha desplazado fuera de la pantalla */}
      {todaySession && !todayComplete && !session && !botonVisible && (
        <div className="fixed left-0 right-0 z-30 px-4 pointer-events-none" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 8px)' }}>
          <button onClick={() => setSession({ day: todaySession.day, dayKey: todaySession.dayKey })}
            style={{ minHeight: '52px' }}
            className="pointer-events-auto max-w-xl mx-auto w-full flex items-center justify-center gap-2 bg-ink text-white rounded-2xl font-bold text-base shadow-lg active:scale-[0.98] transition-transform">
            <Play className="w-5 h-5" /> {todayDone > 0 ? 'Continuar' : 'Entrenar ahora'}
          </button>
        </div>
      )}

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
              {trainerLogo
                ? <img src={trainerLogo} alt="" className="w-9 h-9 rounded-full object-cover border flex-shrink-0" style={{ borderColor: `${brandColor}40` }} />
                : <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: brandColor }} />}
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest font-bold mb-0.5" style={{ color: brandColor }}>{nombreDePila(trainerName) ? `Nota de ${nombreDePila(trainerName)}` : 'Nota de tu entrenador'}</p>
                <p className="text-sm italic" style={{ color: brandColor }}>"{welcomeMsg || plan.message}"</p>
              </div>
            </div>
          )}
        </div>

        {/* Card sesión de hoy */}
        {todaySession ? (
          <div id="hoy-entreno" className={`scroll-mt-4 border rounded-2xl overflow-hidden ${todayComplete ? 'bg-ok/5 border-ok/30' : 'bg-card border-border'}`}
            style={todayComplete ? undefined : { backgroundColor: `${brandColor}0d`, borderColor: `${brandColor}33` }}>
            <div className="px-5 pt-5 pb-4">
              <p className="text-[11px] uppercase tracking-widest text-muted font-bold mb-1">Hoy{weekLabel ? ` · ${weekLabel}` : ''}</p>
              <h3 className="font-serif font-bold text-xl leading-tight">{todaySession.day.title}</h3>
              {todaySession.day.focus && <p className="text-sm text-muted mt-0.5">{todaySession.day.focus}</p>}
              {todayComplete && <p role="status" className="text-sm font-semibold text-ok mt-2">Entreno de hoy hecho. Buen trabajo.</p>}

              {/* Dónde vas: hoy y en el programa, en anillos */}
              <div className="mt-4 flex items-start gap-6">
                <figure className="flex flex-col items-center gap-1">
                  <AnilloProgreso valor={todayTotal ? todayDone / todayTotal : 0} color={todayComplete ? 'var(--color-ok)' : brandColor}>{todayDone}/{todayTotal}</AnilloProgreso>
                  <figcaption className="text-[11px] text-muted">{todayComplete ? 'Hecho' : 'Hoy'}</figcaption>
                </figure>
                {nTotalSemanas > 1 && (
                  <figure className="flex flex-col items-center gap-1">
                    <AnilloProgreso valor={(weekIdx + 1) / nTotalSemanas} color={brandColor}>{weekIdx + 1}/{nTotalSemanas}</AnilloProgreso>
                    <figcaption className="text-[11px] text-muted">Semana {weekIdx + 1} de {nTotalSemanas}</figcaption>
                    {plan.programName && <p className="text-[11px] text-muted/80 max-w-[8rem] truncate -mt-0.5">{plan.programName}</p>}
                  </figure>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>{todayTotal} ejercicios</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  <span>~{estimatedMin} min</span>
                </div>
              </div>

              {presupuestos.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted">¿Poco tiempo?</span>
                    {presupuestos.map(m => (
                      <button key={m} onClick={() => setPocoTiempo(pocoTiempo === m ? null : m)} aria-pressed={pocoTiempo === m}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${pocoTiempo === m ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
                        {m} min
                      </button>
                    ))}
                  </div>
                  {corta && (
                    <p role="status" className="mt-2 text-xs text-muted leading-relaxed">
                      En {pocoTiempo} min (unos {corta.minutos}): <span className="font-semibold text-ink">{corta.hacer.map(i => todaySession!.day.exercises[i].name).join(', ')}</span>.
                      {' '}Haz la sesión en orden y, cuando te quedes sin tiempo, termina con «Terminar igual»: tu entrenador verá qué has hecho.
                    </p>
                  )}
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
              <button ref={botonHero} onClick={() => setSession({ day: todaySession.day, dayKey: todaySession.dayKey })}
                style={{ minHeight: '52px' }}
                className="w-full flex items-center justify-center gap-3 bg-ink text-white rounded-2xl font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all">
                <Play className="w-5 h-5" />
                {todayComplete ? '¡Sesión completada! Repetir' :
                 todayDone > 0 ? `Continuar — ${todayTotal - todayDone} ejercicios restantes` :
                 'Empezar entrenamiento'}
              </button>
              {!todayComplete && (
                <button onClick={() => setQuickLogOpen(true)} className="w-full mt-2 py-2.5 text-sm font-semibold text-muted hover:text-ink underline-offset-2 hover:underline"
                  style={{ minHeight: '44px' }}>
                  ¿Ya lo hiciste? Regístralo sin repetirlo
                </button>
              )}
              {quickLogOpen && (
                <Suspense fallback={null}>
                  <QuickLogSheet open onClose={() => setQuickLogOpen(false)} day={todaySession.day} dayKey={todaySession.dayKey} logs={logs} onLogsChange={onLogsChange} />
                </Suspense>
              )}
            </div>
          </div>
        ) : (
          <div id="hoy-entreno" className="scroll-mt-4 bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-bg-alt rounded-full flex items-center justify-center mx-auto mb-3">
              <Dumbbell className="w-7 h-7 text-muted opacity-40" />
            </div>
            {empiezaEl ? (<>
              <h3 className="font-serif font-bold text-lg">Tu plan empieza el {empiezaEl}</h3>
              <p className="text-sm text-muted mt-1">Ya puedes ver lo que te espera en Entreno. Hasta entonces, nada que hacer aquí.</p>
            </>) : (<>
              <h3 className="font-serif font-bold text-lg">Día de descanso</h3>
              <p className="text-sm text-muted mt-1">{motivMsg || "Hoy toca descansar y recuperar. ¡Tu cuerpo lo necesita!"}</p>
            </>)}
          </div>
        )}

        {/* La cuenta atrás y «Para hoy» van DESPUÉS de la tarjeta: el entreno y su botón tienen que verse al abrir
            (encima, en un móvil bajito empujaban el botón fuera de la pantalla). */}
        <Suspense fallback={null}><FechaClaveHoy clientId={clientId} /></Suspense>

        <ParaHoy clientId={clientId} entreno={todaySession
          ? { titulo: todaySession.day.title, hechos: todayDone, total: todayTotal, completo: todayComplete }
          : null} />

        {/* Racha semanal — círculos dorados de lunes a domingo, sin ser punitiva */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h4 className="font-serif font-bold text-sm">Esta semana</h4>
          <div className="mb-4 min-h-[1.25rem]">
            {fraseSem && <p role="status" className={`text-xs font-semibold mt-0.5 ${TONO_CLASE[fraseSem.tono]}`}>{fraseSem.texto}</p>}
          </div>
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Flame className="w-4 h-4 text-warn" />, value: streak, label: 'Racha', frase: fraseRacha(streak) },
            { icon: <Target className="w-4 h-4 text-ok" />, value: adherencia !== null ? `${adherencia}%` : '—', label: 'Adherencia', frase: fraseAdherencia(adherencia) },
            { icon: <TrendingUp className="w-4 h-4 text-accent" />, value: fuerza ? `${fuerza.pct > 0 ? '+' : ''}${fuerza.pct}%` : '—', label: 'Fuerza',
              frase: (() => { const t = tendenciaFuerza(fuerza ? fuerza.pct : null); return { texto: `${t.flecha} ${t.texto}`, tono: t.tono } })() },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                {s.icon}
                <span className="text-xl font-serif font-bold">{s.value}</span>
              </div>
              <p className="text-[11px] text-muted uppercase tracking-wider">{s.label}</p>
              <p className={`text-xs font-semibold mt-1 ${TONO_CLASE[s.frase.tono]}`}>{s.frase.texto}</p>
            </div>
          ))}
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
