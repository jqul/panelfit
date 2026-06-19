import { TrainingPlan } from '../../../types'

export function NotasTab({ plan, onChange }: { plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  if (!plan) return null
  const TAGS = ['⚠️ Lesión', '🔥 Alta intensidad', '🐢 Progreso lento', '⭐ Cliente VIP', '📞 Llamar esta semana']
  return (
    <div className="max-w-lg space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Notas privadas</h3><p className="text-xs text-muted">Solo las ves tú.</p></div>
      <textarea rows={10} value={plan.coachNotes || ''} onChange={e => onChange({ ...plan, coachNotes: e.target.value })}
        placeholder="Ej: Cuidado con la rodilla izquierda..."
        className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
      <div className="flex flex-wrap gap-2">
        {TAGS.map(tag => (
          <button key={tag} onClick={() => onChange({ ...plan, coachNotes: (plan.coachNotes || '') + '\n[' + tag + '] ' })}
            className="px-3 py-1.5 text-xs border border-border rounded-lg hover:border-accent hover:text-accent transition-colors">{tag}</button>
        ))}
      </div>
    </div>
  )
}
