import { useEffect, useState } from 'react'
import { desconectarStrava, estadoStrava, irAConectar, sincronizarStrava, type EstadoStrava } from '../../lib/strava'
import { toast } from './Toast'

// Strava en "Entrenos del reloj" del cliente: conectar su cuenta para que los entrenos de su reloj lleguen solos (lib/
// strava). Conectado, sincroniza al abrir (la función lo limita a una vez cada 10 minutos) y deja desconectar.
export function StravaConexion({ onNuevas }: { onNuevas: () => void }) {
  const [estado, setEstado] = useState<EstadoStrava | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    estadoStrava().then(async e => {
      if (!vivo) return
      setEstado(e)
      if (e.conectado) { const n = await sincronizarStrava(); if (vivo && n) { onNuevas(); toast(`${n} entreno${n === 1 ? '' : 's'} nuevo${n === 1 ? '' : 's'} de Strava`, 'ok') } }
    }).catch(() => {})
    return () => { vivo = false }
  }, [])

  if (!estado) return null
  if (!estado.cuenta) return <p className="text-[11px] text-muted">Con tu cuenta de PanelFit puedes conectar Strava y que tus entrenos lleguen solos.</p>

  const conectar = async () => { setOcupado(true); setError(''); const e = await irAConectar(); if (e) { setError(e); setOcupado(false) } }
  const desconectar = async () => {
    setOcupado(true)
    if (await desconectarStrava()) { setEstado({ ...estado, conectado: false, ultimaSync: null }); toast('Strava desconectado', 'info') }
    setOcupado(false)
  }

  return (
    <div className="pt-2 border-t border-border/60 space-y-1.5" aria-label="Strava" role="group">
      {estado.conectado ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold"><span className="text-[#FC4C02] font-bold">Strava</span> conectado</span>
          {estado.ultimaSync && <span className="text-[11px] text-muted">· sincronizado {new Date(estado.ultimaSync).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
          <button type="button" onClick={desconectar} disabled={ocupado} className="ml-auto text-[11px] font-semibold text-muted hover:text-warn disabled:opacity-50">Desconectar</button>
        </div>
      ) : (
        <>
          <button type="button" onClick={conectar} disabled={ocupado}
            className="w-full py-2.5 rounded-xl bg-[#FC4C02] text-white text-sm font-bold hover:opacity-90 disabled:opacity-60">
            {ocupado ? 'Abriendo Strava…' : 'Conectar con Strava'}
          </button>
          <p className="text-[11px] text-muted">Tu reloj (Garmin, Coros, Polar, Suunto…) ya envía los entrenos a Strava: conéctalo y llegarán aquí solos.</p>
        </>
      )}
      {error && <p role="alert" className="text-xs text-warn">{error}</p>}
    </div>
  )
}
