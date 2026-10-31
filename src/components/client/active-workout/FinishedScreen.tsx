import { useState } from 'react'
import { Check, Trophy, Flame, CalendarCheck, Bell, Share2 } from 'lucide-react'
import { celebraciones } from '../../../lib/hoyResumen'
import { usePushNotifications } from '../../../lib/usePushNotifications'

const AVISOS_KEY = 'pf_avisos_pedidos'
const yaPedido = () => { try { return localStorage.getItem(AVISOS_KEY) === '1' } catch { return true } }

interface Props {
  title: string
  trainerMode?: boolean
  clientName?: string
  elapsedLabel: string
  totalVolume: number
  newRecords: { name: string; best: number }[]
  streak: number
  /** La sesión cierra la semana del plan (todas las previstas hechas). */
  semanaCompleta: boolean
  /** Semanas completas seguidas que acaban en esta (para decir «3 seguidas»). */
  semanasSeguidas?: number
  /** Cliente que entrena: se le ofrece activar los avisos (no al entrenador que registra por él). */
  clientId?: string
  onContinue: () => void
  /** Compartir el entreno como imagen (solo el cliente). */
  onShare?: () => void
}

// Lo último que ve el cliente: la sesión ya está guardada, esto es el cierre.
export function FinishedScreen({ title, trainerMode, clientName, elapsedLabel, totalVolume, newRecords, streak, semanaCompleta, semanasSeguidas, clientId, onContinue, onShare }: Props) {
  const fiestas = celebraciones({ records: newRecords, semanaCompleta, racha: streak, semanasSeguidas })
  // Pedir permiso al terminar el entreno, no al abrir la app: es cuando el aviso tiene sentido. Una sola vez.
  const push = usePushNotifications({ clientId })
  const [pedido, setPedido] = useState(yaPedido)
  const ofrecerAvisos = !trainerMode && !!clientId && push.supported && !push.subscribed && !pedido && (typeof Notification === 'undefined' || Notification.permission === 'default')
  const recordarPedido = () => { setPedido(true); try { localStorage.setItem(AVISOS_KEY, '1') } catch {} }
  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-ok text-white flex items-center justify-center mb-6 shadow-lg shadow-ok/30">
        <Check className="w-10 h-10" />
      </div>
      <h2 className="font-serif font-bold text-3xl">{trainerMode ? 'Sesión guardada' : '¡Buen trabajo!'}</h2>
      <p className="text-muted mt-2 max-w-xs">
        {trainerMode ? `La sesión de ${clientName || 'tu cliente'} (${title}) ya está registrada.` : 'Tu entrenador verá tu sesión.'}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-xs">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="font-serif font-bold text-xl">{elapsedLabel}</p>
          <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">Duración</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="font-serif font-bold text-xl">{totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : 0} kg</p>
          <p className="text-[11px] text-muted uppercase tracking-wider mt-0.5">Volumen</p>
        </div>
      </div>

      {fiestas.length > 0 && (
        <div className="mt-4 space-y-2 w-full max-w-xs">
          {fiestas.map(f => (
            <p key={f.icono} className={`flex items-center justify-center gap-2 text-sm font-semibold ${f.icono === 'trofeo' ? 'text-attn' : f.icono === 'semana' ? 'text-ok' : 'text-accent'}`}>
              {f.icono === 'trofeo' ? <Trophy className="w-4 h-4 flex-shrink-0" /> : f.icono === 'semana' ? <CalendarCheck className="w-4 h-4 flex-shrink-0" /> : <Flame className="w-4 h-4 flex-shrink-0" />} {f.texto}
            </p>
          ))}
        </div>
      )}

      {ofrecerAvisos && (
        <div className="mt-6 w-full max-w-xs bg-card border border-border rounded-2xl p-4 text-left">
          <p className="flex items-center gap-2 text-sm font-semibold"><Bell className="w-4 h-4 text-accent" /> ¿Activamos los avisos?</p>
          <p className="text-xs text-muted mt-1">Te llegarán los mensajes de tu entrenador y los cambios de tu plan, sin abrir la app.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={async () => { recordarPedido(); await push.subscribe() }} disabled={push.loading}
              className="flex-1 py-2 rounded-xl bg-ink text-white text-sm font-semibold">Activar</button>
            <button onClick={recordarPedido} className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold text-muted">Ahora no</button>
          </div>
        </div>
      )}

      {onShare && (
        <button onClick={onShare}
          className="mt-8 w-full max-w-xs py-3.5 rounded-2xl border border-border bg-card font-semibold text-sm flex items-center justify-center gap-2 hover:border-accent active:scale-[0.98] transition-all">
          <Share2 className="w-4 h-4" /> Compartir como imagen
        </button>
      )}
      <button onClick={onContinue}
        className={`${onShare ? 'mt-3' : 'mt-10'} w-full max-w-xs py-4 rounded-2xl bg-ink text-white font-bold text-base hover:opacity-90 active:scale-[0.98] transition-all`}>
        Volver al inicio
      </button>
    </div>
  )
}
