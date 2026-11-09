import { MessageCircle, CalendarClock, Check } from 'lucide-react'
import type { ClientData } from '../../types'
import { textoFelicitacion, type Cumple } from '../../lib/cumpleanos'
import { waUrl } from '../../lib/bulkActions'

// Los cumpleaños de un día en la agenda (lib/cumpleanos): felicitar por WhatsApp con el texto ya escrito o dejar
// programado un mensaje en la app para ese día (le llega con push, como los demás mensajes programados).
export function CumplesDia({ fecha, cumples, hoy, programados, onProgramar }: {
  fecha: string
  cumples: Cumple<ClientData>[]
  hoy: string
  programados: Set<string> // ids de clientes con la felicitación ya programada para ese día
  onProgramar: (c: ClientData, texto: string) => void
}) {
  return (
    <ul aria-label={`Cumpleaños del ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
      className="divide-y divide-border border-b border-border bg-amber-50/60 dark:bg-amber-500/5">
      {cumples.map(({ cliente: c, edad }) => {
        const nombre = `${c.name} ${c.surname || ''}`.trim()
        const texto = textoFelicitacion(c.name)
        const wa = waUrl(c.phone, texto)
        return (
          <li key={c.id} className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold flex-1 min-w-0 truncate">
              🎂 Cumple {nombre}{edad ? <span className="text-muted font-normal"> · {edad} años</span> : null}
            </p>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Felicitar a ${nombre} por WhatsApp`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-ok/10 text-ok hover:bg-ok/20">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            {fecha >= hoy && (programados.has(c.id)
              ? <span className="flex items-center gap-1 text-[11px] font-bold text-ok"><Check className="w-3.5 h-3.5" /> Felicitación programada</span>
              : <button type="button" onClick={() => onProgramar(c, texto)} aria-label={`Programar felicitación para ${nombre}`}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-accent/10 text-accent hover:bg-accent/20">
                  <CalendarClock className="w-3.5 h-3.5" /> Mensaje en la app
                </button>)}
          </li>
        )
      })}
    </ul>
  )
}
