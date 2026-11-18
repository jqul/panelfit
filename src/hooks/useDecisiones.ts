import { useCallback, useEffect, useState } from 'react'
import { listarDecisiones, crearDecision, revisarDecision } from '../lib/decisionesEntrenador'
import { decisionDesdeBorrador, type BorradorDecision, type Decision } from '../lib/diarioDecisiones'
import { localDateKey } from '../lib/dates'

// Las decisiones anotadas de un cliente, con alta y revisión. (lib/diarioDecisiones: la lógica; lib/decisionesEntrenador: Supabase.)
export function useDecisiones(clientId: string, trainerId?: string) {
  const [decisiones, setDecisiones] = useState<Decision[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    listarDecisiones(clientId).then(ds => { if (vivo) { setDecisiones(ds); setCargando(false) } })
    return () => { vivo = false }
  }, [clientId])

  const anadir = useCallback(async (b: BorradorDecision): Promise<boolean> => {
    if (!trainerId) return false
    const creada = await crearDecision(trainerId, clientId, decisionDesdeBorrador(b, localDateKey()))
    if (creada) setDecisiones(ds => [creada, ...ds])
    return !!creada
  }, [clientId, trainerId])

  const revisar = useCallback(async (id: string, resultado: string): Promise<boolean> => {
    const ok = await revisarDecision(clientId, id, resultado)
    if (ok) setDecisiones(ds => ds.map(d => d.id === id ? { ...d, revisada_el: localDateKey(), resultado: resultado.trim() || null } : d))
    return ok
  }, [clientId])

  return { decisiones, cargando, anadir, revisar }
}
