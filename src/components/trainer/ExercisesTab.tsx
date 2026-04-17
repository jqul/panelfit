import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Edit2, X, Video, Search, Tag, Settings2 } from 'lucide-react'
import { LibraryExercise, LibraryVideo } from '../../types'
import { ESPECIALIDADES, Especialidad } from '../../lib/especialidades'

// ── Sistema de tags personalizado ──────────────────────────
const TAGS_KEY = (uid: string) => `pf_tags_${uid}`

export interface CustomTag {
  id: string
  label: string
  emoji: string
  color: string  // tailwind bg color class
}

const TAG_COLORS = [
  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700',  border: 'border-purple-200' },
  { bg: 'bg-pink-100',   text: 'text-pink-700',    border: 'border-pink-200' },
  { bg: 'bg-green-100',  text: 'text-green-700',   border: 'border-green-200' },
  { bg: 'bg-orange-100', text: 'text-orange-700',  border: 'border-orange-200' },
  { bg: 'bg-teal-100',   text: 'text-teal-700',    border: 'border-teal-200' },
  { bg: 'bg-rose-100',   text: 'text-rose-700',    border: 'border-rose-200' },
  { bg: 'bg-amber-100',  text: 'text-amber-700',   border: 'border-amber-200' },
]

function loadTags(trainerId: string): CustomTag[] {
  try { return JSON.parse(localStorage.getItem(TAGS_KEY(trainerId)) || '[]') } catch { return [] }
}
function saveTags(trainerId: string, tags: CustomTag[]) {
  localStorage.setItem(TAGS_KEY(trainerId), JSON.stringify(tags))
}

interface Props {
  exercises: LibraryExercise[]
  trainerId: string
  onAdd: (name: string, desc: string, category: string, videos: LibraryVideo[], especialidades: Especialidad[], tags: string[]) => void
  onUpdate: (id: string, updates: Partial<LibraryExercise>) => void
  onDelete: (id: string) => void
}

