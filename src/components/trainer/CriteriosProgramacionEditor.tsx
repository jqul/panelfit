import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { isDemoTrainerId } from '../../lib/demoIds'
import { CAMPOS_CRITERIOS, guardarCriterios, limpiarCriterios, type CriteriosProgramacion } from '../../lib/criteriosProgramacion'

// Ajustes → Criterios para programación inicial. En v1 solo se guarda el texto, en tu perfil (nadie más lo lee), con una versión que
// sube en cada guardado. Sirve para que, cuando prepares un borrador, lo hagas siempre con los mismos criterios.
export function CriteriosProgramacionEditor({ trainerId }: { trainerId: string }) {
  const [guardado, setGuardado] = useState<CriteriosProgramacion | null>(null)
  const [edit, setEdit] = useState<CriteriosProgramacion | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const demo = isDemoTrainerId(trainerId)

  useEffect(() => {
    let vivo = true
    if (demo) { const c = limpiarCriterios(undefined); setGuardado(c); setEdit(c); return }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (!vivo) return
      const c = limpiarCriterios((data?.profile as { criteriosProgramacion?: unknown } | null)?.criteriosProgramacion)
      setGuardado(c); setEdit(c)
    })
    return () => { vivo = false }
  }, [trainerId, demo])

  if (!guardado || !edit) return null

  const guardar = async () => {
    const nuevo = guardarCriterios(guardado, edit)
    if (nuevo === guardado) { toast('No hay cambios que guardar', 'ok'); return }
    if (demo) { setGuardado(nuevo); toast('En la demostración no se guarda nada', 'ok'); return }
    setOcupado(true)
    // Se fusiona con lo último del perfil en el servidor (no se pisa lo que haya guardado otra pantalla)
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const profile = { ...(data?.profile || {}), criteriosProgramacion: nuevo }
    const { error } = await supabase.from('entrenadores').update({ profile }).eq('uid', trainerId)
    setOcupado(false)
    if (error) { toast('No se pudo guardar: ' + error.message, 'warn'); return }
    setGuardado(nuevo); setEdit(nuevo)
    toast('Criterios guardados ✓', 'ok')
  }

  const caja = 'w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:border-accent'
  return (
    <div className="pt-3 border-t border-border/40 space-y-3" role="group" aria-label="Criterios para programación inicial">
      <div>
        <p className="text-sm font-medium">Criterios para programación inicial</p>
        <p className="text-xs text-muted mt-0.5">Solo se guardan en tu perfil{guardado.version > 0 ? ` (versión ${guardado.version})` : ''}. Los tendrás a mano al preparar un borrador.</p>
      </div>
      {CAMPOS_CRITERIOS.map(f => (
        <div key={f.id}>
          <label htmlFor={`crit-${f.id}`} className="block text-xs font-semibold text-muted mb-1">{f.label}</label>
          {f.corto
            ? <input id={`crit-${f.id}`} value={edit[f.id]} onChange={e => setEdit({ ...edit, [f.id]: e.target.value })} maxLength={20} className={caja} />
            : <textarea id={`crit-${f.id}`} rows={3} value={edit[f.id]} onChange={e => setEdit({ ...edit, [f.id]: e.target.value })} maxLength={2000} className={caja} />}
          <p className="text-[11px] text-muted mt-0.5">{f.ayuda}</p>
        </div>
      ))}
      <button onClick={guardar} disabled={ocupado} className="px-4 py-2.5 rounded-xl bg-ink text-white text-xs font-bold disabled:opacity-40">{ocupado ? 'Guardando…' : 'Guardar criterios'}</button>
    </div>
  )
}
