import { useMemo } from 'react'
import type { TrainingLogs } from '../../types'
import { ultimos7Dias } from '../../lib/cumplimiento'
import { PuntosSemana } from '../shared/PuntosSemana'

// Se carga aparte (lazy) desde la lista de clientes: el cálculo y los textos del cumplimiento no entran en la
// carga inicial del panel. Recibe el plan y los registros que la lista ya tiene en memoria.
export function PuntosSemanaCliente({ plan, logs }: { plan: any; logs: TrainingLogs }) {
  const dias = useMemo(() => ultimos7Dias(plan, logs), [plan, logs])
  return <PuntosSemana dias={dias} />
}
