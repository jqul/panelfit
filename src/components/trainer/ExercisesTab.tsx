import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Settings2, Dumbbell, MoreHorizontal, SlidersHorizontal, Upload, AlertCircle } from 'lucide-react'
import { ActionMenu } from '../shared/ActionMenu'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { LibraryExercise, LibraryVideo } from '../../types'
import { ESPECIALIDADES } from '../../lib/especialidades'
import { categoryCounts } from '../../lib/exerciseRow'
import {
  filtrar, recomendados, resumen, materialCounts, porRelevancia, nombreDeCopia, type Chip,
} from '../../lib/exerciseLibrary'
import type { NewExercise } from '../../hooks/useExerciseLibrary'
import { FAV_KEY, CATS_KEY, ESPS_KEY, TAGS_KEY, DEFAULT_CATS, TagBadge, load, save, type CustomTag } from './exercises/classification'
import { ConfigPanel } from './exercises/ConfigPanel'
import { ExerciseForm, formFrom, type FormState } from './exercises/ExerciseForm'
import { ExerciseCard } from './exercises/ExerciseCard'
import { QuickAddExercise } from './exercises/QuickAddExercise'
import { ImportExercises } from './exercises/ImportExercises'

export type { CustomTag, CustomEsp } from './exercises/classification'

