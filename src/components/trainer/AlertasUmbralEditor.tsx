import { useEffect, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { isDemoTrainerId } from '../../lib/demoIds'
import { ESCALAS_BASE, ORDEN_BASE, type EscalaBase } from '../../lib/checkinConfig'
import { EJEMPLOS, MAX_REGLAS, describirRegla, limpiarReglas, type ReglaSinId, type ReglaUmbral } from '../../lib/alertasUmbral'

const num = 'w-16 text-sm text-center bg-bg border border-border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-accent/20'

// Ajustes → "Alertas por umbral": reglas propias que avisan en la Bandeja (lib/alertasUmbral). Se guardan en el perfil
// del entrenador, fusionando con lo último del servidor como los consejos y el check-in.
export function AlertasUmbralEditor({ trainerId }: { trainerId: string }) {
  const [reglas, setReglas] = useState<ReglaUmbral[] | null>(null)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const demo = isDemoTrainerId(trainerId)

  useEffect(() => {
    let vivo = true
    if (demo) { setReglas([]); return }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (vivo) setReglas(limpiarReglas((data?.profile as { alertasUmbral?: unknown } | null)?.alertasUmbral))
    })
    return () => { vivo = false }
  }, [trainerId, demo])

  if (!reglas) return null

  const cambiar = (r: ReglaUmbral[]) => { setReglas(r); setSucio(true) }
  const editar = (id: string, parche: Record<string, unknown>) => cambiar(reglas.map(r => (r.id === id ? { ...r, ...parche } as ReglaUmbral : r)))
  const nueva = (base: ReglaSinId) => {
    let n = reglas.length + 1
    while (reglas.some(r => r.id === `r${n}`)) n++
    cambiar([...reglas, { ...base, id: `r${n}` } as ReglaUmbral])
  }

  const guardar = async () => {
    if (demo) { toast('En la demo no se guardan las alertas', 'info'); return }
    const limpias = limpiarReglas(reglas)
    setGuardando(true)
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const profile = { ...(data?.profile || {}), alertasUmbral: limpias, updatedAt: Date.now() }
    const { error } = await supabase.from('entrenadores').update({ profile }).eq('uid', trainerId)
    setGuardando(false)
    if (error) { toast('No se pudo guardar: ' + error.message, 'warn'); return }
    try {
      const clave = `pf_trainer_profile_${trainerId}`
      localStorage.setItem(clave, JSON.stringify({ ...JSON.parse(localStorage.getItem(clave) || '{}'), alertasUmbral: limpias }))
    } catch {}
    setReglas(limpias); setSucio(false)
    toast('Alertas guardadas ✓ — salen en la Bandeja', 'ok')
  }

  const ejemplos = EJEMPLOS.filter(e => !reglas.some(r => describirRegla({ ...e, id: '' } as ReglaUmbral) === describirRegla(r)))

  return (
    <section aria-label="Alertas por umbral" className="bg-card rounded-2xl p-6 space-y-4 shadow-sm">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Alertas por umbral</h3>
        <p className="text-xs text-muted mt-0.5">Tus propias reglas: cuando un cliente las cumple, te sale en la Bandeja.</p>
      </div>

      {reglas.length === 0 && <p className="text-sm text-muted">No tienes ninguna. Empieza con un ejemplo y ajústalo.</p>}
      <ul className="space-y-2">
        {reglas.map((r, i) => (
          <li key={r.id} className="border border-border rounded-xl p-3 flex items-center gap-2 flex-wrap text-sm" aria-label={`Regla ${i + 1}`}>
            {r.tipo === 'peso' && (<>
              <span>⚖️ El peso cambia más de</span>
              <input type="number" min={0.5} max={20} step={0.5} value={r.kg} aria-label="Kilos" onChange={e => editar(r.id, { kg: Number(e.target.value) })} className={num} />
              <span>kg en</span>
              <input type="number" min={2} max={60} value={r.dias} aria-label="Días" onChange={e => editar(r.id, { dias: Number(e.target.value) })} className={num} />
              <span>días</span>
            </>)}
            {r.tipo === 'checkin' && (<>
              <span>📉</span>
              <select value={r.escala} aria-label="Escala del check-in" onChange={e => editar(r.id, { escala: e.target.value as EscalaBase })}
                className="text-sm bg-bg border border-border rounded-lg px-2 py-1">
                {ORDEN_BASE.map(k => <option key={k} value={k}>{ESCALAS_BASE[k].label}</option>)}
              </select>
              <span>a</span>
              <input type="number" min={1} max={4} value={r.max} aria-label="Valor máximo" onChange={e => editar(r.id, { max: Number(e.target.value) })} className={num} />
              <span>o menos</span>
              <input type="number" min={1} max={14} value={r.dias} aria-label="Días seguidos" onChange={e => editar(r.id, { dias: Number(e.target.value) })} className={num} />
              <span>días seguidos</span>
            </>)}
            {r.tipo === 'inactivo' && (<>
              <span>💤</span>
              <input type="number" min={2} max={60} value={r.dias} aria-label="Días sin entrenar" onChange={e => editar(r.id, { dias: Number(e.target.value) })} className={num} />
              <span>días sin entrenar</span>
            </>)}
            <button type="button" onClick={() => cambiar(reglas.filter(x => x.id !== r.id))} aria-label={`Quitar la regla ${i + 1}`}
              className="ml-auto p-1.5 rounded-lg text-warn hover:bg-warn/5"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>

      {reglas.length < MAX_REGLAS && (
        <div className="flex flex-wrap gap-2">
          {ejemplos.map(e => (
            <button key={describirRegla({ ...e, id: '' } as ReglaUmbral)} type="button" onClick={() => nueva(e)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg-alt text-xs font-semibold text-muted hover:text-ink">
              <Plus className="w-3.5 h-3.5" aria-hidden /> {describirRegla({ ...e, id: '' } as ReglaUmbral)}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={guardar} disabled={!sucio || guardando}
          className="px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar alertas'}
        </button>
        {sucio && <span className="text-xs text-muted">Hay cambios sin guardar</span>}
      </div>
    </section>
  )
}
