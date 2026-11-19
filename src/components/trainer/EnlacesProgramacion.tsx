import { useCallback, useEffect, useState } from 'react'
import { Link2, Copy, Ban, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import {
  ETIQUETA_ESTADO_ENLACE, estadoEnlace, textoCaducidad, textoUsos, urlProgramacion, type EnlaceProgramacion,
} from '../../lib/solicitudProgramacion'

// Contactos → Enlaces de programación inicial: el entrenador crea un enlace que comparte con quien quiere que pida una programación
// sin cuenta. Cada enlace caduca, se limita, se puede revocar en cualquier momento y deja constancia de sus usos. Revocado, caducado o
// agotado, la página no enseña nada y no acepta envíos. Se crea y se revoca con funciones de la base de datos (la auditoría la pone el servidor).
const CADUCIDADES = [{ id: '14', label: '14 días' }, { id: '7', label: '7 días' }, { id: '30', label: '30 días' }, { id: '', label: 'Sin caducidad' }]

export function EnlacesProgramacion({ trainerId }: { trainerId: string }) {
  const [enlaces, setEnlaces] = useState<EnlaceProgramacion[] | null>(null)
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('Programación inicial — amigos')
  const [dias, setDias] = useState('14')
  const [unSoloUso, setUnSoloUso] = useState(false)
  const [maxUsos, setMaxUsos] = useState('')
  const [mostrarFoto, setMostrarFoto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [revocando, setRevocando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('programacion_enlaces').select('*').eq('trainer_id', trainerId).order('creado_en', { ascending: false })
    setEnlaces((data as EnlaceProgramacion[] | null) ?? [])
  }, [trainerId])
  useEffect(() => { void cargar() }, [cargar])

  const crear = async () => {
    if (ocupado) return
    setOcupado(true)
    const { error } = await supabase.rpc('crear_enlace_programacion', {
      p_nombre: nombre.trim(), p_dias_caducidad: dias ? Number(dias) : null,
      p_max_usos: !unSoloUso && maxUsos ? Number(maxUsos) : null, p_un_solo_uso: unSoloUso, p_mostrar_foto: mostrarFoto,
    })
    setOcupado(false)
    if (error) { toast(error.message.length < 140 ? error.message : 'No se pudo crear el enlace', 'warn'); return }
    setCreando(false)
    toast('Enlace creado ✓', 'ok')
    await cargar()
  }

  const revocar = async (e: EnlaceProgramacion) => {
    const { error } = await supabase.rpc('revocar_enlace_programacion', { p_id: e.id })
    setRevocando(null)
    if (error) { toast('No se pudo revocar el enlace', 'warn'); return }
    toast('Enlace revocado: ya no acepta solicitudes', 'ok')
    await cargar()
  }

  const copiar = (e: EnlaceProgramacion) => {
    const url = urlProgramacion(window.location.origin, e.slug)
    navigator.clipboard?.writeText(url)
    toast('Enlace copiado ✓', 'ok')
  }

  const campo = 'w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:border-accent'
  const ahora = Date.now()

  return (
    <section aria-label="Enlaces de programación inicial" className="bg-card rounded-2xl p-4 space-y-3" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold flex items-center gap-1.5"><Link2 className="w-4 h-4 text-accent" /> Enlaces de programación inicial</h3>
          <p className="text-xs text-muted mt-0.5">Quien lo abre pide su programación sin cuenta; llega aquí como contacto, no como cliente. Lo revisas tú.</p>
        </div>
        {!creando && <button onClick={() => setCreando(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink text-white text-xs font-bold flex-shrink-0"><Plus className="w-3.5 h-3.5" /> Crear enlace</button>}
      </div>

      {creando && (
        <form className="space-y-3 border-t border-border/40 pt-3" onSubmit={ev => { ev.preventDefault(); void crear() }}>
          <div>
            <label htmlFor="enl-nombre" className="block text-xs font-semibold text-muted mb-1">Nombre del enlace</label>
            <input id="enl-nombre" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} className={campo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="enl-caducidad" className="block text-xs font-semibold text-muted mb-1">Caducidad</label>
              <select id="enl-caducidad" value={dias} onChange={e => setDias(e.target.value)} className={campo}>
                {CADUCIDADES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="enl-max" className="block text-xs font-semibold text-muted mb-1">Límite de usos</label>
              <input id="enl-max" type="number" min={1} max={1000} value={unSoloUso ? 1 : maxUsos} disabled={unSoloUso} onChange={e => setMaxUsos(e.target.value)} placeholder="Sin límite" className={campo} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={unSoloUso} onChange={e => setUnSoloUso(e.target.checked)} /> Un solo uso (para una persona)</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={mostrarFoto} onChange={e => setMostrarFoto(e.target.checked)} /> Mostrar mi logo o foto en la página</label>
          <p className="text-[11px] text-muted">La página enseña tu nombre (y tu marca, si la tienes), qué incluye y que no es consejo médico. Nada más.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={ocupado || !nombre.trim()} className="px-4 py-2.5 rounded-xl bg-ink text-white text-xs font-bold disabled:opacity-40">{ocupado ? 'Creando…' : 'Crear'}</button>
            <button type="button" onClick={() => setCreando(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted">Cancelar</button>
          </div>
        </form>
      )}

      {enlaces && enlaces.length > 0 && (
        <ul className="space-y-2 border-t border-border/40 pt-3">
          {enlaces.map(e => {
            const estado = estadoEnlace(e, ahora)
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex-1 min-w-[10rem]">
                  <p className="font-semibold text-sm">{e.nombre}</p>
                  <p className="text-muted">
                    <span className={`font-bold ${estado === 'activo' ? 'text-ok' : 'text-warn'}`}>{ETIQUETA_ESTADO_ENLACE[estado]}</span>
                    {' · '}{textoUsos(e)}{' · '}{textoCaducidad(e, ahora)}
                    {e.ultimo_uso_en && <> · último uso {new Date(e.ultimo_uso_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</>}
                    {e.revocado_en && <> · revocado el {new Date(e.revocado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</>}
                  </p>
                </div>
                {estado === 'activo' && (
                  <button onClick={() => copiar(e)} aria-label={`Copiar enlace ${e.nombre}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-semibold hover:bg-bg-alt"><Copy className="w-3.5 h-3.5" /> Copiar enlace</button>
                )}
                {e.activo && (revocando === e.id ? (
                  <span className="flex items-center gap-1.5">
                    <button onClick={() => void revocar(e)} aria-label={`Confirmar revocar ${e.nombre}`} className="px-3 py-2 rounded-xl bg-warn text-white font-bold">Sí, revocar</button>
                    <button onClick={() => setRevocando(null)} className="px-2 py-2 text-muted font-semibold">No</button>
                  </span>
                ) : (
                  <button onClick={() => setRevocando(e.id)} aria-label={`Revocar ${e.nombre}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border font-semibold text-warn hover:bg-bg-alt"><Ban className="w-3.5 h-3.5" /> Revocar</button>
                ))}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
