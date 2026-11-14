import { useState } from 'react'
import { Copy, ChevronDown, ChevronUp, Dumbbell, Sparkles, Star } from 'lucide-react'
import { idPanelfit } from '../../lib/programasGuardados'
import { useProgramasGuardados } from '../../hooks/useProgramasGuardados'
import type { TrainingTemplate } from '../../types'
import { PROGRAMAS_PANELFIT, NIVELES_PROGRAMA, OBJETIVOS_PROGRAMA, filtrarProgramas, starterToTemplate, type NivelPrograma, type ObjetivoPrograma, type StarterTemplate } from '../../lib/starterTemplates'
import { recomendarProgramas, type Lugar } from '../../lib/recomendarPrograma'

const DIAS = [2, 3, 4, 5]

const chipQ = (activo: boolean) => `px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activo ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:border-accent'}`

// Cuatro preguntas y los programas que mejor encajan, con el porqué (lib/recomendarPrograma).
function CuestionarioPrograma({ anadiendo, onAnadir }: { anadiendo: string | null; onAnadir: (p: StarterTemplate) => void }) {
  const [dias, setDias] = useState<number | null>(null)
  const [nivel, setNivel] = useState<NivelPrograma | null>(null)
  const [objetivo, setObjetivo] = useState<ObjetivoPrograma | null>(null)
  const [lugar, setLugar] = useState<Lugar | null>(null)
  const pregunta = <T,>(texto: string, opciones: { id: T; label: string }[], valor: T | null, set: (v: T) => void) => (
    <div className="space-y-1">
      <p className="text-xs font-semibold">{texto}</p>
      <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label={texto}>
        {opciones.map(o => <button key={String(o.id)} type="button" role="radio" aria-checked={valor === o.id} onClick={() => set(o.id)} className={chipQ(valor === o.id)}>{o.label}</button>)}
      </div>
    </div>
  )
  const recs = dias && nivel && objetivo && lugar ? recomendarProgramas({ dias, nivel, objetivo, lugar }) : null
  return (
    <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 space-y-3" aria-label="Cuestionario de programa">
      {pregunta('¿Cuántos días por semana puede entrenar?', [2, 3, 4, 5].map(d => ({ id: d, label: d === 5 ? '5 o más' : String(d) })), dias, setDias)}
      {pregunta('¿Qué experiencia tiene?', NIVELES_PROGRAMA, nivel, setNivel)}
      {pregunta('¿Qué busca sobre todo?', OBJETIVOS_PROGRAMA, objetivo, setObjetivo)}
      {pregunta('¿Dónde entrena?', [{ id: 'gimnasio' as Lugar, label: 'Gimnasio' }, { id: 'casa' as Lugar, label: 'En casa (mancuernas)' }], lugar, setLugar)}
      {recs && (recs.length === 0 ? (
        <p className="text-sm text-muted">Ninguno encaja del todo: prueba con otro objetivo o nivel, o crea uno a medida.</p>
      ) : (
        <ol className="space-y-2" aria-label="Programas recomendados">
          {recs.map((r, i) => (
            <li key={r.programa.key} className="flex items-start gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
              <span className="w-5 h-5 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold">{r.programa.name}</span>
                <span className="block text-xs text-muted">{r.motivos.join(' · ') || r.programa.resumen}</span>
              </span>
              <button type="button" onClick={() => onAnadir(r.programa)} disabled={anadiendo === r.programa.key} aria-label={`Añadir ${r.programa.name} a mi librería`}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40 flex-shrink-0">
                <Copy className="w-3 h-3" /> Añadir
              </button>
            </li>
          ))}
        </ol>
      ))}
    </div>
  )
}

// Programas hechos por PanelFit, con filtros por días, nivel y objetivo. Añadir uno crea una copia en la librería del
// entrenador (como la galería de la comunidad), editable y reutilizable.
export function ProgramasPanelfit({ trainerId, onAdd }: { trainerId: string; onAdd: (tmpl: TrainingTemplate) => Promise<boolean> }) {
  const [dias, setDias] = useState<number | null>(null)
  const [nivel, setNivel] = useState<NivelPrograma | null>(null)
  const [objetivo, setObjetivo] = useState<ObjetivoPrograma | null>(null)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [anadiendo, setAnadiendo] = useState<string | null>(null)
  const [cuestionario, setCuestionario] = useState(false)
  const { guardados, esGuardado, alternar } = useProgramasGuardados(trainerId)
  const [soloGuardados, setSoloGuardados] = useState(false)
  const nGuardados = PROGRAMAS_PANELFIT.filter(p => guardados.includes(idPanelfit(p.key))).length
  const lista = filtrarProgramas(PROGRAMAS_PANELFIT, { dias, nivel, objetivo }).filter(p => !soloGuardados || esGuardado(idPanelfit(p.key)))

  const anadir = async (p: StarterTemplate) => {
    setAnadiendo(p.key)
    await onAdd(starterToTemplate(p, trainerId))
    setAnadiendo(null)
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
      <button type="button" onClick={() => setCuestionario(c => !c)} aria-expanded={cuestionario}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-accent/50 text-sm font-semibold text-accent hover:border-accent">
        <Sparkles className="w-4 h-4" /> ¿Cuál le va mejor? Responde 4 preguntas
      </button>
      {cuestionario && <CuestionarioPrograma anadiendo={anadiendo} onAnadir={anadir} />}
      <div className="space-y-1.5">
        {fila('Días', DIAS.map(d => ({ id: d, label: `${d} días` })), dias, setDias)}
        {fila('Nivel', NIVELES_PROGRAMA, nivel, setNivel)}
        {fila('Objetivo', OBJETIVOS_PROGRAMA, objetivo, setObjetivo)}
        {(nGuardados > 0 || soloGuardados) && (
          <button type="button" aria-pressed={soloGuardados} onClick={() => setSoloGuardados(v => !v)} className={chip(soloGuardados)}>★ Guardados ({nGuardados})</button>
        )}
      </div>
      {lista.length === 0 && <p className="text-sm text-muted text-center py-4">Ningún programa con esos filtros.</p>}
      {lista.map(p => (
        <div key={p.key} className="bg-bg border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3">
            <button type="button" onClick={() => alternar(idPanelfit(p.key))} aria-pressed={esGuardado(idPanelfit(p.key))}
              aria-label={esGuardado(idPanelfit(p.key)) ? `Quitar ${p.name} de guardados` : `Guardar ${p.name}`}
              className="p-1.5 -m-1 rounded-lg flex-shrink-0 hover:bg-bg-alt">
              <Star className={`w-4 h-4 ${esGuardado(idPanelfit(p.key)) ? 'fill-warn text-warn' : 'text-muted/60'}`} />
            </button>
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
