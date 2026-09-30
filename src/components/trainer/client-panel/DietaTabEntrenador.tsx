import { TrainingPlan, ClientData } from '../../../types'
import { DietEditor } from '../../shared/DietEditor'

export function DietaTabEntrenador({ clientId, plan, onChange, trainerId }: { clientId: string; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void; client: ClientData; trainerId: string }) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <DietEditor clientId={clientId} isTrainer={true} trainerId={trainerId}
        syncedMacros={{ kcal: plan?.macros?.kcal || 0, protein: plan?.macros?.protein || 0, carbs: plan?.macros?.carbs || 0, fats: plan?.macros?.fats || 0 }}
        onMacrosChange={m => { if (!plan) return; onChange({ ...plan, macros: m }) }} />
    </div>
  )
}
