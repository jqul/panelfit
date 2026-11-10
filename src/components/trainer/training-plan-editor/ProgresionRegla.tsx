import { MODOS_PROGRESION, PASOS, TIPOS_PROGRESION, type ReglaProgresion, type TipoProgresion } from '../../../lib/progresionAuto'

const chip = (on: boolean) => `px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${on ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border/60 text-muted hover:border-accent/40 hover:text-accent'}`

// Los mandos de una regla de progresión (lib/progresionAuto): qué regla, cuánto sube cada vez y quién la ve. Se usa
// para la regla del plan (Pestaña Plan) y para la de cada ejercicio (opciones del ejercicio en el editor). Con
// `heredada`, la primera opción es "como el plan" (sin regla propia).
export function ProgresionRegla({ regla, onChange, heredada, nombre }: {
  regla?: ReglaProgresion
  onChange: (r: ReglaProgresion | null) => void
  heredada?: string     // texto de la regla del plan, si este es un ejercicio
  nombre: string        // para las etiquetas accesibles
}) {
  const tipo: TipoProgresion | 'plan' = regla ? regla.tipo : heredada !== undefined ? 'plan' : 'no'
  const activa = regla && regla.tipo !== 'no'
  return (
    <div className="space-y-2.5">
      <div role="radiogroup" aria-label={`Regla de progresión de ${nombre}`} className="flex flex-wrap gap-1.5">
        {heredada !== undefined && (
          <button type="button" role="radio" aria-checked={tipo === 'plan'} onClick={() => onChange(null)} className={chip(tipo === 'plan')}>
            Como el plan <span className="font-normal">({heredada})</span>
          </button>
        )}
        {TIPOS_PROGRESION.map(t => (
          <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} title={t.detalle}
            onClick={() => onChange({ ...(regla || {}), tipo: t.id })} className={chip(tipo === t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {activa && (<>
        <label className="flex items-center gap-2 text-xs text-muted">
          Sube de
          <select value={regla!.paso ?? 0} onChange={e => onChange({ ...regla!, paso: Number(e.target.value) || undefined })}
            aria-label={`Cuánto sube cada vez ${nombre}`}
            className="text-xs bg-bg border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-accent/20">
            <option value={0}>2,5 kg (1 kg si pesa menos de 40)</option>
            {PASOS.map(p => <option key={p} value={p}>{p.toLocaleString('es-ES')} kg</option>)}
          </select>
          cada vez
        </label>
        <div role="radiogroup" aria-label={`Quién ve la progresión de ${nombre}`} className="flex flex-wrap gap-1.5">
          {MODOS_PROGRESION.map(m => (
            <button key={m.id} type="button" role="radio" aria-checked={(regla!.modo ?? 'sugerencia') === m.id} title={m.detalle}
              onClick={() => onChange({ ...regla!, modo: m.id })} className={chip((regla!.modo ?? 'sugerencia') === m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted leading-snug">
          {TIPOS_PROGRESION.find(t => t.id === regla!.tipo)?.detalle}. {MODOS_PROGRESION.find(m => m.id === (regla!.modo ?? 'sugerencia'))?.detalle}.
          {' '}Si le cuesta más de lo previsto, mantiene; si no llega a las reps, baja.
        </p>
      </>)}
    </div>
  )
}

/** Texto corto de una regla: "Doble · sugerencia". */
export function resumenRegla(r?: ReglaProgresion | null): string {
  if (!r || r.tipo === 'no') return 'sin progresión'
  const t = TIPOS_PROGRESION.find(x => x.id === r.tipo)?.label ?? r.tipo
  const m = MODOS_PROGRESION.find(x => x.id === (r.modo ?? 'sugerencia'))?.label.toLowerCase()
  return `${t.toLowerCase()} · ${m}`
}
