import { useState } from 'react'
import { Video } from 'lucide-react'
import { MAX_ENLACE, plataforma, problemaEnlace, puedeUnirse } from '../../lib/sesionOnline'

// Campo "Online (videollamada)" para crear una cita o una clase: activarlo pide el enlace (lib/sesionOnline).
export function CampoEnlaceOnline({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const online = value !== null
  const problema = problemaEnlace(value)
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={online} onChange={e => onChange(e.target.checked ? '' : null)} />
        Online (videollamada)
      </label>
      {online && (
        <>
          <input value={value} maxLength={MAX_ENLACE} autoFocus aria-label="Enlace de la videollamada" onChange={e => onChange(e.target.value)}
            placeholder="https://meet.google.com/… o el de Zoom"
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          {problema && <p className="text-xs text-warn">{problema}</p>}
        </>
      )}
    </div>
  )
}

/** Etiqueta "Online · Meet" para las listas. */
export function EtiquetaOnline({ enlace }: { enlace?: string | null }) {
  if (!enlace) return null
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
      <Video className="w-3 h-3" aria-hidden /> Online · {plataforma(enlace)}
    </span>
  )
}

/** "Unirse": activo desde un rato antes hasta que acaba; antes dice cuándo se abre. */
export function BotonUnirse({ enlace, startAt, endAt }: { enlace: string; startAt: string; endAt: string }) {
  const [ahora] = useState(() => new Date())
  const abierta = puedeUnirse(startAt, endAt, ahora)
  if (!abierta) return <span className="text-[11px] text-muted">Enlace activo 15 min antes</span>
  return (
    <a href={enlace} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:opacity-90">
      <Video className="w-3.5 h-3.5" aria-hidden /> Unirse
    </a>
  )
}
