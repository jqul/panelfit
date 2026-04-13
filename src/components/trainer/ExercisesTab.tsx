import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Edit2, X, Video, Search } from 'lucide-react'
import { LibraryExercise, LibraryVideo } from '../../types'
import { ESPECIALIDADES } from '../../lib/especialidades'

interface Props {
  exercises: LibraryExercise[]
  trainerId: string
  onAdd: (name: string, desc: string, category: string, videos: LibraryVideo[], especialidades: string[]) => void
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
  especialidades: string[]; videos: LibraryVideo[]
}
const emptyForm = (): FormState => ({ name: '', description: '', category: '', especialidades: [], videos: [] })

// Componente de formulario SEPARADO del componente padre — evita re-mount en cada render
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
  const [newVideoEsps, setNewVideoEsps] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [videoMode, setVideoMode] = useState<'url' | 'file'>('url')

  const addVideo = () => {
    if (!newVideoUrl.trim()) return
    setForm(f => ({ ...f, videos: [...f.videos, { url: newVideoUrl.trim(), label: newVideoLabel.trim() || undefined, especialidades: newVideoEsps }] }))
    setNewVideoUrl(''); setNewVideoLabel(''); setNewVideoEsps([])
  }

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

      <div>
        <label className="block text-xs font-semibold text-muted mb-2">Especialidades</label>
        <div className="flex flex-wrap gap-2">
          {ESPECIALIDADES.map(e => (
            <button key={e.value} type="button"
              onClick={() => setForm(f => ({ ...f, especialidades: f.especialidades.includes(e.value) ? f.especialidades.filter(x => x !== e.value) : [...f.especialidades, e.value] }))}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs border transition-all ${form.especialidades.includes(e.value) ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
      </div>

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
            <button key={e.value} type="button" onClick={() => setNewVideoEsps(prev => prev.includes(e.value) ? prev.filter(x => x !== e.value) : [...prev, e.value])}
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

export function ExercisesTab({ exercises, trainerId, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterEsp, setFilterEsp] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [editInitial, setEditInitial] = useState<FormState>(emptyForm())

  const filtered = exercises.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || ex.category === filterCat
    const matchEsp = !filterEsp || ex.especialidades?.includes(filterEsp)
    return matchSearch && matchCat && matchEsp
  })

  const startEdit = (ex: LibraryExercise) => {
    setEditInitial({ name: ex.name, description: ex.description || '', category: ex.category || '', especialidades: ex.especialidades || [], videos: ex.videos || [] })
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
        <button onClick={() => { setShowNew(true); setEditId(null) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Nuevo ejercicio
        </button>
      </div>

      {showNew && (
        <ExForm
          key="new"
          initial={emptyForm()}
          trainerId={trainerId}
          title="Nuevo ejercicio"
          onSave={f => { onAdd(f.name, f.description, f.category, f.videos, f.especialidades); setShowNew(false) }}
          onCancel={() => setShowNew(false)}
        />
      )}

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
          <option value="">Todas las especialidades</option>
          {ESPECIALIDADES.map(e => <option key={e.value} value={e.value}>{e.emoji} {e.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted border-2 border-dashed border-border rounded-2xl">
          <p className="font-serif text-lg">Sin ejercicios</p>
          <p className="text-sm mt-1">Añade ejercicios a tu biblioteca para reutilizarlos en los planes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ex => (
            <div key={ex.id}>
              {editId === ex.id ? (
                <ExForm
                  key={`edit-${ex.id}`}
                  initial={editInitial}
                  trainerId={trainerId}
                  title={`Editar: ${ex.name}`}
                  onSave={f => { onUpdate(ex.id, f); setEditId(null) }}
                  onCancel={() => setEditId(null)}
                />
              ) : (
                <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{ex.name}</p>
                      {ex.category && <span className="text-[10px] bg-bg-alt border border-border px-1.5 py-0.5 rounded-full text-muted">{ex.category}</span>}
                    </div>
                    {ex.description && <p className="text-xs text-muted mt-0.5 truncate">{ex.description}</p>}
                    {ex.videos && ex.videos.length > 0 && (
                      <p className="text-[10px] text-muted mt-1"><Video className="w-3 h-3 inline mr-1" />{ex.videos.length} vídeo{ex.videos.length > 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(ex)} className="p-1.5 text-muted hover:text-accent transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(ex.id)} className="p-1.5 text-muted hover:text-warn transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
