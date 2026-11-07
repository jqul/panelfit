import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { isDemoTrainerId } from '../../lib/demoIds'
import {
  ESCALAS_BASE, IDEAS_EXTRA, MAX_EXTRA, MAX_LABEL, ORDEN_BASE,
  limpiarConfigCheckin, nuevaPregunta, type ConfigCheckin, type PreguntaExtra,
} from '../../lib/checkinConfig'

const campo = 'w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20'

// Ajustes → "Check-in diario": qué escalas de siempre preguntar y hasta tres preguntas propias de 1 a 5
// (lib/checkinConfig). Se guarda en el perfil del entrenador, fusionando con lo último del servidor como los consejos.
export function CheckinEditor({ trainerId }: { trainerId: string }) {
  const [config, setConfig] = useState<ConfigCheckin | null>(null)
  const [sucio, setSucio] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const demo = isDemoTrainerId(trainerId)

  useEffect(() => {
    let vigente = true
    if (demo) { import('../../lib/demo-data').then(m => { if (vigente) setConfig(limpiarConfigCheckin(m.DEMO_TRAINER_PROFILE.checkin)) }); return () => { vigente = false } }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (vigente) setConfig(limpiarConfigCheckin((data?.profile as { checkin?: unknown } | null)?.checkin))
    })
    return () => { vigente = false }
  }, [trainerId, demo])

  if (!config) return null

  const cambiar = (c: ConfigCheckin) => { setConfig(c); setSucio(true) }
  const editarExtra = (id: string, parche: Partial<PreguntaExtra>) => cambiar({ ...config, extra: config.extra.map(e => e.id === id ? { ...e, ...parche } : e) })
  const alternar = (k: typeof ORDEN_BASE[number]) => cambiar({ ...config, escalas: ORDEN_BASE.filter(x => x === k ? !config.escalas.includes(k) : config.escalas.includes(x)) })
  const total = config.escalas.length + config.extra.filter(e => e.label.trim()).length

  const guardar = async () => {
    if (total === 0) { toast('Deja al menos una pregunta en el check-in', 'warn'); return }
    if (demo) { toast('En la demo no se guarda el check-in', 'info'); return }
    const limpia = limpiarConfigCheckin(config)
    setGuardando(true)
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const profile = { ...(data?.profile || {}), checkin: limpia, updatedAt: Date.now() }
    const { error } = await supabase.from('entrenadores').update({ profile }).eq('uid', trainerId)
    setGuardando(false)
    if (error) { toast('No se pudo guardar: ' + error.message, 'warn'); return }
    try {
      const clave = `pf_trainer_profile_${trainerId}`
      const local = JSON.parse(localStorage.getItem(clave) || '{}')
      localStorage.setItem(clave, JSON.stringify({ ...local, checkin: limpia }))
    } catch {}
    setConfig(limpia); setSucio(false)
    toast('Check-in guardado ✓', 'ok')
  }

  const ideas = IDEAS_EXTRA.filter(i => !config.extra.some(e => e.label.toLowerCase() === i.label.toLowerCase()))

  return (
    <section aria-label="Check-in diario" className="bg-card rounded-2xl p-6 space-y-4 shadow-sm">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Check-in diario</h3>
        <p className="text-xs text-muted mt-0.5">Lo que tus clientes responden cada día en Hoy, de 1 a 5. Pregunta solo lo que vayas a mirar: cuanto más corto, más lo hacen.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Escalas de siempre">
        {ORDEN_BASE.map(k => {
          const on = config.escalas.includes(k)
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => alternar(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${on ? 'bg-ink text-white border-ink' : 'bg-card border-border text-muted hover:text-ink'}`}>
              {ESCALAS_BASE[k].emoji} {ESCALAS_BASE[k].label}
            </button>
          )
        })}
      </div>
      {config.escalas.length < ORDEN_BASE.length && <p className="text-xs text-muted">Lo que quites deja de preguntarse: tus medias y el semáforo de riesgo usan solo lo que sí respondan.</p>}

      {config.extra.length > 0 && (
        <ul className="space-y-2" aria-label="Tus preguntas">
          {config.extra.map((e, i) => (
            <li key={e.id} className="border border-border rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input value={e.emoji} maxLength={4} aria-label={`Emoji de la pregunta ${i + 1}`} onChange={ev => editarExtra(e.id, { emoji: ev.target.value })} className={`${campo} w-14 text-center`} />
                <input value={e.label} maxLength={MAX_LABEL} aria-label={`Pregunta ${i + 1}`} placeholder="Qué preguntas" onChange={ev => editarExtra(e.id, { label: ev.target.value })} className={`${campo} font-semibold`} />
                <button type="button" onClick={() => cambiar({ ...config, extra: config.extra.filter(x => x.id !== e.id) })} aria-label={`Quitar la pregunta ${e.label || i + 1}`}
                  className="p-2 rounded-lg text-warn hover:bg-warn/5"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={e.bajo} maxLength={24} aria-label={`Qué es un 1 en ${e.label || `la pregunta ${i + 1}`}`} onChange={ev => editarExtra(e.id, { bajo: ev.target.value })} placeholder="1 =" className={campo} />
                <input value={e.alto} maxLength={24} aria-label={`Qué es un 5 en ${e.label || `la pregunta ${i + 1}`}`} onChange={ev => editarExtra(e.id, { alto: ev.target.value })} placeholder="5 =" className={campo} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {config.extra.length < MAX_EXTRA && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => cambiar({ ...config, extra: [...config.extra, nuevaPregunta(config)] })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-semibold text-muted hover:border-accent hover:text-accent">
            <Plus className="w-4 h-4" /> Pregunta propia
          </button>
          {ideas.map(i => (
            <button key={i.label} type="button" onClick={() => cambiar({ ...config, extra: [...config.extra, nuevaPregunta(config, i)] })}
              className="px-3 py-2 rounded-xl bg-bg-alt text-xs font-semibold text-muted hover:text-ink">+ {i.emoji} {i.label}</button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={guardar} disabled={!sucio || guardando}
          className="px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar check-in'}
        </button>
        {sucio && <span className="text-xs text-muted">{total} pregunta{total === 1 ? '' : 's'} · hay cambios sin guardar</span>}
      </div>
    </section>
  )
}
