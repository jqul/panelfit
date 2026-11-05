import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { toast } from '../../shared/Toast'
import { BotonUnirse, EtiquetaOnline } from '../../shared/EnlaceOnline'
import { sendPush } from '../../../lib/usePushNotifications'
import {
  cancelarMiPlaza, clasesDelCliente, estadoParaCliente, libres, puedeCancelar, reservarClase, type ClaseCliente,
} from '../../../lib/clasesGrupo'

const cuando = (s: string) => new Date(s).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Hoy del cliente, debajo de sus sesiones: las clases de grupo de su entrenador de las próximas 3 semanas, con plaza,
// lista de espera o cuántas quedan (lib/clasesGrupo). Sin clases, no sale.
export function ClasesCliente({ trainerId, clientName }: { trainerId: string; clientName: string }) {
  const [clases, setClases] = useState<ClaseCliente[]>([])
  const [ocupado, setOcupado] = useState<string | null>(null)
  const cargar = () => clasesDelCliente().then(setClases)
  useEffect(() => { cargar() }, [])

  if (!clases.length) return null

  const reservar = async (c: ClaseCliente) => {
    setOcupado(c.id)
    const r = await reservarClase(c.id)
    setOcupado(null)
    if ('error' in r) { toast(r.error, 'warn'); return }
    toast(r.estado === 'reservada' ? `Tienes plaza en «${c.titulo}» ✓` : `Estás en la lista de espera de «${c.titulo}»: si alguien cancela, pasas tú`, 'ok')
    if (r.estado === 'reservada') sendPush({ trainerId }, 'Nueva reserva de clase', `${clientName} se ha apuntado a «${c.titulo}» (${cuando(c.start_at)})`)
    cargar()
  }
  const cancelar = async (c: ClaseCliente) => {
    if (c.mi_estado === 'reservada' && !confirm(`¿Cancelar tu plaza en «${c.titulo}»?`)) return
    setOcupado(c.id)
    const r = await cancelarMiPlaza(c.id)
    setOcupado(null)
    if ('error' in r) { toast(r.error, 'warn'); return }
    toast(c.mi_estado === 'reservada' ? 'Plaza cancelada' : 'Has salido de la lista de espera', 'ok')
    cargar()
  }

  return (
    <div className="px-4 pt-4">
      <section aria-label="Clases de grupo" className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Clases de grupo</p>
        </div>
        <ul className="divide-y divide-border">
          {clases.map(c => {
            const estado = estadoParaCliente(c)
            return (
              <li key={c.id} className="px-4 py-3 flex items-center gap-3" aria-label={c.titulo}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.titulo}</p>
                  <p className="text-xs text-muted capitalize">{cuando(c.start_at)}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${c.mi_estado === 'reservada' ? 'text-ok' : c.mi_estado === 'espera' ? 'text-warn' : 'text-muted'}`}>{estado}</p>
                  {c.notas && <p className="text-xs text-muted mt-0.5">{c.notas}</p>}
                  {c.online && <div className="mt-1">{c.enlace ? <EtiquetaOnline enlace={c.enlace} /> : <span className="text-[11px] font-bold text-accent">Online · el enlace te llega al tener plaza</span>}</div>}
                  {c.mi_estado === 'reservada' && c.enlace && <div className="mt-2"><BotonUnirse enlace={c.enlace} startAt={c.start_at} endAt={c.end_at} /></div>}
                </div>
                {c.mi_estado ? (
                  puedeCancelar(c) && (
                    <button onClick={() => cancelar(c)} disabled={ocupado === c.id}
                      className="flex-shrink-0 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-muted hover:text-warn hover:border-warn disabled:opacity-50">
                      {c.mi_estado === 'reservada' ? 'Cancelar plaza' : 'Salir de la espera'}
                    </button>
                  )
                ) : (
                  <button onClick={() => reservar(c)} disabled={ocupado === c.id}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50 ${libres(c) > 0 ? 'bg-ink text-white hover:opacity-90' : 'border border-border text-ink hover:border-ink'}`}>
                    {libres(c) > 0 ? 'Reservar' : 'Apuntarme a la espera'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
