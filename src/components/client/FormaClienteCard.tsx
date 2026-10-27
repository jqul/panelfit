import { useEffect, useMemo, useState } from 'react'
import { TrainingLogs } from '../../types'
import { supabase } from '../../lib/supabase'
import { computeLoadTrend, computeSessionLoadTrend, SessionLoadRow } from '../../lib/loadRisk'
import { estadoForma, ClaveForma } from '../../lib/estadoForma'

// De más cansado a más descansado: la barra coloca al cliente en esta escala.
const ESCALA: { clave: ClaveForma; corto: string }[] = [
  { clave: 'sobrecarga', corto: 'Sobrecarga' },
  { clave: 'productivo', corto: 'Construyendo' },
  { clave: 'manteniendo', corto: 'Estable' },
  { clave: 'fresco', corto: 'Fresco' },
  { clave: 'recargando', corto: 'Recargando' },
]

/**
 * "Tu forma" en el Resumen de Progreso del cliente: el estado de carga en una frase, sin números.
 * Solo se enseña si el entrenador comparte con el cliente la sección Riesgo (decide él).
 */
export function FormaClienteCard({ clientId, logs }: { clientId: string; logs: TrainingLogs }) {
  const [rows, setRows] = useState<SessionLoadRow[] | null>(null)

  useEffect(() => {
    if (clientId.startsWith('demo-client-')) {
      import('../../lib/demo-data').then(({ DEMO_SESSION_LOAD_MAP }) => setRows(DEMO_SESSION_LOAD_MAP[clientId] || []))
      return
    }
    supabase.from('session_load').select('date, duration_min, rpe').eq('client_id', clientId)
      .then(({ data }) => setRows((data || []) as SessionLoadRow[]))
  }, [clientId])

  const estado = useMemo(() => {
    if (rows === null) return null
    const porSesion = computeSessionLoadTrend(rows, 12)
    return estadoForma(porSesion.length >= 2 ? porSesion : computeLoadTrend(logs, 12))
  }, [rows, logs])

  if (!estado) return null
  const idx = ESCALA.findIndex(e => e.clave === estado.clave)
  const color = estado.tono === 'aviso' ? 'bg-warn' : estado.tono === 'ok' ? 'bg-ok' : 'bg-ink'

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">🔋 Tu forma</p>
      <p className="text-base font-serif font-bold leading-snug">{estado.etiqueta === 'Productivo' ? 'Construyendo' : estado.etiqueta}</p>
      <p className="text-sm text-muted mt-1 leading-relaxed">{estado.fraseCliente}</p>
      <div className="mt-4" role="img" aria-label={`Tu forma: ${ESCALA[idx].corto}, en una escala de más cansado a más descansado`}>
        <div className="grid grid-cols-5 gap-1">
          {ESCALA.map((e, i) => (
            <span key={e.clave} className={`h-1.5 rounded-full ${i === idx ? color : 'bg-bg-alt'}`} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted mt-1.5" aria-hidden>
          <span>Más cansado</span><span>Más descansado</span>
        </div>
      </div>
    </div>
  )
}
