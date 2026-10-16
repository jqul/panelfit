import { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp, Star, StickyNote, Settings } from 'lucide-react'
import { ClientData, TrainingPlan } from '../../../types'
import { ValoracionTab } from './ValoracionTab'
import { NotasTab } from './NotasTab'
import { ConfigTab } from './ConfigTab'

// Información de gestión del cliente (valoración, notas privadas, acceso y
// automatizaciones): importante pero secundaria frente a Plan/Entrenos/Progreso,
// así que vive colapsada al final del Resumen en vez de ocupar tres pestañas.
// El contenido solo se monta al abrir cada sección.
function Section({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 text-left hover:bg-bg-alt/30 transition-colors">
        <span className="text-accent flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">{title}</p>
          {hint && <p className="text-xs text-muted truncate">{hint}</p>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 pt-4 border-t border-border/50">{children}</div>}
    </div>
  )
}

export function FichaSections({ client, plan, onPlanChange, trainerId }: {
  client: ClientData
  plan?: TrainingPlan | null
  onPlanChange?: (p: TrainingPlan) => void
  trainerId?: string
}) {
  const hasNotes = !!plan?.coachNotes?.trim()
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">Más sobre {client.name}</p>
      {trainerId && (
        <Section icon={<Star className="w-4 h-4" />} title="Valoración" hint="Ficha de valoración inicial y revisiones">
          <ValoracionTab client={client} trainerId={trainerId} />
        </Section>
      )}
      {plan && onPlanChange && (
        <>
          <Section icon={<StickyNote className="w-4 h-4" />} title="Notas privadas" hint={hasNotes ? 'Tienes notas guardadas' : 'Solo las ves tú'}>
            <NotasTab plan={plan} onChange={onPlanChange} />
          </Section>
          <Section icon={<Settings className="w-4 h-4" />} title="Configuración" hint="Acceso del cliente y automatizaciones">
            <ConfigTab client={client} plan={plan} onChange={onPlanChange} trainerId={trainerId} />
          </Section>
        </>
      )}
    </div>
  )
}
