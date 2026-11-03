import { useState } from 'react'
import { Copy, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { PROGRAMAS_PANELFIT, NIVELES_PROGRAMA, OBJETIVOS_PROGRAMA, filtrarProgramas, starterToTemplate, type NivelPrograma, type ObjetivoPrograma, type StarterTemplate } from '../../lib/starterTemplates'

const DIAS = [2, 3, 4, 5]

// Programas hechos por PanelFit, con filtros por días, nivel y objetivo. Añadir uno crea una copia en la librería del
// entrenador (como la galería de la comunidad), editable y reutilizable.
export function ProgramasPanelfit({ trainerId, onImported }: { trainerId: string; onImported: () => void }) {
  const [dias, setDias] = useState<number | null>(null)
  const [nivel, setNivel] = useState<NivelPrograma | null>(null)
  const [objetivo, setObjetivo] = useState<ObjetivoPrograma | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [anadiendo, setAnadiendo] = useState<string | null>(null)
  const lista = filtrarProgramas(PROGRAMAS_PANELFIT, { dias, nivel, objetivo })

  const anadir = async (p: StarterTemplate) => {
    setAnadiendo(p.key)
    const tmpl = starterToTemplate(p, trainerId)
    const { error } = await supabase.from('plan_templates').insert({
      id: tmpl.id, trainer_id: trainerId, name: tmpl.name, description: tmpl.description, plan: tmpl,
      created_at: tmpl.createdAt, updated_at: tmpl.updatedAt, label_ids: [], is_public: false,
    })
    setAnadiendo(null)
    if (error) { toast('Error al añadir a tu librería', 'warn'); return }
    toast(`"${p.name}" añadido a tu librería ✓`, 'ok')
    onImported()
  }

  const chip = (activo: boolean) => `px-2.5 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${activo ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`
  const fila = <T,>(label: string, opciones: { id: T; label: string }[], valor: T | null, set: (v: T | null) => void) => (
    <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label={label}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted w-16">{label}</span>
      {opciones.map(o => (
        <button key={String(o.id)} type="button" aria-pressed={valor === o.id} onClick={() => set(valor === o.id ? null : o.id)} className={chip(valor === o.id)}>{o.label}</button>
      ))}
    </div>
  )

  return (
    <section className="space-y-2" aria-label="Programas de PanelFit">
      <p className="text-xs text-muted">Programas listos de PanelFit, sin pesos (se ajustan a cada cliente). Añadirlo crea una copia en tu librería.</p>
      <div className="space-y-1.5">
        {fila('Días', DIAS.map(d => ({ id: d, label: `${d} días` })), dias, setDias)}
        {fila('Nivel', NIVELES_PROGRAMA, nivel, setNivel)}
        {fila('Objetivo', OBJETIVOS_PROGRAMA, objetivo, setObjetivo)}
      </div>
      {lista.length === 0 && <p className="text-sm text-muted text-center py-4">Ningún programa con esos filtros.</p>}
      {lista.map(p => (
        <div key={p.key} className="bg-bg border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3">
            <button type="button" onClick={() => setAbierto(abierto === p.key ? null : p.key)} aria-expanded={abierto === p.key} className="flex-1 min-w-0 text-left flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{p.name}</span>
                <span className="block text-xs text-muted">
                  {p.resumen} · {NIVELES_PROGRAMA.find(n => n.id === p.nivel)?.label} · {OBJETIVOS_PROGRAMA.find(o => o.id === p.objetivo)?.label}
                </span>
              </span>
              {abierto === p.key ? <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />}
            </button>
            <button type="button" onClick={() => anadir(p)} disabled={anadiendo === p.key} aria-label={`Añadir ${p.name} a mi librería`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40 flex-shrink-0">
              <Copy className="w-3.5 h-3.5" /> {anadiendo === p.key ? 'Añadiendo...' : 'Añadir'}
            </button>
          </div>
          {abierto === p.key && (
            <div className="border-t border-border px-4 py-3 space-y-2 bg-card">
              <p className="text-xs text-muted italic">{p.description}</p>
              {p.weeks[0].days.map((d, di) => (
                <div key={di} className="bg-bg border border-border rounded-xl px-3 py-2">
                  <p className="text-xs font-semibold mb-1">{d.title} — {d.focus}</p>
                  {d.exercises.map((e, ei) => (
                    <div key={ei} className="flex items-center gap-1.5 text-[11px] text-muted">
                      <Dumbbell className="w-2.5 h-2.5 flex-shrink-0" /><span className="flex-1 truncate">{e.name}</span><span className="flex-shrink-0">{e.sets}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
