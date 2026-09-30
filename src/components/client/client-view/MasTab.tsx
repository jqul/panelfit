import { MessageSquare } from 'lucide-react'
import { TrainingPlan } from '../../../types'
import { ClienteRow } from '../../../lib/supabase-types'
import { ThemeToggle } from '../../shared/ThemeToggle'
import { PushToggle } from '../../shared/PushToggle'
import { CicloWidget } from '../CicloWidget'
import { ReferralWidget } from '../ReferralWidget'

export function MasTab({ client, plan, onLogout }: { client: ClienteRow; plan: TrainingPlan | null; onLogout: () => void }) {
  const trainerPhone = localStorage.getItem(`pf_trainer_phone_${client.trainerId}`) || ''
  const waUrl = trainerPhone
    ? `https://wa.me/${trainerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy ${client.name}. Te escribo desde mi panel de PanelFit.`)}`
    : `https://wa.me/?text=${encodeURIComponent(`Hola, soy ${client.name}. Te escribo desde mi panel de PanelFit.`)}`

  return (
    <div className="px-4 py-6 space-y-4 max-w-xl mx-auto pb-24">
      <h3 className="font-serif font-bold text-xl">Más opciones</h3>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu entrenador</p>
        </div>
        <div className="p-4">
          <a href={waUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl"
            style={{ minHeight: '56px' }}>
            <MessageSquare className="w-5 h-5 text-[#25D366] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Contactar por WhatsApp</p>
              <p className="text-xs text-muted">Abre WhatsApp con mensaje preparado</p>
            </div>
          </a>
        </div>
      </div>

      {plan && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu programa</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Tipo</span><span className="font-semibold capitalize">{plan.type}</span></div>
            <div className="flex justify-between"><span className="text-muted">Semanas</span><span className="font-semibold">{plan.weeks?.length || 0}</span></div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu cuenta</p>
        <p className="text-sm"><span className="text-muted">Nombre:</span> <span className="font-semibold">{client.name} {client.surname}</span></p>
      </div>

      {/* Tema */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Modo oscuro</p>
          <p className="text-xs text-muted">Cambia la apariencia de tu panel</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Notificaciones push */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Notificaciones</p>
          <p className="text-xs text-muted">Avisos de tu entrenador en este dispositivo</p>
        </div>
        <PushToggle clientId={client.id} />
      </div>

      {/* Ciclo menstrual (opcional) */}
      <CicloWidget clientId={client.id} trainerId={client.trainerId} />

      {/* Programa de referidos */}
      <ReferralWidget trainerId={client.trainerId} token={client.token} />

      {/* Cerrar sesión */}
      <button onClick={onLogout}
        className="w-full py-3 border border-border rounded-2xl text-sm font-medium text-muted hover:bg-bg-alt transition-colors">
        Cerrar sesión
      </button>
    </div>
  )
}
