import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Search, User, Zap, Dumbbell, Layers, ListChecks, CornerDownLeft } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { supabase } from '../../lib/supabase'
import { DEMO_PLAN_TEMPLATES, DEMO_PROGRAMS } from '../../lib/demo-data'
import { searchAll, type ResultKind, type Searchable } from '../../lib/globalSearch'
import type { ClientData, LibraryExercise } from '../../types'

export interface GlobalSearchAction { id: string; title: string; keywords?: string; run: () => void }

interface Props {
  open: boolean
  onClose: () => void
  trainerId: string
  isDemo: boolean
  clients: ClientData[]
  exercises: LibraryExercise[]
  actions: GlobalSearchAction[]
  onClient: (c: ClientData) => void
  onExercise: (name: string) => void
  onTemplate: (name: string) => void
  onProgram: (name: string) => void
}

const ICON: Record<ResultKind, ReactNode> = {
  cliente: <User className="w-4 h-4" />,
  accion: <Zap className="w-4 h-4" />,
  plantilla: <Dumbbell className="w-4 h-4" />,
  programa: <Layers className="w-4 h-4" />,
  ejercicio: <ListChecks className="w-4 h-4" />,
}

type Named = { id: string; name: string; sub?: string }

export function GlobalSearch({ open, onClose, trainerId, isDemo, clients, exercises, actions, onClient, onExercise, onTemplate, onProgram }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [templates, setTemplates] = useState<Named[]>([])
  const [programs, setPrograms] = useState<Named[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  // Los nombres de workouts y programas se piden solo al abrir (no hay que cargarlos con el panel).
  useEffect(() => {
    if (!open) return
    setQuery(''); setActive(0)
    if (isDemo) {
      setTemplates(DEMO_PLAN_TEMPLATES.map(t => ({ id: t.id, name: t.name, sub: t.type })))
      setPrograms((DEMO_PROGRAMS as any[]).map(p => ({ id: p.id, name: p.name, sub: p.tipo })))
      return
    }
    let cancelled = false
    Promise.all([
      supabase.from('plan_templates').select('id, name').eq('trainer_id', trainerId).order('created_at', { ascending: false }).limit(300),
      supabase.from('programs').select('id, name, tipo').eq('trainer_id', trainerId).order('created_at', { ascending: false }).limit(300),
    ]).then(([t, p]) => {
      if (cancelled) return
      if (t.data) setTemplates(t.data.map((r: any) => ({ id: r.id, name: r.name })))
      if (p.data) setPrograms(p.data.map((r: any) => ({ id: r.id, name: r.name, sub: r.tipo })))
    }).catch(() => { /* sin red: se busca entre lo que ya hay */ })
    return () => { cancelled = true }
  }, [open, isDemo, trainerId])

  const items = useMemo<Searchable[]>(() => [
    ...clients.map(c => ({
      id: c.id, kind: 'cliente' as const,
      title: `${c.name} ${c.surname || ''}`.trim(),
      subtitle: c.objetivo ? c.objetivo[0].toUpperCase() + c.objetivo.slice(1) : undefined,
      keywords: c.phone, // el objetivo escrito ("200 kg en sentadilla") metía clientes al buscar un ejercicio
    })),
    ...actions.map(a => ({ id: a.id, kind: 'accion' as const, title: a.title, keywords: a.keywords })),
    ...templates.map(t => ({ id: t.id, kind: 'plantilla' as const, title: t.name, subtitle: t.sub })),
    ...programs.map(p => ({ id: p.id, kind: 'programa' as const, title: p.name, subtitle: p.sub })),
    ...exercises.map(e => ({ id: e.id, kind: 'ejercicio' as const, title: e.name, subtitle: e.category })),
  ], [clients, actions, templates, programs, exercises])

  const groups = useMemo(() => searchAll(items, query), [items, query])
  const flat = useMemo(() => groups.flatMap(g => g.results), [groups])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }) }, [active])

  const pick = (r: Searchable) => {
    onClose()
    if (r.kind === 'cliente') { const c = clients.find(x => x.id === r.id); if (c) onClient(c) }
    else if (r.kind === 'accion') actions.find(a => a.id === r.id)?.run()
    else if (r.kind === 'plantilla') onTemplate(r.title)
    else if (r.kind === 'programa') onProgram(r.title)
    else onExercise(r.title)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(flat.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); pick(flat[active]) }
  }

  let n = -1
  return (
    <Modal open={open} onClose={onClose} plain ariaLabel="Búsqueda global" maxWidth="max-w-xl">
      <div onKeyDown={onKeyDown} className="flex flex-col min-h-0">
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted flex-shrink-0" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            role="combobox" aria-expanded aria-controls="busqueda-global-lista" aria-activedescendant={flat[active] ? `bg-${flat[active].kind}-${flat[active].id}` : undefined}
            placeholder="Buscar cliente, ejercicio, workout o acción…" aria-label="Buscar"
            className="flex-1 py-4 bg-transparent outline-none text-sm placeholder:text-muted" />
          <kbd className="hidden sm:block text-[11px] font-semibold text-muted border border-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div ref={listRef} id="busqueda-global-lista" role="listbox" aria-label="Resultados" className="overflow-y-auto p-2 max-h-[60dvh]">
          {groups.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-muted">{query.trim() ? `Nada coincide con “${query.trim()}”` : 'Escribe para buscar'}</p>
          )}
          {groups.map(g => (
            <div key={g.kind} role="group" aria-label={g.titulo} className="mb-1">
              <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">{g.titulo}</p>
              {g.results.map(r => {
                const idx = ++n
                const on = idx === active
                return (
                  <button key={`${r.kind}-${r.id}`} id={`bg-${r.kind}-${r.id}`} role="option" aria-selected={on} data-active={on}
                    onClick={() => pick(r)} onMouseMove={() => setActive(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left ${on ? 'bg-ink text-white' : 'hover:bg-bg-alt'}`}>
                    <span className={on ? 'text-white/80' : 'text-muted'}>{ICON[r.kind]}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate">{r.title}</span>
                      {r.subtitle && <span className={`block text-xs truncate ${on ? 'text-white/70' : 'text-muted'}`}>{r.subtitle}</span>}
                    </span>
                    {on && <CornerDownLeft className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
