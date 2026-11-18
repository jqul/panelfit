import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateKey } from '../lib/dates'
import { fetchClientPain } from '../lib/clientPain'
import { DEMO_READINESS_MAP } from '../lib/demo-data'
import { algunaBaja } from '../lib/checkinConfig'

// Lo que la lista de comprobación de estancamiento necesita de fuera de los registros de entreno: check-ins y molestias de las
// últimas 2 semanas. El peso lo da useClientWeights (lib/clientWeight).
type Fila = { sleep: number | null; soreness: number | null; motivation: number | null }
export interface ContextoRecuperacion { checkins: number; checkinsBajos: number; molestiasArticulares: number }
const VACIO: ContextoRecuperacion = { checkins: 0, checkinsBajos: 0, molestiasArticulares: 0 }

export function useContextoEstancamiento(clientId: string): { recuperacion: ContextoRecuperacion; cargando: boolean } {
  const [estado, setEstado] = useState<{ recuperacion: ContextoRecuperacion; cargando: boolean }>({ recuperacion: VACIO, cargando: true })

  useEffect(() => {
    let vivo = true
    const hace = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateKey(d) }
    const desde = hace(14)
    const demo = clientId.startsWith('demo-client-')
    const filas: Promise<Fila[]> = demo
      ? Promise.resolve((DEMO_READINESS_MAP[clientId] || []).filter(r => r.date >= desde))
      : Promise.resolve(supabase.from('readiness_checkins').select('sleep, soreness, motivation').eq('clientId', clientId).gte('date', desde))
          .then(({ data }) => (data || []) as Fila[])
    Promise.all([filas, fetchClientPain(clientId)]).then(([cs, dolor]) => {
      if (!vivo) return
      setEstado({
        cargando: false,
        recuperacion: {
          checkins: cs.length,
          checkinsBajos: cs.filter(c => algunaBaja(c.sleep, c.soreness, c.motivation)).length,
          // Solo la molestia articular de verdad: las agujetas (doms) y lo leve no son una señal de recuperación
          molestiasArticulares: dolor.filter(p => p.date >= desde && p.tipo !== 'doms' && p.intensidad >= 4).length,
        },
      })
    })
    return () => { vivo = false }
  }, [clientId])

  return estado
}
