import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { isDemoTrainerId } from '../../lib/demoIds'
import {
  limpiarConsejos, nuevoConsejo, ejemplosPendientes, mover,
  MAX_CONSEJOS, MAX_TITULO, MAX_TEXTO, type Consejo,
} from '../../lib/consejos'

const campo = 'w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20'

// "Consejos para tus clientes": tarjetas cortas que el cliente lee en Más. Se guardan en el perfil del entrenador,
// fusionando con lo último que haya en el servidor para no pisar lo que gestionan otras pantallas.
export function ConsejosEditor({ trainerId }: { trainerId: string }) {
  const [lista, setLista] = useState<Consejo[]>([])
  const [cargado, setCargado] = useState(false)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const demo = isDemoTrainerId(trainerId)

  useEffect(() => {
    let vigente = true
    if (demo) {
      import('../../lib/demo-data').then(m => { if (vigente) { setLista(limpiarConsejos(m.DEMO_TRAINER_PROFILE.consejos)); setCargado(true) } })
      return () => { vigente = false }
    }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (!vigente) return
      setLista(limpiarConsejos((data?.profile as { consejos?: unknown } | null)?.consejos))
      setCargado(true)
    })
    return () => { vigente = false }
  }, [trainerId, demo])

  const cambiar = (nueva: Consejo[]) => { setLista(nueva); setSucio(true) }
  const editar = (id: string, parche: Partial<Consejo>) => cambiar(lista.map(c => c.id === id ? { ...c, ...parche } : c))

  const guardar = async () => {
    if (demo) { toast('En la demo no se guardan los consejos', 'info'); return }
    const limpios = limpiarConsejos(lista)
    const descartados = lista.length - limpios.length
    setGuardando(true)
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const profile = { ...(data?.profile || {}), consejos: limpios, updatedAt: Date.now() }
    const { error } = await supabase.from('entrenadores').update({ profile }).eq('uid', trainerId)
    setGuardando(false)
    if (error) { toast('No se pudo guardar: ' + error.message, 'warn'); return }
    try { // la copia local del perfil (la lee la pantalla de Ajustes) se mantiene al día
      const clave = `pf_trainer_profile_${trainerId}`
      const local = JSON.parse(localStorage.getItem(clave) || '{}')
      localStorage.setItem(clave, JSON.stringify({ ...local, consejos: limpios }))
    } catch {}
    setLista(limpios); setSucio(false)
    toast(descartados > 0 ? `Consejos guardados ✓ (${descartados} sin título o sin texto no se han guardado)` : 'Consejos guardados ✓', 'ok')
  }

  const pendientes = ejemplosPendientes(lista)

  return (
    <div className="bg-card rounded-2xl p-6 space-y-4 shadow-sm">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Consejos para tus clientes</h3>
        <p className="text-xs text-muted mt-0.5">Tarjetas cortas que verán en su panel, en «Más»: sueño, descanso, qué hacer un día que no pueden entrenar… con tu voz.</p>
      </div>

      {!cargado ? <p className="text-sm text-muted">Cargando…</p> : (
        <>
          {lista.length === 0 && <p className="text-sm text-muted">Aún no has escrito ninguno. Empieza con un ejemplo y cámbialo a tu manera.</p>}

          <ul className="space-y-3">
            {lista.map((c, i) => (
              <li key={c.id} className="border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="text" value={c.titulo} maxLength={MAX_TITULO} aria-label={`Título del consejo ${i + 1}`}
                    onChange={e => editar(c.id, { titulo: e.target.value })} placeholder="Título" className={`${campo} font-semibold`} />
                  <button type="button" onClick={() => cambiar(mover(lista, i, -1))} disabled={i === 0} aria-label={`Subir el consejo ${c.titulo || i + 1}`}
                    className="p-2 rounded-lg text-muted hover:bg-bg-alt disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => cambiar(mover(lista, i, 1))} disabled={i === lista.length - 1} aria-label={`Bajar el consejo ${c.titulo || i + 1}`}
                    className="p-2 rounded-lg text-muted hover:bg-bg-alt disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => cambiar(lista.filter(x => x.id !== c.id))} aria-label={`Quitar el consejo ${c.titulo || i + 1}`}
                    className="p-2 rounded-lg text-warn hover:bg-warn/5"><Trash2 className="w-4 h-4" /></button>
                </div>
                <textarea rows={3} value={c.texto} maxLength={MAX_TEXTO} aria-label={`Texto del consejo ${i + 1}`}
                  onChange={e => editar(c.id, { texto: e.target.value })} placeholder="Escríbelo como se lo dirías a tu cliente" className={`${campo} resize-none`} />
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            {lista.length < MAX_CONSEJOS && (
              <button type="button" onClick={() => cambiar([...lista, nuevoConsejo()])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted hover:border-accent hover:text-accent">
                <Plus className="w-4 h-4" /> Nuevo consejo
              </button>
            )}
            {lista.length < MAX_CONSEJOS && pendientes.map(e => (
              <button key={e.titulo} type="button" onClick={() => cambiar([...lista, nuevoConsejo(e.titulo, e.texto)])}
                className="px-3 py-2 rounded-xl bg-bg-alt text-xs font-semibold text-muted hover:text-ink">
                + Ejemplo: {e.titulo}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={guardar} disabled={!sucio || guardando}
              className="px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
              {guardando ? 'Guardando…' : 'Guardar consejos'}
            </button>
            {sucio && <span className="text-xs text-muted">Hay cambios sin guardar</span>}
          </div>
        </>
      )}
    </div>
  )
}
