import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Edit2, X, Video, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { LibraryExercise, LibraryVideo } from '../../types'
import { ESPECIALIDADES, Especialidad } from '../../lib/especialidades'

interface Props {
  exercises: LibraryExercise[]
  trainerId: string
  onAdd: (name: string, desc: string, category: string, videos: LibraryVideo[], especialidades: string[]) => void
  onUpdate: (id: string, updates: Partial<LibraryExercise>) => void
  onDelete: (id: string) => void
}

const CATEGORIAS = ['Piernas', 'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Cardio', 'General']

function EspBadge({ esp }: { esp: string }) {
  const info = ESPECIALIDADES.find(e => e.value === esp)
  if (!info) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-bg-alt border border-border px-1.5 py-0.5 rounded-full">
      {info.emoji} {info.label}
    </span>
  )
}

export function ExercisesTab({ exercises, trainerId, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterEsp, setFilterEsp] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  // Form estado
  const [form, setForm] = useState({
    name: '', description: '', category: '',
    especialidades: [] as string[], videos: [] as LibraryVideo[]
  })
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoLabel, setNewVideoLabel] = useState('')
  const [newVideoEsps, setNewVideoEsps] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [videoMode, setVideoMode] = useState<'url' | 'file'>('url')

  const filtered = exercises.filter(ex => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !filterCat || ex.category === filterCat
    const matchEsp = !filterEsp || ex.especialidades?.includes(filterEsp)
    return matchSearch && matchCat && matchEsp
  })

  const resetForm = () => {
    setForm({ name: '', description: '', category: '', especialidades: [], videos: [] })
    setNewVideoUrl(''); setNewVideoLabel(''); setNewVideoEsps([])
  }

  const startEdit = (ex: LibraryExercise) => {
    setEditId(ex.id)
    setForm({
      name: ex.name, description: ex.description || '',
      category: ex.category || '', especialidades: ex.especialidades || [],
      videos: ex.videos || []
    })
    setShowNew(false)
  }

  const saveEdit = () => {
    if (!editId) return
    onUpdate(editId, { ...form })
    setEditId(null); resetForm()
  }

  const saveNew = () => {
    if (!form.name.trim()) return
    onAdd(form.name, form.description, form.category, form.videos, form.especialidades)
    setShowNew(false); resetForm()
  }

  const uploadVideo = async (file: File, trainerId: string) => {
    if (file.size > 500 * 1024 * 1024) { alert('Máximo 500MB'); return }
    setUploading(true)
    setUploadProgress('Subiendo...')
    const ext = file.name.split('.').pop()
    const path = `${trainerId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('trainer-videos').upload(path, file, { upsert: true })
    if (error) { alert('Error al subir vídeo: ' + error.message); setUploading(false); setUploadProgress(''); return }
    const { data } = supabase.storage.from('trainer-videos').getPublicUrl(path)
    setNewVideoUrl(data.publicUrl)
    setUploadProgress('✓ Vídeo subido')
    setUploading(false)
  }

  const addVideo = () => {
    if (!newVideoUrl.trim()) return
    const v: LibraryVideo = { url: newVideoUrl.trim(), label: newVideoLabel.trim() || undefined, especialidades: newVideoEsps }
    setForm(f => ({ ...f, videos: [...f.videos, v] }))
    setNewVideoUrl(''); setNewVideoLabel(''); setNewVideoEsps([])
  }

  const removeVideo = (i: number) => setForm(f => ({ ...f, videos: f.videos.filter((_, idx) => idx !== i) }))

  const toggleEsp = (esp: string) => setForm(f => ({
    ...f, especialidades: f.especialidades.includes(esp)
      ? f.especialidades.filter(e => e !== esp)
      : [...f.especialidades, esp]
  }))

  const toggleVideoEsp = (esp: string) => setNewVideoEsps(prev =>
    prev.includes(esp) ? prev.filter(e => e !== esp) : [...prev, esp]
  )

  const getYTId = (url: string) => {
    const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
  }

  const FormContent = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Nombre *</label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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

      {/* Especialidades del ejercicio */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-2">Especialidades del ejercicio</label>
        <div className="flex flex-wrap gap-2">
          {ESPECIALIDADES.map(e => (
            <button key={e.value} type="button"
              onClick={() => toggleEsp(e.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs border transition-all ${
                form.especialidades.includes(e.value) ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'
              }`}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted mt-1">Si no marcas ninguna, el ejercicio aparece para todas las especialidades.</p>
      </div>

      {/* Vídeos */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-2">Vídeos de referencia</label>

        {form.videos.length > 0 && (
          <div className="space-y-2 mb-3">
            {form.videos.map((v, i) => {
              const ytId = getYTId(v.url)
              return (
                <div key={i} className="flex items-center gap-2 bg-bg border border-border rounded-lg p-2">
                  {ytId && <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-12 h-9 object-cover rounded" alt="" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{v.label || v.url}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {v.especialidades?.map(esp => <EspBadge key={esp} esp={esp} />)}
                      {!v.especialidades?.length && <span className="text-[10px] text-muted">Todas las especialidades</span>}
                    </div>
                  </div>
                  <button onClick={() => removeVideo(i)} className="p-1 text-muted hover:text-warn flex-shrink-0">
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

          {/* Tabs URL / Subir archivo */}
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
              placeholder="URL YouTube (https://youtube.com/...)"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none" />
          ) : (
            <div className="space-y-2">
              <label className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                uploading ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted hover:border-accent hover:text-accent'
              }`}>
                {uploading ? `Subiendo... ${uploadPct}%` : '📁 Seleccionar vídeo (MP4, MOV, max 500MB)'}
                <input type="file" accept="video/*" className="hidden" disabled={uploading}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 500 * 1024 * 1024) { alert('Máximo 500MB'); return }
                    setUploading(true); setUploadPct(0)
                    const ext = file.name.split('.').pop()
                    const path = `${trainerId}/${Date.now()}.${ext}`
                    const { error } = await supabase.storage.from('trainer-videos').upload(path, file, { upsert: true })
                    if (error) { alert('Error al subir'); setUploading(false); return }
                    const { data } = supabase.storage.from('trainer-videos').getPublicUrl(path)
                    setNewVideoUrl(data.publicUrl)
                    setUploading(false); setUploadPct(100)
                  }}
                />
              </label>
              {newVideoUrl && !newVideoUrl.includes('youtube') && (
                <div className="flex items-center gap-2 bg-ok/5 border border-ok/20 rounded-lg p-2">
                  <span className="text-ok text-xs font-semibold">✓ Vídeo subido</span>
                  <video src={newVideoUrl} className="h-10 rounded" controls />
                </div>
              )}
            </div>
          )}

          <input type="text" value={newVideoLabel} onChange={e => setNewVideoLabel(e.target.value)}
            placeholder="Etiqueta (ej: Técnica powerlifting)"
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none" />
          <div>
            <p className="text-[10px] text-muted mb-1.5">¿Para qué especialidad es este vídeo?</p>
            <div className="flex flex-wrap gap-1.5">
              {ESPECIALIDADES.map(e => (
                <button key={e.value} type="button" onClick={() => toggleVideoEsp(e.value)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all ${
                    newVideoEsps.includes(e.value) ? 'bg-accent text-white border-accent' : 'border-border text-muted'
                  }`}>
                  {e.emoji} {e.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted mt-1">Sin selección = válido para todas</p>
          </div>
          <button onClick={addVideo} disabled={!newVideoUrl.trim() || uploading}
            className="w-full py-2 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">
            + Añadir vídeo
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Ejercicios</h2>
          <p className="text-muted text-sm mt-1">{exercises.length} ejercicios en tu biblioteca</p>
        </div>
        <button onClick={() => { setShowNew(true); setEditId(null); resetForm() }}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
          <Plus className="w-4 h-4" /> Nuevo ejercicio
        </button>
      </div>

      {/* Formulario nuevo */}
      {showNew && (
        <div className="bg-card border border-accent/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nuevo ejercicio</h3>
            <button onClick={() => { setShowNew(false); resetForm() }}><X className="w-4 h-4 text-muted" /></button>
          </div>
          <FormContent />
          <div className="flex gap-2">
            <button onClick={() => { setShowNew(false); resetForm() }}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
            <button onClick={saveNew} disabled={!form.name.trim()}
              className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
              Guardar ejercicio
            </button>
          </div>
        </div>
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
          <option value="">Todas las especialidades</option>
          {ESPECIALIDADES.map(e => <option key={e.value} value={e.value}>{e.emoji} {e.label}</option>)}
        </select>
      </div>

      {/* Lista */}
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
                <div className="bg-card border border-accent/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Editar: {ex.name}</h3>
                    <button onClick={() => { setEditId(null); resetForm() }}><X className="w-4 h-4 text-muted" /></button>
                  </div>
                  <FormContent />
                  <div className="flex gap-2">
                    <button onClick={() => { setEditId(null); resetForm() }}
                      className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
                    <button onClick={saveEdit}
                      className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold">
                      Guardar cambios
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{ex.name}</p>
                      {ex.category && (
                        <span className="text-[10px] bg-bg-alt border border-border px-1.5 py-0.5 rounded-full text-muted">
                          {ex.category}
                        </span>
                      )}
                      {ex.especialidades?.map(esp => <EspBadge key={esp} esp={esp} />)}
                    </div>
                    {ex.description && <p className="text-xs text-muted mt-0.5 truncate">{ex.description}</p>}
                    {ex.videos && ex.videos.length > 0 && (
                      <p className="text-[10px] text-muted mt-1">
                        <Video className="w-3 h-3 inline mr-1" />{ex.videos.length} vídeo{ex.videos.length > 1 ? 's' : ''}
                        {ex.videos.some(v => v.especialidades?.length) && ' · clasificados por especialidad'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(ex)} className="p-1.5 text-muted hover:text-accent transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(ex.id)} className="p-1.5 text-muted hover:text-warn transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