const CATEGORIAS = ['Piernas', 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Cardio', 'General']

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface FormState {
  name: string; description: string; category: string
  especialidades: Especialidad[]; videos: LibraryVideo[]; tags: string[]
}
const emptyForm = (): FormState => ({ name: '', description: '', category: '', especialidades: [], videos: [], tags: [] })

// ── Gestor de tags ─────────────────────────────────────────
function TagManager({ trainerId, onClose }: { trainerId: string; onClose: () => void }) {
  const [tags, setTags] = useState<CustomTag[]>(() => loadTags(trainerId))
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('🏷️')
  const [newColorIdx, setNewColorIdx] = useState(0)

  const addTag = () => {
    if (!newLabel.trim()) return
    const tag: CustomTag = {
      id: `tag_${Date.now()}`,
      label: newLabel.trim(),
      emoji: newEmoji,
      color: String(newColorIdx),
    }
    const updated = [...tags, tag]
    setTags(updated)
    saveTags(trainerId, updated)
    setNewLabel('')
    setNewEmoji('🏷️')
  }

  const deleteTag = (id: string) => {
    const updated = tags.filter(t => t.id !== id)
    setTags(updated)
    saveTags(trainerId, updated)
  }

  const updateTag = (id: string, updates: Partial<CustomTag>) => {
    const updated = tags.map(t => t.id === id ? { ...t, ...updates } : t)
    setTags(updated)
    saveTags(trainerId, updated)
  }

  return (
    <div className="bg-card border border-accent/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Gestionar etiquetas</h3>
          <p className="text-xs text-muted mt-0.5">Crea etiquetas personalizadas para clasificar tus ejercicios</p>
        </div>
        <button onClick={onClose}><X className="w-4 h-4 text-muted" /></button>
      </div>

      {/* Tags existentes */}
      {tags.length > 0 && (
        <div className="space-y-2">
          {tags.map(tag => {
            const colorIdx = parseInt(tag.color) || 0
            const c = TAG_COLORS[colorIdx % TAG_COLORS.length]
            return (
              <div key={tag.id} className="flex items-center gap-2">
                <input value={tag.emoji} onChange={e => updateTag(tag.id, { emoji: e.target.value })}
                  className="w-8 text-center bg-bg border border-border rounded text-sm outline-none" />
                <input value={tag.label} onChange={e => updateTag(tag.id, { label: e.target.value })}
                  className="flex-1 px-2 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none" />
                {/* Selector de color */}
                <div className="flex gap-1">
                  {TAG_COLORS.map((col, i) => (
                    <button key={i} onClick={() => updateTag(tag.id, { color: String(i) })}
                      className={`w-4 h-4 rounded-full ${col.bg} border-2 transition-all ${parseInt(tag.color) === i ? 'border-ink scale-110' : 'border-transparent'}`} />
                  ))}
                </div>
                {/* Preview */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
                  {tag.emoji} {tag.label}
                </span>
                <button onClick={() => deleteTag(tag.id)} className="p-1 text-muted hover:text-warn flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Añadir nueva tag */}
      <div className="bg-bg-alt rounded-xl p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Nueva etiqueta</p>
        <div className="flex items-center gap-2">
          <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
            className="w-8 text-center bg-bg border border-border rounded text-sm outline-none" placeholder="🏷️" />
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Nombre de la etiqueta..." autoFocus
            className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted">Color:</span>
          {TAG_COLORS.map((col, i) => (
            <button key={i} onClick={() => setNewColorIdx(i)}
              className={`w-5 h-5 rounded-full ${col.bg} border-2 transition-all ${newColorIdx === i ? 'border-ink scale-110' : 'border-transparent'}`} />
          ))}
        </div>
        <button onClick={addTag} disabled={!newLabel.trim()}
          className="w-full py-2 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">
          + Añadir etiqueta
        </button>
      </div>

      {/* Especialidades base (no editables, informativo) */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Especialidades del sistema (fijas)</p>
        <div className="flex flex-wrap gap-1.5">
          {ESPECIALIDADES.map(e => (
            <span key={e.value} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-alt border border-border text-muted">
              {e.emoji} {e.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── TagBadge ───────────────────────────────────────────────
function TagBadge({ tag }: { tag: CustomTag }) {
  const colorIdx = parseInt(tag.color) || 0
  const c = TAG_COLORS[colorIdx % TAG_COLORS.length]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {tag.emoji} {tag.label}
    </span>
  )
}

// ── ExForm ─────────────────────────────────────────────────
interface ExFormProps {
  initial: FormState
  trainerId: string
  onSave: (f: FormState) => void
  onCancel: () => void
  title: string
}

function ExForm({ initial, trainerId, onSave, onCancel, title }: ExFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoLabel, setNewVideoLabel] = useState('')
  const [newVideoEsps, setNewVideoEsps] = useState<Especialidad[]>([])
  const [uploading, setUploading] = useState(false)
  const [videoMode, setVideoMode] = useState<'url' | 'file'>('url')
  const customTags = loadTags(trainerId)

  const addVideo = () => {
    if (!newVideoUrl.trim()) return
    const newVid: LibraryVideo = { url: newVideoUrl.trim(), label: newVideoLabel.trim() || undefined, especialidades: newVideoEsps }
    setForm(f => ({ ...f, videos: [...f.videos, newVid] }))
    setNewVideoUrl(''); setNewVideoLabel(''); setNewVideoEsps([])
  }

  const toggleEsp = (val: Especialidad) =>
    setForm(f => ({ ...f, especialidades: f.especialidades.includes(val) ? f.especialidades.filter(x => x !== val) : [...f.especialidades, val] }))

  const toggleTag = (id: string) =>
    setForm(f => ({ ...f, tags: f.tags.includes(id) ? f.tags.filter(x => x !== id) : [...f.tags, id] }))

  const toggleVideoEsp = (val: Especialidad) =>
    setNewVideoEsps(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])

  return (
    <div className="bg-card border border-accent/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={onCancel}><X className="w-4 h-4 text-muted" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Nombre *</label>
          <input autoFocus type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ej: Sentadilla barra"
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Grupo muscular</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none">
            <option value="">Sin categoría</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Descripción / notas</label>
        <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Indicaciones técnicas, variantes..."
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none resize-none" />
      </div>

      {/* Especialidades del sistema */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-2">Especialidades</label>
        <div className="flex flex-wrap gap-2">
          {ESPECIALIDADES.map(e => (
            <button key={e.value} type="button" onClick={() => toggleEsp(e.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs border transition-all ${form.especialidades.includes(e.value) ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Etiquetas personalizadas */}
      {customTags.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-muted mb-2">Etiquetas personalizadas</label>
          <div className="flex flex-wrap gap-2">
            {customTags.map(tag => {
              const colorIdx = parseInt(tag.color) || 0
              const c = TAG_COLORS[colorIdx % TAG_COLORS.length]
              const active = form.tags.includes(tag.id)
              return (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs border transition-all ${
                    active ? `${c.bg} ${c.text} ${c.border} border-2` : 'border-border text-muted hover:border-accent'
                  }`}>
                  {tag.emoji} {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Vídeos existentes */}
      {form.videos.length > 0 && (
        <div className="space-y-2">
          {form.videos.map((v, i) => {
            const ytId = getYTId(v.url)
            return (
              <div key={i} className="flex items-center gap-2 bg-bg border border-border rounded-lg p-2">
                {ytId && <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-12 h-9 object-cover rounded" alt="" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{v.label || v.url}</p>
                  {(v.especialidades || []).length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {v.especialidades!.map(esp => <span key={esp} className="text-[9px] text-muted">{ESPECIALIDADES.find(e => e.value === esp)?.emoji} {esp}</span>)}
                    </div>
                  )}
                </div>
                <button onClick={() => setForm(f => ({ ...f, videos: f.videos.filter((_, idx) => idx !== i) }))} className="p-1 text-muted hover:text-warn flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Añadir vídeo */}
      <div className="bg-bg-alt border border-border rounded-xl p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Añadir vídeo</p>
        <div className="flex gap-1 bg-bg p-0.5 rounded-lg border border-border w-fit">
          <button type="button" onClick={() => setVideoMode('url')}
            className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${videoMode === 'url' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
            🔗 YouTube URL
          </button>
          <button type="button" onClick={() => setVideoMode('file')}
            className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${videoMode === 'file' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
            📁 Subir archivo
          </button>
        </div>
        {videoMode === 'url' ? (
          <input type="text" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)}
            placeholder="URL YouTube" className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none" />
        ) : (
          <label className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-lg text-xs font-semibold cursor-pointer ${uploading ? 'border-accent text-accent' : 'border-border text-muted hover:border-accent'}`}>
            {uploading ? 'Subiendo...' : '📁 Seleccionar vídeo (máx 500MB)'}
            <input type="file" accept="video/*" className="hidden" disabled={uploading}
              onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return
                setUploading(true)
                const ext = file.name.split('.').pop()
                const path = `${trainerId}/${Date.now()}.${ext}`
                const { error } = await supabase.storage.from('trainer-videos').upload(path, file, { upsert: true })
                if (error) { alert('Error al subir'); setUploading(false); return }
                const { data } = supabase.storage.from('trainer-videos').getPublicUrl(path)
                setNewVideoUrl(data.publicUrl); setUploading(false)
              }} />
          </label>
        )}
        <input type="text" value={newVideoLabel} onChange={e => setNewVideoLabel(e.target.value)}
          placeholder="Etiqueta (ej: Técnica powerlifting)"
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none" />
        <div className="flex flex-wrap gap-1.5">
          {ESPECIALIDADES.map(e => (
            <button key={e.value} type="button" onClick={() => toggleVideoEsp(e.value)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all ${newVideoEsps.includes(e.value) ? 'bg-accent text-white border-accent' : 'border-border text-muted'}`}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
        <button onClick={addVideo} disabled={!newVideoUrl.trim() || uploading}
          className="w-full py-2 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">
          + Añadir vídeo
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.name.trim()}
          className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
          Guardar
        </button>
      </div>
    </div>
  )
}

// ── ExercisesTab ───────────────────────────────────────────
export function ExercisesTab({ exercises, trainerId, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterEsp, setFilterEsp] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [editInitial, setEditInitial] = useState<FormState>(emptyForm())
  const [customTags, setCustomTags] = useState<CustomTag[]>(() => loadTags(trainerId))

  // Recargar tags cuando se cierra el gestor
  const handleCloseTagManager = () => {
    setShowTagManager(false)
    setCustomTags(loadTags(trainerId))
  }

  const filtered = exercises.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || ex.category === filterCat
    const matchEsp = !filterEsp || ex.especialidades?.includes(filterEsp as Especialidad)
    const matchTag = !filterTag || (ex as any).tags?.includes(filterTag)
    return matchSearch && matchCat && matchEsp && matchTag
  })

  const startEdit = (ex: LibraryExercise) => {
    setEditInitial({
      name: ex.name, description: ex.description || '', category: ex.category || '',
      especialidades: (ex.especialidades || []) as Especialidad[],
      videos: ex.videos || [],
      tags: (ex as any).tags || [],
    })
    setEditId(ex.id)
    setShowNew(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Ejercicios</h2>
          <p className="text-muted text-sm mt-1">{exercises.length} ejercicios en tu biblioteca</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTagManager(!showTagManager)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-semibold transition-all ${showTagManager ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
            <Tag className="w-3.5 h-3.5" /> Etiquetas
          </button>
          <button onClick={() => { setShowNew(true); setEditId(null) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Nuevo ejercicio
          </button>
        </div>
      </div>

      {/* Gestor de etiquetas */}
      {showTagManager && <TagManager trainerId={trainerId} onClose={handleCloseTagManager} />}

      {showNew && (
        <ExForm key="new" initial={emptyForm()} trainerId={trainerId} title="Nuevo ejercicio"
          onSave={f => { onAdd(f.name, f.description, f.category, f.videos, f.especialidades, f.tags); setShowNew(false) }}
          onCancel={() => setShowNew(false)} />
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input type="text" placeholder="Buscar ejercicio..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm outline-none" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none text-muted">
          <option value="">Todos los grupos</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterEsp} onChange={e => setFilterEsp(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none text-muted">
          <option value="">Todas especialidades</option>
          {ESPECIALIDADES.map(e => <option key={e.value} value={e.value}>{e.emoji} {e.label}</option>)}
        </select>
        {customTags.length > 0 && (
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none text-muted">
            <option value="">Todas etiquetas</option>
            {customTags.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
          </select>
        )}
      </div>

      {/* Chips filtros activos */}
      {(filterEsp || filterTag || filterCat) && (
        <div className="flex gap-2 flex-wrap">
          {filterCat && <button onClick={() => setFilterCat('')} className="flex items-center gap-1 px-2.5 py-1 bg-ink text-white rounded-full text-xs font-semibold">{filterCat} <X className="w-3 h-3" /></button>}
          {filterEsp && <button onClick={() => setFilterEsp('')} className="flex items-center gap-1 px-2.5 py-1 bg-ink text-white rounded-full text-xs font-semibold">{ESPECIALIDADES.find(e=>e.value===filterEsp)?.emoji} {filterEsp} <X className="w-3 h-3" /></button>}
          {filterTag && <button onClick={() => setFilterTag('')} className="flex items-center gap-1 px-2.5 py-1 bg-ink text-white rounded-full text-xs font-semibold">{customTags.find(t=>t.id===filterTag)?.emoji} {customTags.find(t=>t.id===filterTag)?.label} <X className="w-3 h-3" /></button>}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted border-2 border-dashed border-border rounded-2xl">
          <p className="font-serif text-lg">Sin ejercicios</p>
          <p className="text-sm mt-1">Añade ejercicios a tu biblioteca para reutilizarlos en los planes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ex => {
            const exTags = ((ex as any).tags || []) as string[]
            return (
              <div key={ex.id}>
                {editId === ex.id ? (
                  <ExForm key={`edit-${ex.id}`} initial={editInitial} trainerId={trainerId} title={`Editar: ${ex.name}`}
                    onSave={f => { onUpdate(ex.id, { ...f, tags: f.tags } as any); setEditId(null) }}
                    onCancel={() => setEditId(null)} />
                ) : (
                  <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{ex.name}</p>
                        {ex.category && <span className="text-[10px] bg-bg-alt border border-border px-1.5 py-0.5 rounded-full text-muted">{ex.category}</span>}
                        {ex.especialidades?.map(esp => {
                          const info = ESPECIALIDADES.find(e => e.value === esp)
                          return info ? <span key={esp} className="text-[10px] text-muted">{info.emoji}</span> : null
                        })}
                        {exTags.map(tagId => {
                          const tag = customTags.find(t => t.id === tagId)
                          return tag ? <TagBadge key={tagId} tag={tag} /> : null
                        })}
                      </div>
                      {ex.description && <p className="text-xs text-muted mt-0.5 truncate">{ex.description}</p>}
                      {(ex.videos?.length || 0) > 0 && (
                        <p className="text-[10px] text-muted mt-1 flex items-center gap-1"><Video className="w-3 h-3" />{ex.videos!.length} vídeo{ex.videos!.length > 1 ? 's' : ''}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(ex)} className="p-1.5 text-muted hover:text-accent"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(ex.id)} className="p-1.5 text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
