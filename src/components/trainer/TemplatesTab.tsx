import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData, TrainingTemplate } from '../../types'
import { toast } from '../shared/Toast'
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, ClipboardCheck } from 'lucide-react'

interface Props {
  trainerId: string
  clients: ClientData[]
}

const LS_KEY = (uid: string) => `pf_templates_${uid}`
const LS_MIGRATED = (uid: string) => `pf_tmpl_migrated_${uid}`

export function TemplatesTab({ trainerId, clients }: Props) {
  const [templates, setTemplates] = useState<TrainingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!trainerId) return

    // Cargar caché local inmediatamente
    try {
      const cached = localStorage.getItem(LS_KEY(trainerId))
      if (cached) setTemplates(JSON.parse(cached))
    } catch {}

    loadFromSupabase()
  }, [trainerId])

  const loadFromSupabase = async () => {
    setLoading(true)

    // Migrar desde localStorage si no se ha hecho
    const migrated = localStorage.getItem(LS_MIGRATED(trainerId))
    if (!migrated) {
      try {
        const local: TrainingTemplate[] = JSON.parse(localStorage.getItem(LS_KEY(trainerId)) || '[]')
        if (local.length > 0) {
          const rows = local.map(t => ({
            id: t.id || `tmpl_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            trainer_id: trainerId,
            name: t.name || 'Plantilla',
            description: (t as any).description || '',
            plan: t,
            created_at: Date.now(),
            updated_at: Date.now(),
          }))
          const { error } = await supabase.from('plan_templates').upsert(rows, { onConflict: 'id' })
          if (!error) {
            localStorage.setItem(LS_MIGRATED(trainerId), '1')
            console.log(`[PanelFit] ${local.length} plantillas migradas a Supabase ✓`)
          }
        } else {
          localStorage.setItem(LS_MIGRATED(trainerId), '1')
        }
      } catch {}
    }

    // Cargar desde Supabase
    const { data, error } = await supabase
      .from('plan_templates')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const parsed: TrainingTemplate[] = data.map((r: any) => ({
        ...r.plan,
        id: r.id,
        name: r.name,
        description: r.description,
      }))
      setTemplates(parsed)
      localStorage.setItem(LS_KEY(trainerId), JSON.stringify(parsed))
    }
    setLoading(false)
  }

  const saveTemplate = async (tmpl: TrainingTemplate) => {
    setSaving(true)
    const row = {
      id: tmpl.id,
      trainer_id: trainerId,
      name: tmpl.name || 'Plantilla',
      description: (tmpl as any).description || '',
      plan: tmpl,
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    const { error } = await supabase.from('plan_templates').upsert(row, { onConflict: 'id' })
    if (error) { toast('Error al guardar plantilla', 'warn'); setSaving(false); return }

    const updated = templates.find(t => t.id === tmpl.id)
      ? templates.map(t => t.id === tmpl.id ? tmpl : t)
      : [tmpl, ...templates]
    setTemplates(updated)
    localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
    toast('Plantilla guardada ✓', 'ok')
    setSaving(false)
  }

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('plan_templates').delete().eq('id', id)
    if (error) { toast('Error al eliminar', 'warn'); return }
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem(LS_KEY(trainerId), JSON.stringify(updated))
    toast('Plantilla eliminada', 'ok')
  }

  const duplicateTemplate = async (tmpl: TrainingTemplate) => {
    const copy: TrainingTemplate = {
      ...tmpl,
      id: `tmpl_${Date.now()}`,
      name: `${tmpl.name} (copia)`,
    }
    await saveTemplate(copy)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Plantillas</h2>
          <p className="text-muted text-sm mt-1">
            Planes reutilizables que puedes aplicar a cualquier cliente
          </p>
        </div>
        <span className="text-sm text-muted">{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Info */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 flex items-start gap-2">
        <ClipboardCheck className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted">
          Las plantillas se guardan en la nube y están disponibles en cualquier dispositivo.
          Para crear una plantilla, ve al plan de un cliente y usa el botón <strong>"Guardar como plantilla"</strong>.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl text-muted">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-serif text-lg font-bold">Sin plantillas</p>
          <p className="text-sm mt-1 max-w-xs mx-auto">
            Crea el plan de un cliente, pulsa <strong>"Guardar como plantilla"</strong> y aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)}>
                  <p className="font-semibold truncate">{tmpl.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-muted">
                      {(tmpl as any).weeks?.length || 0} semanas
                      {' · '}
                      {(tmpl as any).diasSemana || 0} días/semana
                    </p>
                    {(tmpl as any).type && (
                      <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold capitalize">
                        {(tmpl as any).type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => duplicateTemplate(tmpl)}
                    title="Duplicar"
                    className="p-1.5 text-muted hover:text-accent rounded-lg transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteTemplate(tmpl.id)}
                    title="Eliminar"
                    className="p-1.5 text-muted hover:text-warn rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)}
                    className="p-1.5 text-muted rounded-lg">
                    {expanded === tmpl.id
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Detalle expandido */}
              {expanded === tmpl.id && (
                <div className="border-t border-border px-5 py-4 space-y-3">
                  {/* Semanas */}
                  {((tmpl as any).weeks || []).map((week: any, wi: number) => (
                    <div key={wi} className="space-y-1">
                      <p className="text-xs font-bold text-muted uppercase tracking-wider">{week.label}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(week.days || []).map((day: any, di: number) => (
                          <div key={di} className="bg-bg border border-border rounded-lg px-3 py-2">
                            <p className="text-xs font-semibold truncate">{day.title}</p>
                            <p className="text-[10px] text-muted">{day.exercises?.length || 0} ejercicios</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Clientes que la usan */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-muted uppercase tracking-wider mb-2 font-semibold">
                      Aplicar a cliente
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {clients.map(c => (
                        <button key={c.id}
                          className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted hover:border-accent hover:text-accent transition-colors">
                          {c.name} {c.surname}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
