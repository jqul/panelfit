import { TIPOS_SERIE, type TipoSerie } from '../../../lib/tipoSerie'

// Chips para marcar el tipo de una serie (normal, calentamiento, dropset, al fallo). Lo usan la lista y el modo foco.
export function SelectorTipoSerie({ value, onChange, grande = false }: { value?: TipoSerie; onChange: (t: TipoSerie | undefined) => void; grande?: boolean }) {
  const chip = (activo: boolean) => `${grande ? 'px-3 py-2 text-sm' : 'px-2.5 py-1.5 text-xs'} rounded-lg font-semibold transition-colors ${
    activo ? 'bg-ink text-white' : 'bg-bg-alt text-muted hover:text-ink'
  }`
  return (
    <div className={`flex gap-1 flex-wrap ${grande ? 'justify-center' : ''}`} role="radiogroup" aria-label="Tipo de serie">
      <button type="button" role="radio" aria-checked={!value} onClick={() => onChange(undefined)} className={chip(!value)}>Normal</button>
      {TIPOS_SERIE.map(t => (
        <button key={t.id} type="button" role="radio" aria-checked={value === t.id} title={t.desc}
          onClick={() => onChange(value === t.id ? undefined : t.id)} className={chip(value === t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
