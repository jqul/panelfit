import { useMemo } from 'react'
import { Award } from 'lucide-react'
import { ClientData, TrainingPlan, TrainingLogs } from '../../../types'
import { estimate1RM } from '../../../lib/strength'
import { matchLiftKey, getStrengthStandard, LEVEL_LABELS, LIFT_LABELS, LiftKey } from '../../../lib/strengthStandards'
import { getExName, EmptyState } from './helpers'

export function StrengthStandardsChart({ client, logs, plan }: { client: ClientData; logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const results = useMemo(() => {
    const bestByLift: Record<LiftKey, number> = { squat: 0, bench: 0, deadlift: 0 }
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan)
      if (!name) return
      const lift = matchLiftKey(name)
      if (!lift) return
      Object.values(log.sets || {}).forEach(s => {
        const rm = estimate1RM(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0)
        if (rm > bestByLift[lift]) bestByLift[lift] = rm
      })
    })

    // En el resto de la app 'h'=hombre, 'm'=mujer; aquí usamos la convención 'm'|'f' (male/female)
    const sex: 'm' | 'f' = client.genero === 'h' ? 'm' : 'f'
    const bodyweight = client.weight

    return (Object.keys(bestByLift) as LiftKey[])
      .filter(lift => bestByLift[lift] > 0)
      .map(lift => ({ lift, oneRM: Math.round(bestByLift[lift] * 10) / 10, standard: getStrengthStandard(lift, bestByLift[lift], bodyweight, sex) }))
      .filter(r => r.standard)
  }, [logs, plan, client.genero, client.weight])

  if (!client.weight) return <EmptyState icon={<Award className="w-8 h-8 opacity-30" />} text="Falta el peso corporal del cliente" sub="Añádelo en la pestaña Perfil para calcular el nivel de fuerza" />
  if (!results.length) return <EmptyState icon={<Award className="w-8 h-8 opacity-30" />} text="Sin datos de sentadilla, press banca o peso muerto" sub="Se calcula automáticamente al registrar estos ejercicios" />

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Estimación orientativa según el ratio 1RM/peso corporal — no es una referencia médica.</p>
      {results.map(({ lift, oneRM, standard }) => {
        if (!standard) return null
        const meta = LEVEL_LABELS[standard.level]
        return (
          <div key={lift} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold">{LIFT_LABELS[lift]}</p>
                <p className="text-xs text-muted">1RM est. {oneRM}kg · ratio {standard.ratio}×BW</p>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold capitalize"
                style={{ backgroundColor: meta.color + '15', color: meta.color }}>
                {meta.emoji} {standard.level}
              </span>
            </div>
            {standard.nextLevel && (
              <div>
                <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${standard.progressToNext * 100}%`, backgroundColor: meta.color }} />
                </div>
                <p className="text-[10px] text-muted mt-1">
                  Te faltan ~{standard.kgToNext}kg de 1RM para llegar a <span className="font-semibold capitalize">{standard.nextLevel}</span>
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
