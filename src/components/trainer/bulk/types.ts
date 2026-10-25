import type { ClientWithStats } from '../../../hooks/useTrainerClients'

/** Lo común de las hojas de acción masiva: a quién afectan y cómo avisar de que algo cambió. */
export interface SheetProps {
  trainerId: string
  /** Los clientes seleccionados (ya filtrados a lo que se ve). */
  clients: ClientWithStats[]
  onClose: () => void
  /** Algo se escribió en la base de datos: hay que recargar la lista de clientes. */
  onChanged: () => void
}
