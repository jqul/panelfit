import { contextoCliente, type ClienteContexto } from '../../lib/contextoCliente'
import { LabelPill, type TrainerLabel } from './labels'

// Objetivo + etiquetas del cliente junto a su nombre en «Hoy» (lib/contextoCliente): contexto rápido, no una pantalla de filtros.
// No pinta nada si el cliente no tiene ni objetivo ni etiquetas.
export function ContextoCliente({ client, labels }: { client: ClienteContexto; labels: TrainerLabel[] }) {
  const { objetivo, etiquetas, resto } = contextoCliente(client, labels)
  if (!objetivo && !etiquetas.length) return null
  return (
    <>
      {objetivo && <span className="text-[11px] text-muted truncate max-w-[14rem]" title={`Objetivo: ${objetivo}`}>🎯 {objetivo}</span>}
      {etiquetas.map(l => <LabelPill key={l.id} label={l} small />)}
      {resto > 0 && <span className="text-[11px] text-muted" title={`${resto} etiqueta${resto > 1 ? 's' : ''} más`}>+{resto}</span>}
    </>
  )
}
