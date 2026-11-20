import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateKey } from '../lib/dates'
import { fetchClientPain } from '../lib/clientPain'
import { DEMO_READINESS_MAP } from '../lib/demo-data'
import type { EntradaDescarga } from '../lib/evidenciaDescarga'

// Lo que la lectura «¿Puede tocar descarga?» necesita además de los registros de entreno y el plan: check-ins, molestias y ausencias de
// las últimas semanas. Las decisiones las trae useDecisiones. Si una consulta falla, esa parte queda vacía y la lectura lo dice como
// «datos insuficientes»: nunca se inventa.
type Contexto = Pick<EntradaDescarga, 'checkins' | 'dolor' | 'ausencias'>
const VACIO: Contexto = { checkins: [], dolor: [], ausencias: [] }

export function useContextoDescarga(clientId: string): { contexto: Contexto; cargando: boolean } {
  const [estado, setEstado] = useState<{ contexto: Contexto; cargando: boolean }>({ contexto: VACIO, cargando: true })

  useEffect(() => {
    let vivo = true
    setEstado({ contexto: VACIO, cargando: true })
    const hace = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateKey(d) }
    const demo = clientId.startsWith('demo-client-')
    const checkins: Promise<Contexto['checkins']> = demo
      ? Promise.resolve((DEMO_READINESS_MAP[clientId] || []).filter(r => r.date >= hace(21)))
      : Promise.resolve(supabase.from('readiness_checkins').select('date, sleep, soreness, motivation').eq('clientId', clientId).gte('date', hace(21)))
          .then(({ data }) => (data || []) as Contexto['checkins'])
    const ausencias: Promise<Contexto['ausencias']> = demo
      ? Promise.resolve([])
      : Promise.resolve(supabase.from('ausencias').select('desde, hasta').eq('client_id', clientId).gte('hasta', hace(60)))
          .then(({ data }) => (data || []) as Contexto['ausencias'])
    Promise.all([checkins, fetchClientPain(clientId), ausencias]).then(([cs, dolor, aus]) => {
      if (vivo) setEstado({ cargando: false, contexto: { checkins: cs, dolor, ausencias: aus } })
    }).catch(() => { if (vivo) setEstado({ cargando: false, contexto: VACIO }) })
    return () => { vivo = false }
  }, [clientId])

  return estado
}
