import { useState, useEffect } from 'react'
import { Store, Copy, X, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TrainingTemplate } from '../../types'
import { toast } from '../shared/Toast'

interface PublicRow { id: string; trainer_id: string; name: string; description: string; plan: TrainingTemplate; trainer_name?: string }

export function TemplateGallery({ trainerId, onClose, onImported }: {
  trainerId: string; onClose: () => void; onImported: () => void
}) {
  const [rows, setRows] = useState<PublicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('plan_templates').select('id, trainer_id, name, description, plan')
      .eq('is_public', true).order('created_at', { ascending: false })
      .then(({ data }) => { setRows((data || []) as PublicRow[]); setLoading(false) })
  }, [])

  const importTemplate = async (row: PublicRow) => {
    setImporting(row.id)
    const tmpl: TrainingTemplate = { ...row.plan, id: `tmpl_${Date.now()}`, trainerId, name: `${row.name} (de la comunidad)`, createdAt: Date.now(), updatedAt: Date.now(), isPublic: false }
    const { error } = await supabase.from('plan_templates').insert({
      id: tmpl.id, trainer_id: trainerId, name: tmpl.name, description: row.description || '', plan: tmpl,
      created_at: tmpl.createdAt, updated_at: tmpl.updatedAt, label_ids: [], is_public: false,
    })
    setImporting(null)
    if (error) { toast('Error al añadir a tu librería', 'warn'); return }
    toast(`"${row.name}" añadido a tu librería ✓`, 'ok')
    onImported()
  }

  return (
    <div className="fixed inset-0 z-[70] bg-ink/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-3 border-b border-border flex-shrink-0">
          <h2 className="font-serif text-xl font-bold flex items-center gap-2"><Store className="w-5 h-5" /> Galería de la comunidad</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 pt-4 space-y-2 overflow-y-auto flex-1">
          <p className="text-xs text-muted mb-2">Workouts que otros entrenadores han compartido públicamente. Añadirlo crea una copia en tu propia librería.</p>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-bg border border-border rounded-2xl animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aún no hay workouts compartidos. ¡Sé el primero!</p>
            </div>
          ) : rows.map(row => (
            <div key={row.id} className="bg-bg border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
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
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">{week.label}</p>
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
        </div>
      </div>
    </div>
  )
}
