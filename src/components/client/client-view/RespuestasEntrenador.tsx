import { useEffect, useState } from 'react'
import { marcarRespuestaLeida, respuestasSinLeer, type RespuestaSesion } from '../../../lib/respuestasSesion'

const dia = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })

// Hoy del cliente: lo que su entrenador le ha dicho de sus sesiones (lib/respuestasSesion), hasta que lo marca como leído.
export function RespuestasEntrenador({ clientId, nombreEntrenador }: { clientId: string; nombreEntrenador: string }) {
  const [lista, setLista] = useState<RespuestaSesion[]>([])
  useEffect(() => { let vivo = true; respuestasSinLeer(clientId).then(r => { if (vivo) setLista(r) }); return () => { vivo = false } }, [clientId])
  if (!lista.length) return null
  const leer = (r: RespuestaSesion) => { setLista(l => l.filter(x => x.id !== r.id)); marcarRespuestaLeida(r.id, clientId) }
  return (
    <div className="px-4 pt-4">
      <section aria-label={`Mensajes de ${nombreEntrenador}`} className="bg-accent/5 border border-accent/20 rounded-2xl p-4 space-y-2">
        {lista.map(r => (
          <div key={r.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted">💬 {nombreEntrenador} sobre tu sesión del {dia(r.fecha)}</p>
              <p className="text-sm font-semibold">{r.texto}</p>
            </div>
            <button type="button" onClick={() => leer(r)} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-border text-muted hover:text-ink flex-shrink-0">Entendido</button>
          </div>
        ))}
      </section>
    </div>
  )
}
