import { Moon } from 'lucide-react'
import { useCicloTracking, getCyclePhase, PHASE_INFO } from '../../../lib/cyclePhase'
import { EmptyState } from './helpers'

export function CicloCard({ clientId }: { clientId: string }) {
  const { ciclo, loading } = useCicloTracking(clientId)

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!ciclo?.activo || !ciclo.ultima_regla) {
    return <EmptyState icon={<Moon className="w-8 h-8 opacity-30" />} text="Seguimiento no activado" sub="La clienta puede activarlo desde su panel, en Más → Seguimiento de ciclo" />
  }

  const { day, phase } = getCyclePhase(ciclo.ultima_regla, ciclo.duracion_ciclo)
  const info = PHASE_INFO[phase]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl p-4 space-y-1.5" style={{ backgroundColor: `${info.color}15` }}>
        <p className="text-sm font-bold" style={{ color: info.color }}>Día {day} de {ciclo.duracion_ciclo} · Fase {info.label}</p>
        <p className="text-xs text-muted leading-relaxed">{info.guidance}</p>
      </div>
      <p className="text-[10px] text-muted">Estimación orientativa basada en la fecha de última regla que registró la clienta — no sustituye su criterio del día a día.</p>
    </div>
  )
}
