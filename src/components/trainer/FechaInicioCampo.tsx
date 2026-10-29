import { localDateKey } from '../../lib/dates'
import { lunesDe, sumarDias } from '../../lib/fechasPlan'

// "¿Cuándo empieza?" al asignar un plan o un programa: hoy, el lunes que viene o el día que se elija. Las semanas
// del plan van de lunes a domingo, así que empezar un lunes es lo más limpio; antes de esa fecha el cliente ve
// "Tu plan empieza el…" en vez de una sesión.
export const lunesQueViene = (hoy = localDateKey()) => sumarDias(lunesDe(hoy), 7)

export function FechaInicioCampo({ value, onChange }: { value: string; onChange: (fecha: string) => void }) {
  const hoy = localDateKey()
  const lunes = lunesQueViene(hoy)
  const chip = (activo: boolean) => `px-3 min-h-[36px] rounded-full text-xs font-semibold border transition-all ${activo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink hover:text-ink'}`
  return (
    <fieldset className="flex items-center gap-2 flex-wrap">
      <legend className="sr-only">Empieza</legend>
      <span className="text-xs font-semibold text-muted" aria-hidden>Empieza</span>
      <button type="button" onClick={() => onChange(hoy)} aria-pressed={value === hoy} className={chip(value === hoy)}>Hoy</button>
      <button type="button" onClick={() => onChange(lunes)} aria-pressed={value === lunes} className={chip(value === lunes)}>El lunes que viene</button>
      <input type="date" value={value} min={hoy} aria-label="Fecha de inicio"
        onChange={e => e.target.value && onChange(e.target.value < hoy ? hoy : e.target.value)}
        className="px-2.5 min-h-[36px] bg-card border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-accent/20" />
    </fieldset>
  )
}
