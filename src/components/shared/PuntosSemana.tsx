import type { DiaCumplimiento, NivelCumplimiento } from '../../lib/cumplimiento'
import { ETIQUETA_NIVEL } from '../../lib/cumplimiento'

// Mismos colores en la lista de clientes y en el calendario del cliente.
export const COLOR_NIVEL: Record<NivelCumplimiento, string> = {
  completo: 'bg-ok',
  parcial: 'bg-attn/50',
  bajo: 'bg-attn',
  fallado: 'bg-warn',
  ausente: 'bg-accent2/40',
  libre: 'bg-bg-alt border border-border',
}

const fmt = (fecha: string) => new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })

/** Siete puntos, uno por día (el último es hoy), coloreados por cumplimiento. */
export function PuntosSemana({ dias }: { dias: DiaCumplimiento[] }) {
  const resumen = dias.map(d => `${fmt(d.fecha)}: ${ETIQUETA_NIVEL[d.nivel]}${d.previstos ? ` (${d.hechos}/${d.previstos})` : ''}`).join(' · ')
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Últimos 7 días — ${resumen}`} title={resumen}>
      {dias.map(d => <span key={d.fecha} className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLOR_NIVEL[d.nivel]}`} />)}
    </span>
  )
}
