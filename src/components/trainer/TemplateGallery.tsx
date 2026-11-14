import { useState, useEffect } from 'react'
import { Store, Copy, X, ChevronDown, ChevronUp, Dumbbell, Star } from 'lucide-react'
import { idComunidad } from '../../lib/programasGuardados'
import { useProgramasGuardados } from '../../hooks/useProgramasGuardados'
import { supabase } from '../../lib/supabase'
import { TrainingTemplate } from '../../types'
import { Modal } from '../shared/Modal'
import { ProgramasPanelfit } from './ProgramasPanelfit'

interface PublicRow { id: string; trainer_id: string; name: string; description: string; plan: TrainingTemplate; trainer_name?: string }

// «Añadir» no guarda aquí: se lo pasa a Workouts (`onAdd`), que guarda igual que cualquier otro workout (también en la demo).
export function TemplateGallery({ trainerId, onClose, onAdd }: {
  trainerId: string; onClose: () => void; onAdd: (tmpl: TrainingTemplate) => Promise<boolean>
}) {
  const [rows, setRows] = useState<PublicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pestana, setPestana] = useState<'panelfit' | 'comunidad'>('panelfit')
  const { esGuardado, alternar } = useProgramasGuardados(trainerId)
  const [soloGuardados, setSoloGuardados] = useState(false)
  const nGuardados = rows.filter(r => esGuardado(idComunidad(r.id))).length
  const visibles = soloGuardados ? rows.filter(r => esGuardado(idComunidad(r.id))) : rows

  useEffect(() => {
    supabase.from('plan_templates').select('id, trainer_id, name, description, plan')
      .eq('is_public', true).order('created_at', { ascending: false })
      .then(({ data }) => { setRows((data || []) as PublicRow[]); setLoading(false) })
  }, [])

  const importTemplate = async (row: PublicRow) => {
    setImporting(row.id)
    const tmpl: TrainingTemplate = { ...row.plan, id: `tmpl_${Date.now()}`, trainerId, name: `${row.name} (de la comunidad)`, description: row.description || '', createdAt: Date.now(), updatedAt: Date.now(), isPublic: false, label_ids: [] }
    await onAdd(tmpl)
    setImporting(null)
  }

  return (
    <Modal open plain onClose={onClose} ariaLabel="Galería de workouts" maxWidth="max-w-lg">
        <div className="flex items-center justify-between p-5 pb-3 border-b border-border flex-shrink-0">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2"><Store className="w-5 h-5" /> Galería de workouts</h2>
          <button aria-label="Cerrar" onClick={onClose} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-4 px-5 border-b border-border/70 flex-shrink-0" role="tablist" aria-label="Origen de los workouts">
          {([['panelfit', 'Programas de PanelFit'], ['comunidad', 'De la comunidad']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
              className={`py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${pestana === id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="p-5 pt-4 space-y-2 overflow-y-auto flex-1">
          {pestana === 'panelfit' ? <ProgramasPanelfit trainerId={trainerId} onAdd={onAdd} /> : (<>
          <p className="text-xs text-muted mb-2">Workouts que otros entrenadores han compartido públicamente. Añadirlo crea una copia en tu propia librería.</p>
          {(nGuardados > 0 || soloGuardados) && (
            <button type="button" aria-pressed={soloGuardados} onClick={() => setSoloGuardados(v => !v)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${soloGuardados ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>★ Guardados ({nGuardados})</button>
          )}
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-bg border border-border rounded-2xl animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aún no hay workouts compartidos. ¡Sé el primero!</p>
            </div>
          ) : visibles.map(row => (
            <div key={row.id} className="bg-bg border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                <button type="button" onClick={e => { e.stopPropagation(); alternar(idComunidad(row.id)) }} aria-pressed={esGuardado(idComunidad(row.id))}
              aria-label={esGuardado(idComunidad(row.id)) ? `Quitar ${row.name} de guardados` : `Guardar ${row.name}`}
              className="p-1.5 -m-1 rounded-lg flex-shrink-0 hover:bg-bg-alt">
              <Star className={`w-4 h-4 ${esGuardado(idComunidad(row.id)) ? 'fill-warn text-warn' : 'text-muted/60'}`} />
            </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{row.name}</p>
                  <p className="text-xs text-muted">{row.plan?.weeks?.length || 0} sem · {row.plan?.weeks?.[0]?.days?.length || 0} días{row.plan?.type ? ` · ${row.plan.type}` : ''}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); importTemplate(row) }} disabled={importing === row.id || row.trainer_id === trainerId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40 flex-shrink-0">
                  <Copy className="w-3.5 h-3.5" /> {row.trainer_id === trainerId ? 'Tuyo' : importing === row.id ? 'Añadiendo...' : 'Añadir a mi librería'}
                </button>
                {expanded === row.id ? <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />}
              </div>

              {expanded === row.id && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-card">
                  {row.description && <p className="text-xs text-muted italic">{row.description}</p>}
                  {(row.plan?.weeks || []).map((week, wi) => (
                    <div key={wi}>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">{week.label}</p>
                      <div className="space-y-2">
                        {week.days.map((day, di) => (
                          <div key={di} className="bg-bg border border-border rounded-xl px-3 py-2">
                            <p className="text-xs font-semibold mb-1">{day.title}{day.focus ? ` — ${day.focus}` : ''}</p>
                            <div className="space-y-0.5">
                              {day.exercises.map((ex, ei) => (
                                <div key={ei} className="flex items-center gap-1.5 text-[11px] text-muted">
                                  <Dumbbell className="w-2.5 h-2.5 flex-shrink-0" />
                                  <span className="flex-1 truncate">{ex.name}</span>
                                  <span className="flex-shrink-0">{ex.sets} · {ex.weight}</span>
                                </div>
                              ))}
                              {day.exercises.length === 0 && <p className="text-[11px] text-muted/60">Sin ejercicios</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          </>)}
        </div>
      </Modal>
  )
}
