// Tipos y componentes de etiquetas compartidos entre TemplatesTab, ProgramasTab y EncuestasTab
import { X, Check } from 'lucide-react'

export interface TrainerLabel {
  id: string
  trainer_id: string
  name: string
  color: string
  emoji: string
  survey_template_id: string | null
  created_at: number
}

export function LabelPill({ label, onRemove, small }: { label: TrainerLabel; onRemove?: () => void; small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border ${small ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}
      style={{ backgroundColor: label.color + '18', borderColor: label.color + '40', color: label.color }}>
      <span>{label.emoji}</span>
      <span>{label.name}</span>
      {onRemove && <button onClick={onRemove} className="ml-0.5 hover:opacity-70"><X className="w-2.5 h-2.5" /></button>}
    </span>
  )
}

export function LabelSelector({ labels, selected, onChange }: {
  labels: TrainerLabel[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (!labels.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map(label => {
        const active = selected.includes(label.id)
        return (
          <button key={label.id}
            onClick={() => onChange(active ? selected.filter(id => id !== label.id) : [...selected, label.id])}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
            style={{ backgroundColor: active ? label.color + '18' : 'transparent', borderColor: label.color + '60', color: label.color }}>
            <span>{label.emoji}</span>
            <span>{label.name}</span>
            {active && <Check className="w-2.5 h-2.5" />}
          </button>
        )
      })}
    </div>
  )
}
