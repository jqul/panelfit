import { useEffect, useState } from 'react'
import { CalendarPlus, Copy, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { isDemoClientId } from '../../lib/demoIds'
import { toast } from '../shared/Toast'

const nuevoToken = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')

/**
 * "Añadir a mi calendario": una dirección secreta (iCal) para que Google Calendar, Apple Calendario u Outlook
 * muestren sus días de entreno, sesiones con el entrenador, fechas clave y ausencias, y se actualicen solos.
 * El cliente la activa, la puede cambiar (la vieja deja de funcionar) o quitar.
 */
export function CalendarioSuscripcion({ clientId }: { clientId: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [ocupado, setOcupado] = useState(false)
  const demo = isDemoClientId(clientId)

  useEffect(() => {
    if (demo) { setToken(null); return }
    supabase.from('calendario_enlaces').select('token').eq('client_id', clientId).maybeSingle()
      .then(({ data }) => setToken(data?.token ?? null))
  }, [clientId, demo])

  if (token === undefined) return null
  const https = token ? `${window.location.origin}/api/calendario?t=${token}` : ''
  const webcal = https.replace(/^https?:/, 'webcal:')

  const guardar = async (t: string | null) => {
    if (demo) { toast('En la demostración no se crea el calendario', 'info'); return }
    setOcupado(true)
    const { error } = t
      ? await supabase.from('calendario_enlaces').upsert({ client_id: clientId, token: t }, { onConflict: 'client_id' })
      : await supabase.from('calendario_enlaces').delete().eq('client_id', clientId)
    setOcupado(false)
    if (error) { toast('No se pudo guardar', 'warn'); return }
    setToken(t)
    toast(t ? (token ? 'Enlace cambiado: el anterior ya no funciona' : 'Calendario activado') : 'Calendario desactivado', 'ok')
  }

  const copiar = async () => {
    try { await navigator.clipboard.writeText(https); toast('Enlace copiado', 'ok') } catch { toast('No se pudo copiar', 'warn') }
  }

  const boton = 'flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl text-sm font-semibold'
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <CalendarPlus className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-sm font-semibold">Tus entrenos en tu calendario</p>
          <p className="text-xs text-muted mt-0.5">Google Calendar, iPhone u Outlook: tus días de entreno, sesiones, fechas clave y ausencias, y se actualizan solos.</p>
        </div>
      </div>
      {!token ? (
        <button onClick={() => guardar(nuevoToken())} disabled={ocupado} className={`${boton} w-full bg-ink text-white disabled:opacity-50`}>
          Añadir a mi calendario
        </button>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <a href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer" className={`${boton} bg-ink text-white`}>Google</a>
            <a href={webcal} className={`${boton} bg-ink text-white`}>iPhone / Mac</a>
          </div>
          <button onClick={copiar} className={`${boton} w-full border border-border text-ink`}><Copy className="w-4 h-4" /> Copiar enlace (Outlook y otros)</button>
          <p className="text-[11px] text-muted leading-relaxed">Quien tenga este enlace ve esos datos en su calendario. Si lo has compartido sin querer, cámbialo.</p>
          <div className="flex gap-2">
            <button onClick={() => guardar(nuevoToken())} disabled={ocupado} className={`${boton} flex-1 border border-border text-muted text-xs`}><RefreshCw className="w-3.5 h-3.5" /> Cambiar enlace</button>
            <button onClick={() => guardar(null)} disabled={ocupado} className={`${boton} flex-1 border border-border text-muted text-xs`}>Quitar</button>
          </div>
        </>
      )}
    </div>
  )
}
