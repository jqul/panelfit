import { useState, useEffect } from 'react'
import { ClipboardList, AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface CheckinRespuesta { pregunta: string; respuesta: string }

export function IntakeSummary({ clientId }: { clientId: string }) {
  const [respuestas, setRespuestas] = useState<CheckinRespuesta[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('checkins').select('respuestas').eq('clientId', clientId).eq('tipo', 'intake')
      .order('createdAt', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { setRespuestas(data?.respuestas || null); setLoading(false) })
  }, [clientId])

  if (loading || !respuestas?.length) return null

  const alertas = respuestas.filter(r => r.respuesta === 'Sí')

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="px-5 py-3 border-b border-border/50 bg-bg-alt/30 flex items-center gap-2">
        <ClipboardList className="w-3.5 h-3.5 text-muted" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Ficha de admisión</p>
      </div>
      <div className="p-4 space-y-2">
        {alertas.length > 0 && (
          <div className="flex items-start gap-2 bg-warn/10 border border-warn/20 rounded-xl px-3 py-2.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warn font-medium">{alertas.length} respuesta{alertas.length > 1 ? 's' : ''} de salud requiere{alertas.length > 1 ? 'n' : ''} atención — revisa antes de programar esfuerzo alto.</p>
          </div>
        )}
        {respuestas.map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-3 text-sm py-1">
            <p className="text-muted flex-1">{r.pregunta}</p>
            <p className={`font-semibold flex-shrink-0 ${r.respuesta === 'Sí' ? 'text-warn' : ''}`}>{r.respuesta}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
