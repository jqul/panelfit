import { CheckCircle2, Circle, ClipboardList } from 'lucide-react'
import { ClientData, TrainingPlan } from '../../../types'

interface Props {
  client: ClientData
  plan?: TrainingPlan | null
  totalSessions: number
}

// Qué falta para que un cliente nuevo quede listo de verdad — se deriva de
// datos que ya existen (nada que guardar aparte), y la tarjeta desaparece
// sola en cuanto todo está hecho, para no quedarse como ruido permanente en
// la ficha de un cliente que ya lleva meses.
export function OnboardingChecklist({ client, plan, totalSessions }: Props) {
  const hasExercises = !!plan?.weeks?.some(w => w.days.some(d => d.exercises.length > 0))
  const steps = [
    { done: !!client.phone, label: 'WhatsApp guardado', hint: 'Para enviarle mensajes y recordatorios' },
    { done: hasExercises, label: 'Plan de entreno asignado' },
    { done: !!client.main_goal, label: 'Objetivo principal definido' },
    { done: !!plan?.macros?.kcal, label: 'Dieta configurada' },
    { done: totalSessions > 0, label: 'Ha hecho su primera sesión' },
  ]
  const doneCount = steps.filter(s => s.done).length
  if (doneCount === steps.length) return null

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border/50">
        <ClipboardList className="w-4 h-4 text-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Poniendo a {client.name} en marcha</p>
          <p className="text-xs text-muted">{doneCount}/{steps.length} pasos completados</p>
        </div>
      </div>
      <div className="divide-y divide-border/40">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
            {s.done
              ? <CheckCircle2 className="w-4 h-4 text-ok flex-shrink-0" />
              : <Circle className="w-4 h-4 text-muted/40 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${s.done ? 'text-muted line-through' : 'font-medium'}`}>{s.label}</p>
              {!s.done && s.hint && <p className="text-[11px] text-muted mt-0.5">{s.hint}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