interface Props {
  exercises: LibraryExercise[]
  /** Archivados: no salen al crear planes, pero se pueden recuperar desde aquí. */
  archived: LibraryExercise[]
  trainerId: string
  /** Texto con el que abre el buscador (viene de la búsqueda global). */
  initialSearch?: string
  onAdd: (name: string, desc: string, cat: string, videos: LibraryVideo[], esps: string[], tags: string[], extra?: { material?: string; alternativas?: string[] }) => Promise<LibraryExercise> | void
  onUpdate: (id: string, updates: Partial<LibraryExercise>) => void
  onDelete: (id: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  onImport: (list: NewExercise[]) => Promise<number> | number
}

const PAGE_SIZE = 60
const chipCls = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap flex-shrink-0 transition-all ${on ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`

export function ExercisesTab({ exercises, archived, trainerId, initialSearch = '', onAdd, onUpdate, onDelete, onArchive, onRestore, onImport }: Props) {
  const [search, setSearch]       = useState(initialSearch)
  const [chip, setChip]           = useState<Chip>('todos')
  const [filterCat, setFilterCat] = useState('')
  const [filterMat, setFilterMat] = useState('')
  const [filterEsp, setFilterEsp] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [favs, setFavs] = useState<Set<string>>(() => new Set(load(FAV_KEY(trainerId), [] as string[])))
  const [editing, setEditing]     = useState<LibraryExercise | null>(null)
  const [showQuick, setShowQuick] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n => n + 1)

  const toggleFav = (id: string) => {
    const next = new Set(favs)
    next.has(id) ? next.delete(id) : next.add(id)
    setFavs(next)
    save(FAV_KEY(trainerId), Array.from(next))
  }

  const cats    = load(CATS_KEY(trainerId), DEFAULT_CATS)
  const esps    = load<{ id: string; label: string; emoji: string }[]>(ESPS_KEY(trainerId), [])
  const tags    = load<CustomTag[]>(TAGS_KEY(trainerId), [])
  const allEsps = [...ESPECIALIDADES.map(e => ({ id: e.value, label: e.label, emoji: e.emoji })), ...esps]

  const all = useMemo(() => [...exercises, ...archived], [exercises, archived])
  const stats = useMemo(() => resumen(all, favs), [all, favs])
  const catChips = useMemo(() => categoryCounts(exercises), [exercises])
  const matChips = useMemo(() => materialCounts(exercises), [exercises])
  const extraFilters = [filterEsp, filterTag].filter(Boolean).length

  const filtered = useMemo(() => {
    let list = filtrar(all, { query: search, chip, category: filterCat, material: filterMat, favs })
    if (filterEsp) list = list.filter(e => (e.especialidades || []).includes(filterEsp))
    if (filterTag) list = list.filter(e => (e.tags || []).includes(filterTag))
    // Los favoritos primero (como antes); en "Más usados", por uso.
    return chip === 'usados' ? porRelevancia(list, favs) : [...list].sort((a, b) => (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0))
  }, [all, search, chip, filterCat, filterMat, filterEsp, filterTag, favs])

  // Con una biblioteca de 1500+ ejercicios, pintar la lista sin filtrar de golpe bloquea el hilo principal varios
  // segundos en un móvil de gama media: se muestran de 60 en 60 y el contador vuelve a 60 al cambiar cualquier filtro.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, chip, filterCat, filterMat, filterEsp, filterTag])
  const visible = filtered.slice(0, visibleCount)

  const sinFiltros = chip === 'todos' && !search.trim() && !filterCat && !filterMat && !extraFilters
  const recomendadosHoy = useMemo(() => sinFiltros ? recomendados(exercises, favs, 4) : [], [sinFiltros, exercises, favs])
  const hayHuecos = stats.muyUsadosSinVideo > 0 || stats.muyUsadosSinAlternativa > 0

  const clearAll = () => { setSearch(''); setChip('todos'); setFilterCat(''); setFilterMat(''); setFilterEsp(''); setFilterTag('') }

  // ── Acciones ──────────────────────────────────────────
  const create = async (f: { name: string; material: string; category: string }, completar: boolean) => {
    const ex = await onAdd(f.name, '', f.category, [], [], [], { material: f.material })
    if (completar && ex) setEditing(ex)
  }
  const duplicate = async (ex: LibraryExercise) => {
    const name = nombreDeCopia(ex.name, all.map(e => e.name))
    const copy = await onAdd(name, ex.description || '', ex.category || '', ex.videos || [], ex.especialidades || [], ex.tags || [], { material: ex.material, alternativas: ex.alternativas })
    toast(`Duplicado como «${name}»`, 'ok')
    if (copy) setEditing(copy)
  }
  const archive = (ex: LibraryExercise) => { onArchive(ex.id); toast(`«${ex.name}» archivado. Sigue en tus planes antiguos; lo recuperas en Archivados.`, 'ok') }
  const remove = (ex: LibraryExercise) => { if (window.confirm(`¿Eliminar "${ex.name}" de tu biblioteca?`)) onDelete(ex.id) }
  const save_ = (ex: LibraryExercise, f: FormState) => { onUpdate(ex.id, f); setEditing(null) }
  const doImport = async (rows: NewExercise[]) => {
    const n = await onImport(rows)
    toast(n ? `${n} ejercicio${n === 1 ? '' : 's'} importado${n === 1 ? '' : 's'} ✓` : 'No se pudo importar', n ? 'ok' : 'warn')
  }

  const card = (ex: LibraryExercise, tile = false) => (
    <ExerciseCard key={ex.id} ex={ex} fav={favs.has(ex.id)} tile={tile}
      extra={(ex.tags || []).map(id => tags.find(t => t.id === id)).filter((t): t is CustomTag => !!t).map(t => <TagBadge key={t.id} tag={t} />)}
      onOpen={() => setEditing(ex)} onToggleFav={() => toggleFav(ex.id)} onDuplicate={() => duplicate(ex)}
      onArchive={() => archive(ex)} onRestore={() => onRestore(ex.id)} onDelete={() => remove(ex)} />
  )

  const CHIPS: { id: Chip; label: string; n?: number }[] = [
    { id: 'todos', label: 'Todos', n: stats.total },
    { id: 'usados', label: 'Más usados', n: stats.usados },
    { id: 'sin-video', label: 'Sin vídeo', n: stats.sinVideo },
    { id: 'favoritos', label: 'Favoritos', n: stats.favoritos },
    { id: 'pendientes', label: 'Pendientes', n: stats.pendientes },
    ...(stats.archivados > 0 ? [{ id: 'archivados' as Chip, label: 'Archivados', n: stats.archivados }] : []),
  ]

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-serif font-bold">Ejercicios</h2>
          <p className="text-muted text-sm mt-1">{stats.total} en tu biblioteca{stats.archivados > 0 && ` · ${stats.archivados} archivados`}</p>
        </div>
        <div className="flex items-center gap-2">
          <ActionMenu title="Más herramientas" buttonClassName={`p-2.5 rounded-xl border transition-colors ${showConfig ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink hover:text-ink'}`}
            trigger={<MoreHorizontal className="w-4 h-4" />}>
            <button onClick={() => setShowImport(true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-alt">
              <Upload className="w-3.5 h-3.5 text-muted flex-shrink-0" /> Importar lista o CSV
            </button>
            <button onClick={() => setShowConfig(v => !v)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-bg-alt">
              <Settings2 className="w-3.5 h-3.5 text-muted flex-shrink-0" /> {showConfig ? 'Cerrar configuración' : 'Grupos, especialidades y etiquetas'}
            </button>
          </ActionMenu>
          <button onClick={() => setShowQuick(true)} className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Nuevo ejercicio
          </button>
        </div>
      </div>

      {showConfig && <ConfigPanel trainerId={trainerId} onClose={() => { setShowConfig(false); refresh() }} onRefresh={refresh} />}

      {/* Buscador y chips */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" placeholder="Buscar “sentadilla, glúteo, barra…”" aria-label="Buscar ejercicio" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>
          <button onClick={() => setShowMoreFilters(v => !v)} aria-expanded={showMoreFilters}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${showMoreFilters || extraFilters > 0 ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink hover:text-ink'}`}>
            <SlidersHorizontal className="w-4 h-4" /> Filtros{extraFilters > 0 ? ` (${extraFilters})` : ''}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Vista de la biblioteca">
          {CHIPS.map(c => (
            <button key={c.id} onClick={() => setChip(c.id)} aria-pressed={chip === c.id} className={chipCls(chip === c.id)}>
              {c.label}{c.n !== undefined && c.n > 0 ? ` ${c.n}` : ''}
            </button>
          ))}
        </div>

        {showMoreFilters && (
          <div className="flex gap-2 flex-wrap p-3 bg-bg-alt/40 border border-border rounded-xl">
            <select value={filterEsp} onChange={e => setFilterEsp(e.target.value)} aria-label="Filtrar por especialidad"
              className="px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none text-muted">
              <option value="">Todas las especialidades</option>
              {allEsps.map(e => <option key={e.id} value={e.id}>{e.emoji} {e.label}</option>)}
            </select>
            {tags.length > 0 && (
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)} aria-label="Filtrar por etiqueta"
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none text-muted">
                <option value="">Todas las etiquetas</option>
                {tags.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Huecos de contenido: lo que más se usa y aún no está completo */}
      {sinFiltros && hayHuecos && (
        <div role="status" className="flex items-start gap-3 bg-warn/5 border border-warn/20 rounded-2xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-sm">
            <p className="font-semibold">Huecos en lo que más usas</p>
            <p className="text-xs text-muted mt-0.5">
              {[
                stats.muyUsadosSinVideo > 0 && `${stats.muyUsadosSinVideo} muy ${stats.muyUsadosSinVideo === 1 ? 'usado' : 'usados'} sin vídeo`,
                stats.muyUsadosSinAlternativa > 0 && `${stats.muyUsadosSinAlternativa} sin alternativa`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button onClick={() => setChip('pendientes')} className="text-xs font-semibold text-accent hover:underline flex-shrink-0">Ver pendientes</button>
        </div>
      )}

      {/* Recomendados: lo que ya usas, a un toque */}
      {recomendadosHoy.length > 0 && (
        <section aria-label="Recomendados para ti">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-2 px-1">Recomendados para ti</h3>
          <div className="grid sm:grid-cols-2 gap-2">{recomendadosHoy.map(ex => card(ex, true))}</div>
        </section>
      )}

      {/* Explorar por grupo y material */}
      {(chip === 'todos' || chip === 'usados' || chip === 'sin-video' || chip === 'favoritos' || chip === 'pendientes') && (catChips.length > 0 || matChips.length > 0) && (
        <section aria-label="Explorar por" className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted px-1">Explorar por</h3>
          {catChips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Grupo muscular">
              {catChips.map(c => (
                <button key={c.category} onClick={() => setFilterCat(filterCat === c.category ? '' : c.category)} aria-pressed={filterCat === c.category} className={chipCls(filterCat === c.category)}>
                  {c.category}
                </button>
              ))}
            </div>
          )}
          {matChips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Material">
              {matChips.map(m => (
                <button key={m.material} onClick={() => setFilterMat(filterMat === m.material ? '' : m.material)} aria-pressed={filterMat === m.material} className={chipCls(filterMat === m.material)}>
                  {m.material}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Lista */}
      {filtered.length === 0 ? (
        all.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl px-8 py-10 text-center">
            <div className="w-16 h-16 bg-accent/8 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-accent opacity-60" />
            </div>
            <p className="font-serif text-xl font-bold text-ink">Crea tu biblioteca de ejercicios</p>
            <p className="text-sm text-muted mt-2 max-w-sm mx-auto">Empieza con una lista de nombres: en 30 segundos tienes la base. El vídeo y las indicaciones los completas después, solo en los que más usas.</p>
            <div className="flex gap-2 justify-center mt-5 flex-wrap">
              <button onClick={() => setShowQuick(true)} className="px-5 py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">+ Añadir el primero</button>
              <button onClick={() => setShowImport(true)} className="px-5 py-3 border border-border rounded-xl text-sm font-semibold hover:border-ink">Importar una lista</button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted border-2 border-dashed border-border rounded-2xl">
            <p className="font-serif text-lg">{chip === 'favoritos' ? 'Aún no tienes favoritos' : chip === 'usados' ? 'Todavía no has usado ninguno en un plan' : chip === 'archivados' ? 'No hay ejercicios archivados' : 'Sin resultados'}</p>
            <p className="text-sm mt-1">{chip === 'favoritos' ? 'Marca con la estrella los que repites siempre.' : 'Prueba con otro término o filtro.'}</p>
            <button onClick={clearAll} className="mt-3 text-accent text-sm hover:underline">Ver todos</button>
          </div>
        )
      ) : (
        <section aria-label={sinFiltros ? 'Todos los ejercicios' : 'Resultados'}>
          {sinFiltros && <h3 className="text-sm font-bold uppercase tracking-wider text-muted mb-2 px-1">Todos los ejercicios</h3>}
          <div className="space-y-2">
            {visible.map(ex => card(ex))}
            {visibleCount < filtered.length && (
              <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted hover:border-accent hover:text-accent transition-colors">
                Mostrar más ({filtered.length - visibleCount} restantes)
              </button>
            )}
          </div>
        </section>
      )}

      <QuickAddExercise open={showQuick} categories={cats} onClose={() => setShowQuick(false)} onCreate={create} />
      <ImportExercises open={showImport} existingNames={all.map(e => e.name)} categories={cats} onClose={() => setShowImport(false)} onImport={doImport} />

      {/* Ficha completa en un cajón lateral */}
      <Modal open={!!editing} onClose={() => setEditing(null)} variant="drawer" plain maxWidth="max-w-lg" ariaLabel={editing ? `Editar ${editing.name}` : 'Editar ejercicio'}>
        {editing && (
          <ExerciseForm key={editing.id} initial={formFrom(editing)} trainerId={trainerId} title={editing.name}
            origen={/^ex_(default|demo)_/.test(editing.id) ? 'base' : 'personal'} useCount={editing.useCount ?? 0}
            library={all} onSave={f => save_(editing, f)} onCancel={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  )
}
