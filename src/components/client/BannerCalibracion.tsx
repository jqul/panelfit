import { useMemo } from 'react'
import { Compass } from 'lucide-react'
import type { TrainingLogs, TrainingPlan } from '../../types'
import { estadoCalibracion } from '../../lib/calibracion'
import { localDateKey } from '../../lib/dates'

// Primera semana guiada (lib/calibracion): se ve en Hoy mientras el entrenador ajusta las cargas de partida. Dice que no hace falta
// «hacerlo bien»: apuntar con honradez cuánto costó cada serie es lo que sirve. Desaparece cuando el entrenador confirma las cargas.
export function BannerCalibracion({ plan, logs }: { plan: TrainingPlan; logs: TrainingLogs }) {
  const estado = useMemo(() => estadoCalibracion(logs, plan, localDateKey()), [logs, plan])
  if (!estado.activa) return null
  return (
    <section aria-label="Primera semana" className="mx-4 mt-4 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
        <Compass className="w-3.5 h-3.5" aria-hidden /> {estado.etiqueta}
      </p>
      <p className="text-sm mt-1.5">Esta semana sirve para ajustar tus pesos: no hace falta que te midas. Apunta con honradez cuánto te cuesta cada serie y tu entrenador afinará las cargas.</p>
    </section>
  )
}
