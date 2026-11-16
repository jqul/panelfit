import { useMemo } from 'react'
import { kg } from '../../../lib/formatoKg'
import { Award } from 'lucide-react'
import { ClientData, TrainingPlan, TrainingLogs } from '../../../types'
import { estimate1RM } from '../../../lib/strength'
import { matchLiftKey, getStrengthStandard, puntuacionFuerza, equilibrioFuerza, LEVEL_LABELS, LIFT_LABELS, LiftKey } from '../../../lib/strengthStandards'
import { getExName, EmptyState } from './helpers'

export function StrengthStandardsChart({ client, logs, plan }: { client: ClientData; logs: TrainingLogs; plan?: TrainingPlan | null }) {
  const results = useMemo(() => {
    const bestByLift: Record<LiftKey, number> = { squat: 0, bench: 0, deadlift: 0, press: 0 }
    Object.entries(logs).forEach(([key, log]) => {
      if (!log.done) return
      const name = getExName(key, plan, log)
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
      .map(lift => ({ lift, oneRM: Math.round(bestByLift[lift] * 10) / 10, standard: getStrengthStandard(lift, bestByLift[lift], bodyweight, sex), nota: puntuacionFuerza(lift, bestByLift[lift], bodyweight, sex) }))
      .filter(r => r.standard)
  }, [logs, plan, client.genero, client.weight])

  if (!client.weight) return <EmptyState icon={<Award className="w-8 h-8 opacity-30" />} text="Falta el peso corporal del cliente" sub="Añádelo en la pestaña Perfil para calcular el nivel de fuerza" />
  if (!results.length) return <EmptyState icon={<Award className="w-8 h-8 opacity-30" />} text="Sin datos de sentadilla, press banca, peso muerto o press militar" sub="Se calcula automáticamente al registrar estos ejercicios" />

  // Nota de 0 a 100 por levantamiento y global, y si uno va muy por detrás (lib/strengthStandards)
  const eq = equilibrioFuerza(Object.fromEntries(results.filter(r => r.nota !== null).map(r => [r.lift, r.nota!])))

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Estimación orientativa según el ratio 1RM/peso corporal — no es una referencia médica.</p>
      {eq && (
        <section aria-label="Nivel de fuerza" className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-semibold">Nivel de fuerza</p>
            <p className="text-2xl font-serif font-bold tabular-nums">{eq.global}<span className="text-sm text-muted font-sans">/100</span></p>
          </div>
          <ul className="space-y-1.5" aria-label="Nota por levantamiento">
            {results.filter(r => r.nota !== null).map(r => (
              <li key={r.lift} className="text-xs">
                <div className="flex justify-between mb-0.5"><span>{LIFT_LABELS[r.lift]}</span><span className="tabular-nums font-semibold">{r.nota}</span></div>
                <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${r.nota}%` }} /></div>
              </li>
            ))}
          </ul>
          {eq.flojo && eq.fuerte && (
            <p className="text-xs text-warn">⚖️ {LIFT_LABELS[eq.flojo]} va {eq.diferencia} puntos por detrás de {LIFT_LABELS[eq.fuerte].toLowerCase()}: dale prioridad en el próximo bloque.</p>
          )}
        </section>
      )}
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
                <p className="text-[11px] text-muted mt-1">
                  Te faltan ~{kg(standard.kgToNext)}kg de 1RM para llegar a <span className="font-semibold capitalize">{standard.nextLevel}</span>
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
