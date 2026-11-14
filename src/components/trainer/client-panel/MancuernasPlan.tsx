import type { TrainingPlan } from '../../../types'
import { ejerciciosConMancuernas, type PesoMancuernas } from '../../../lib/pesoMancuerna'

// Pestaña Plan → cómo apunta el cliente el peso con mancuernas en este plan: el total o el de una (lib/pesoMancuerna).
// Solo sale si el plan tiene ejercicios con mancuernas que no lo fijan por su cuenta. El cliente ve el ejemplo al entrenar.
export function MancuernasPlan({ plan, onPlanChange }: { plan: TrainingPlan; onPlanChange: (p: TrainingPlan) => void }) {
  const n = ejerciciosConMancuernas(plan)
  if (!n) return null
  const actual: PesoMancuernas = plan.pesoMancuernas === 'por_mancuerna' ? 'por_mancuerna' : 'total'
  const opciones: [PesoMancuernas, string, string][] = [
    ['total', 'El total', 'dos de 20 kg → 40'],
    ['por_mancuerna', 'Una mancuerna', 'dos de 20 kg → 20'],
  ]
  return (
    <section aria-label="Peso con mancuernas" className="flex-shrink-0 mb-3 px-4 py-3 bg-card border border-border rounded-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-sm font-semibold flex-1 min-w-[12rem]">
          ⚖️ Con mancuernas, el cliente apunta…
          <span className="block text-[11px] text-muted font-normal">{n} ejercicio{n === 1 ? '' : 's'} con mancuernas en este plan. Puedes cambiarlo en cada uno.</span>
        </p>
        <div role="radiogroup" aria-label="Con mancuernas se apunta" className="flex gap-1.5">
          {opciones.map(([v, label, ej]) => (
            <button key={v} type="button" role="radio" aria-checked={actual === v} onClick={() => onPlanChange({ ...plan, pesoMancuernas: v })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border text-left ${actual === v ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:text-ink'}`}>
              {label}<span className={`block text-[11px] font-normal ${actual === v ? 'opacity-70' : ''}`}>{ej}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
