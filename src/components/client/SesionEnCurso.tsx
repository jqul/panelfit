import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronUp } from 'lucide-react'
import { DayPlan, TrainingLogs, TrainingPlan } from '../../types'
import { ActiveWorkout } from './ActiveWorkoutLazy'

// El entreno abierto vive aquí, por encima de las pestañas: al salir de él (atrás) no se cierra, se esconde y queda una
// barra encima de la navegación con el nombre, el tiempo y las series hechas; un toque y se vuelve. Seguir montado
// (solo oculto) es lo que hace que no se pierdan el cronómetro ni las series marcadas de un ejercicio a medias.

interface Ctx {
  /** Hay un entreno abierto (a la vista o en la barra). */
  abierta: boolean
  abrir: (day: DayPlan, dayKey: string) => void
}
const SesionCtx = createContext<Ctx | null>(null)
export const useSesionEnCurso = () => useContext(SesionCtx)

interface Sesion { day: DayPlan; dayKey: string; inicio: number }

const reloj = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function SesionEnCursoProvider({ plan, logs, onLogsChange, trainerId, children }: {
  plan: TrainingPlan | null
  logs: TrainingLogs
  onLogsChange: (logs: TrainingLogs) => void
  trainerId?: string
  children: ReactNode
}) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [minimizada, setMinimizada] = useState(false)
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 })
  const [terminar, setTerminar] = useState(0)
  const [ahora, setAhora] = useState(Date.now())

  // El tiempo de la barra corre solo mientras se ve
  useEffect(() => {
    if (!sesion || !minimizada) return
    setAhora(Date.now())
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [sesion, minimizada])

  // Hueco para la barra al final de las pestañas (ClientView lo suma a su margen inferior), para que no tape lo último
  useEffect(() => {
    document.documentElement.style.setProperty('--pf-barra-entreno', sesion && minimizada ? '64px' : '0px')
    return () => { document.documentElement.style.removeProperty('--pf-barra-entreno') }
  }, [sesion, minimizada])

  const abrir = (day: DayPlan, dayKey: string) => {
    setMinimizada(false)
    setSesion(s => s?.dayKey === dayKey ? s : { day, dayKey, inicio: Date.now() })
  }
  const cerrar = () => { setSesion(null); setMinimizada(false); setProgreso({ hechas: 0, total: 0 }) }

  return (
    <SesionCtx.Provider value={{ abierta: !!sesion, abrir }}>
      {children}
      {sesion && plan && createPortal(
        // En el body: dentro de <main> (z-10) la cabecera de la app (z-20) tapaba la del entreno
        <div hidden={minimizada}>
          <ActiveWorkout key={sesion.dayKey}
            day={sesion.day} dayKey={sesion.dayKey} plan={plan} logs={logs} onLogsChange={onLogsChange} trainerId={trainerId}
            inicio={sesion.inicio} pedirTerminar={terminar} onProgreso={setProgreso}
            onFinish={cerrar} onBack={() => setMinimizada(true)} />
        </div>,
        document.body
      )}
      {sesion && minimizada && (
        <div className="fixed left-0 right-0 z-30 px-3" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 6px)' }}>
          <div className="max-w-2xl mx-auto bg-ink text-white rounded-2xl shadow-xl flex items-center gap-2 pl-1 pr-2" role="region" aria-label="Entreno en curso">
            <button type="button" onClick={() => setMinimizada(false)} aria-label={`Volver al entreno: ${sesion.day.title}`}
              className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left rounded-xl active:scale-[0.98] transition-transform">
              <span className="w-2.5 h-2.5 rounded-full bg-ok flex-shrink-0 animate-pulse" aria-hidden />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold truncate">{sesion.day.title}</span>
                <span className="block text-xs text-white/70 tabular-nums">
                  {reloj(Math.max(0, Math.floor((ahora - sesion.inicio) / 1000)))} · {progreso.hechas}/{progreso.total} series
                </span>
              </span>
              <ChevronUp className="w-5 h-5 text-white/70 flex-shrink-0" aria-hidden />
            </button>
            <button type="button" onClick={() => { setMinimizada(false); setTerminar(n => n + 1) }}
              className="flex-shrink-0 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-semibold transition-colors">
              Terminar
            </button>
          </div>
        </div>
      )}
    </SesionCtx.Provider>
  )
}
