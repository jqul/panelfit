import { useState } from 'react'
import { Send } from 'lucide-react'
import { RESPUESTAS_RAPIDAS, responderSesion } from '../../lib/respuestasSesion'
import { toast } from '../shared/Toast'

// Bandeja → Actividad: contestar a una sesión con un toque (lib/respuestasSesion). Le llega al cliente al momento.
export function RespuestaRapida({ trainerId, clientId, nombre, fecha, respondida, onRespondida }: {
  trainerId: string; clientId: string; nombre: string; fecha: string; respondida: boolean; onRespondida: () => void
}) {
  const [escribiendo, setEscribiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (respondida) return <p className="text-[11px] text-ok font-semibold px-4 pb-3 -mt-1">Respondido ✓</p>

  const enviar = async (t: string) => {
    setEnviando(true)
    const ok = await responderSesion(trainerId, clientId, fecha, t)
    setEnviando(false)
    if (!ok) { toast('No se pudo enviar', 'warn'); return }
    toast(`Enviado a ${nombre} ✓`, 'ok')
    setEscribiendo(false); setTexto(''); onRespondida()
  }

  return (
    <div className="px-4 pb-3 -mt-1 flex flex-wrap items-center gap-1.5" role="group" aria-label={`Responder a la sesión de ${nombre}`}>
      {!escribiendo ? (<>
        {RESPUESTAS_RAPIDAS.map(r => (
          <button key={r} type="button" disabled={enviando} onClick={() => enviar(r)}
            className="px-2.5 py-1 rounded-full text-xs font-semibold border border-border text-muted hover:border-accent hover:text-accent disabled:opacity-50">{r}</button>
        ))}
        <button type="button" onClick={() => setEscribiendo(true)} className="px-2.5 py-1 rounded-full text-xs font-semibold text-accent">✍️ Escribir</button>
      </>) : (
        <form className="flex gap-1.5 w-full" onSubmit={e => { e.preventDefault(); enviar(texto) }}>
          <input autoFocus value={texto} onChange={e => setTexto(e.target.value)} maxLength={500} placeholder={`Mensaje para ${nombre}…`} aria-label={`Mensaje para ${nombre}`}
            className="flex-1 min-w-0 text-sm bg-bg border border-border rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-accent/20" />
          <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar" className="p-2 bg-ink text-white rounded-xl disabled:opacity-50"><Send className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={() => { setEscribiendo(false); setTexto('') }} className="px-2 text-xs text-muted">Cancelar</button>
        </form>
      )}
    </div>
  )
}
