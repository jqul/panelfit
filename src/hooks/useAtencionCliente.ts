import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateKey } from '../lib/dates'
import { fetchClientPain } from '../lib/clientPain'
import { DEMO_READINESS_MAP } from '../lib/demo-data'
import { construirAtencion, diasDesde, type AtencionItem, type EntradaAtencion } from '../lib/atencionCliente'
import type { TrainingLogs } from '../types'

// Lo accionable de un cliente, para la tarjeta «Atención hoy» de su ficha (lib/atencionCliente). Solo lee lo de ESE cliente:
// molestias de los últimos 14 días, su último check-in de la semana y los vídeos sin comentar. Lo demás (sesiones y
// recordatorios) ya lo tiene la ficha cargado.
type Fila = { date: string; sleep: number | null; soreness: number | null; motivation: number | null }

export function useAtencionCliente(clientId: string, logs: TrainingLogs, tienePlan: boolean, recordatorios: { done: boolean; date: string }[]): AtencionItem[] {
  const [dolor, setDolor] = useState<EntradaAtencion['dolor']>([])
  const [checkin, setCheckin] = useState<EntradaAtencion['checkin']>(null)
  const [videos, setVideos] = useState(0)
  const demo = clientId.startsWith('demo-client-')

  useEffect(() => {
    let vivo = true
    const hace = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateKey(d) }
    fetchClientPain(clientId).then(p => { if (vivo) setDolor(p.filter(x => x.date >= hace(14))) })
    if (demo) {
      const filas = [...(DEMO_READINESS_MAP[clientId] || [])].sort((a, b) => b.date.localeCompare(a.date))
      setCheckin(filas[0] ?? null)
      setVideos(0)
    } else {
      supabase.from('readiness_checkins').select('date, sleep, soreness, motivation').eq('clientId', clientId).gte('date', hace(7)).order('date', { ascending: false }).limit(1)
        .then(({ data }) => { if (vivo) setCheckin(((data || []) as Fila[])[0] ?? null) })
      supabase.from('video_feedback').select('id').eq('client_id', clientId).eq('status', 'pendiente')
        .then(({ data }) => { if (vivo) setVideos((data || []).length) })
    }
    return () => { vivo = false }
  }, [clientId, demo])

  return useMemo(() => {
    const hoy = localDateKey()
    const ultima = Object.values(logs).filter(l => l?.done && l.dateDone).map(l => l.dateDone as string).sort().pop() ?? null
    const pendientes = recordatorios.filter(a => !a.done)
    return construirAtencion({
      dolor, checkin, videosPendientes: videos,
      diasSinEntrenar: tienePlan ? diasDesde(ultima, hoy) : null,
      recordatorios: { pendientes: pendientes.length, vencidos: pendientes.filter(a => a.date && a.date < hoy).length },
    })
  }, [dolor, checkin, videos, logs, tienePlan, recordatorios])
}
