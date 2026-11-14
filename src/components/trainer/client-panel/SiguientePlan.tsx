import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import type { TrainingPlan, TrainingTemplate } from '../../../types'
import { toast } from '../../shared/Toast'
import { empiezaSiguiente, guardarSiguiente, leerSiguiente, siguienteDesdeWorkout, type PlanSiguiente } from '../../../lib/planEnlazado'
import { DIAS_RENOVAR, mensajeRenovacion } from '../../../lib/renovacion'
import { waUrl } from '../../../lib/bulkActions'
import { localDateKey } from '../../../lib/dates'

const fechaLarga = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

// Pestaña Plan: «Cuando termine este plan», el workout que empieza solo al acabar el actual (lib/planEnlazado).
export function SiguientePlan({ clientId, trainerId, plan, templates, borradorActivo, nombre = '', telefono }: {
  clientId: string
  /** Para el mensaje de renovación (lib/renovacion). */
  nombre?: string
  telefono?: string
  trainerId: string
  plan: TrainingPlan
  templates: TrainingTemplate[]
  borradorActivo: boolean
}) {
  const [siguiente, setSiguiente] = useState<PlanSiguiente | null | undefined>()
  const [eligiendo, setEligiendo] = useState(false)
  const [elegido, setElegido] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vivo = true
    setSiguiente(undefined)
    leerSiguiente(clientId, trainerId).then(s => { if (vivo) setSiguiente(s) })
    return () => { vivo = false }
  }, [clientId, trainerId])

  const empieza = empiezaSiguiente(plan)
  const diasParaFin = empieza ? Math.round((new Date(empieza + 'T12:00:00').getTime() - new Date(localDateKey() + 'T12:00:00').getTime()) / 86400000) : null
  if (siguiente === undefined || !plan.weeks?.length) return null

  const guardar = async (s: PlanSiguiente | null) => {
    setGuardando(true)
    const ok = await guardarSiguiente(clientId, trainerId, s)
    setGuardando(false)
    if (!ok) { toast('No se pudo guardar el siguiente plan', 'warn'); return }
    setSiguiente(s); setEligiendo(false); setElegido('')
    toast(s ? `«${s.nombre}» empezará cuando termine este plan ✓` : 'Ya no hay nada preparado después de este plan', 'ok')
  }
  const preparar = () => {
    const t = templates.find(x => x.id === elegido)
    if (t?.weeks?.length) guardar(siguienteDesdeWorkout(t))
  }

  return (
    <section aria-label="Cuando termine este plan" className="flex-shrink-0 mb-3 px-4 py-3 bg-card border border-border rounded-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" aria-hidden />
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs font-bold text-muted uppercase tracking-wider">Cuando termine este plan</p>
          {!empieza ? (
            <p className="text-sm text-muted">Ponle fecha de inicio al plan para poder preparar el siguiente.</p>
          ) : siguiente ? (
            <p className="text-sm text-ink">Empieza <strong>«{siguiente.nombre}»</strong> ({siguiente.weeks.length} sem.) el {fechaLarga(empieza)}</p>
          ) : (
            <p className="text-sm text-muted">Prepara el siguiente workout y empezará solo el {fechaLarga(empieza)}.</p>
          )}
        </div>
        {empieza && !eligiendo && (
          <div className="flex gap-2 flex-shrink-0">
            {siguiente && (
              <button onClick={() => guardar(null)} disabled={guardando}
                className="px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-warn hover:text-warn transition-colors disabled:opacity-50">
                Quitar
              </button>
            )}
            <button onClick={() => setEligiendo(true)} disabled={guardando}
              className="px-3 py-1.5 border border-border rounded-xl text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors disabled:opacity-50">
              {siguiente ? 'Cambiar' : 'Preparar siguiente'}
            </button>
          </div>
        )}
      </div>
      {eligiendo && (
        templates.length === 0 ? (
          <p className="mt-2 text-xs text-muted">No tienes workouts en tu librería. Crea uno en Workouts para prepararlo aquí.</p>
        ) : (
          <div className="mt-3 flex gap-2 flex-wrap items-center">
            <select aria-label="Siguiente workout" value={elegido} onChange={e => setElegido(e.target.value)}
              className="flex-1 min-w-[180px] text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20">
              <option value="">Elige un workout…</option>
              {templates.filter(t => t.weeks?.length).map(t => <option key={t.id} value={t.id}>{t.name} ({t.weeks.length} sem.)</option>)}
            </select>
            <button onClick={() => { setEligiendo(false); setElegido('') }}
              className="px-3 py-2 border border-border rounded-xl text-xs font-semibold text-muted hover:text-ink">
              Cancelar
            </button>
            <button onClick={preparar} disabled={!elegido || guardando}
              className="px-3 py-2 bg-ink text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Preparar'}
            </button>
          </div>
        )
      )}
      {empieza && !siguiente && diasParaFin !== null && diasParaFin >= 0 && diasParaFin <= DIAS_RENOVAR && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <p className="text-xs text-accent font-semibold flex-1 min-w-[180px]">🔄 Termina en {diasParaFin} día{diasParaFin === 1 ? '' : 's'}: buen momento para proponerle seguir.</p>
          {waUrl(telefono, mensajeRenovacion(nombre, empieza)) ? (
            <a href={waUrl(telefono, mensajeRenovacion(nombre, empieza))!} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-ok/10 text-ok hover:bg-ok/20">Proponer por WhatsApp</a>
          ) : (
            <button type="button" onClick={() => navigator.clipboard.writeText(mensajeRenovacion(nombre, empieza)).then(() => toast('Mensaje copiado', 'ok'), () => toast('No se pudo copiar', 'warn'))}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-border text-muted hover:text-ink">Copiar mensaje de renovación</button>
          )}
        </div>
      )}
      {siguiente && borradorActivo && (
        <p className="mt-2 text-xs text-muted">Mientras tengas el borrador abierto no cambia: empezará cuando lo publiques.</p>
      )}
    </section>
  )
}
