import { useMemo } from 'react'
import { Compass } from 'lucide-react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { estadoCalibracion, revisionCalibracion, filasConAviso, SENSACIONES } from '../../../lib/calibracion'
import { localDateKey } from '../../../lib/dates'
import { toast } from '../../shared/Toast'

const etiquetaSensacion = (id: string | null) => SENSACIONES.find(s => s.id === id)?.label ?? '—'
const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

// Primera semana guiada (lib/calibracion), lado del entrenador: cómo le resultó a un cliente nuevo cada ejercicio y su RIR frente al
// previsto, para revisar las cargas de partida. Al confirmarlas el cliente sale de la calibración y la progresión puede trabajar con
// sus datos. Solo sale mientras calibra y con algún entreno hecho.
export function CalibracionCard({ plan, logs, nombre, onPlanChange }: { plan?: TrainingPlan | null; logs: TrainingLogs; nombre: string; onPlanChange?: (p: TrainingPlan) => void }) {
  const estado = useMemo(() => estadoCalibracion(logs, plan, localDateKey()), [logs, plan])
  const filas = useMemo(() => revisionCalibracion(logs, plan), [logs, plan])
  if (!plan || !estado.activa || estado.sesionesHechas === 0 || !filas.length) return null
  const conAviso = filasConAviso(filas)

  const confirmar = () => {
    onPlanChange?.({ ...plan, calibracion: { confirmadaEl: localDateKey() } })
    toast('Cargas confirmadas ✓ La progresión ya puede usar estos datos', 'ok')
  }

  return (
    <section id="calibracion" aria-label="Primera semana de calibración" className="bg-card border border-accent/30 rounded-2xl overflow-hidden scroll-mt-4">
      <div className="px-5 py-3 bg-accent/5 border-b border-accent/20 flex items-center gap-2">
        <Compass className="w-4 h-4 text-accent" aria-hidden />
        <h3 className="text-sm font-bold flex-1">{estado.etiqueta}</h3>
        <span className="text-[11px] font-bold text-muted">{estado.sesionesHechas} {estado.sesionesHechas === 1 ? 'sesión' : 'sesiones'}</span>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-muted">{conAviso ? `Revisa las cargas de ${nombre}: ${conAviso} ${conAviso === 1 ? 'ejercicio llama' : 'ejercicios llaman'} la atención.` : `Sin nada raro en las cargas de ${nombre}. Aun así, mira cómo le han resultado antes de confirmar.`} Estos datos no cuentan como progreso hasta que las confirmes.</p>
        <ul className="divide-y divide-border/50" aria-label="Ejercicios de la primera semana">
          {filas.map(f => (
            <li key={f.ejercicio} className="py-2.5">
              <p className="text-sm font-semibold">{f.ejercicio} <span className="text-[11px] font-normal text-muted">· le resultó: {etiquetaSensacion(f.sensacion)}{f.rirMedio !== null ? ` · RIR medio ${num(f.rirMedio)}` : ''}</span></p>
              {f.avisos.map(a => <p key={a} className="text-xs text-warn font-medium">{a}</p>)}
            </li>
          ))}
        </ul>
        <button type="button" onClick={confirmar} className="px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold">Confirmar cargas y pasar a progresión normal</button>
      </div>
    </section>
  )
}
