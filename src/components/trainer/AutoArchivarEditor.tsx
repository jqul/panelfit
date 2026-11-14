import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { isDemoTrainerId } from '../../lib/demoIds'
import { DIAS_AUTO_ARCHIVAR, limpiarAutoArchivar, type AjusteAutoArchivar } from '../../lib/autoArchivar'

// Ajustes → "Archivar solos al terminar el plan" (lib/autoArchivar). Se guarda al tocarlo, fusionando con el perfil.
export function AutoArchivarEditor({ trainerId }: { trainerId: string }) {
  const [ajuste, setAjuste] = useState<AjusteAutoArchivar | null>(null)
  const demo = isDemoTrainerId(trainerId)

  useEffect(() => {
    let vivo = true
    if (demo) { setAjuste(limpiarAutoArchivar(undefined)); return }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (vivo) setAjuste(limpiarAutoArchivar((data?.profile as { autoArchivar?: unknown } | null)?.autoArchivar))
    })
    return () => { vivo = false }
  }, [trainerId, demo])

  if (!ajuste) return null

  const guardar = async (nuevo: AjusteAutoArchivar) => {
    const antes = ajuste
    setAjuste(nuevo)
    if (demo) return
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const { error } = await supabase.from('entrenadores').update({ profile: { ...(data?.profile || {}), autoArchivar: nuevo, updatedAt: Date.now() } }).eq('uid', trainerId)
    if (error) { setAjuste(antes); toast('No se pudo guardar: ' + error.message, 'warn') }
  }

  return (
    <section aria-label="Archivar al terminar el plan" className="bg-card rounded-2xl p-6 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Archivar al terminar el plan</h3>
          <p className="text-xs text-muted mt-0.5">
            Quien termina su plan, no tiene otro preparado y deja de entrenar pasa solo a Archivados (no cuenta en tu límite).
            Te avisamos en la Bandeja y puedes recuperarlo con un toque.
          </p>
        </div>
        <button role="switch" aria-checked={ajuste.activo} aria-label="Archivar solos al terminar el plan" onClick={() => guardar({ ...ajuste, activo: !ajuste.activo })}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${ajuste.activo ? 'bg-accent' : 'bg-border'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${ajuste.activo ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      {ajuste.activo && (
        <label className="flex items-center gap-2 text-sm">
          Cuando lleve
          <select value={ajuste.dias} onChange={e => guardar({ ...ajuste, dias: Number(e.target.value) })} aria-label="Días sin entrenar tras terminar"
            className="text-sm bg-bg border border-border rounded-lg px-2 py-1 outline-none">
            {DIAS_AUTO_ARCHIVAR.map(d => <option key={d} value={d}>{d} días</option>)}
          </select>
          sin entrenar tras terminar
        </label>
      )}
    </section>
  )
}
