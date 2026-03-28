import { useState, useMemo } from 'react'
import {
  Plus, Search, Dumbbell, Video, Trash2, Edit2,
  Check, X, ChevronDown, ChevronUp, ExternalLink, Youtube, Upload
} from 'lucide-react'
import { LibraryExercise, LibraryVideo } from '../../types'
import { useExerciseLibrary, uploadVideoToStorage } from '../../hooks/useExerciseLibrary'
import { toast } from '../shared/Toast'
import { EXERCISE_CATEGORIES } from '../../lib/constants'

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface Props { trainerId: string }

// ── Formulario de ejercicio ───────────────────────────
interface ExForm {
  name: string; description: string; category: string
  videos: LibraryVideo[]
}
const emptyForm = (): ExForm => ({ name: '', description: '', category: 'General', videos: [] })

function ExerciseForm({
  initial, onSave, onCancel, isNew, trainerId
}: {
  initial: ExForm
  onSave: (f: ExForm) => void
  onCancel: () => void
  isNew: boolean
  trainerId: string
}) {
  const [form, setForm] = useState<ExForm>(initial)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoLabel, setNewVideoLabel] = useState('')

  const addVideo = () => {
    const url = newVideoUrl.trim()
    if (!url) return
    if (!getYTId(url) && !url.startsWith('http')) { toast('URL no válida. Usa un enlace de YouTube.', 'warn'); return }
    setForm(f => ({ ...f, videos: [...f.videos, { url, label: newVideoLabel.trim() || undefined }] }))
    setNewVideoUrl(''); setNewVideoLabel('')
  }

  const removeVideo = (i: number) => setForm(f => ({ ...f, videos: f.videos.filter((_, idx) => idx !== i) }))

  return (
    <div className="bg-card border-2 border-accent/30 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif font-bold text-lg">{isNew ? 'Nuevo ejercicio' : 'Editar ejercicio'}</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-bg-alt text-muted transition-colors"><X className="w-4 h-4" /></button>
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre *</label>
        <input autoFocus type="text" placeholder="Ej: Sentadilla búlgara"
          className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Categoría</label>
        <div className="flex flex-wrap gap-2">
          {EXERCISE_CATEGORIES.map(cat => (
            <button key={cat} type="button"
              onClick={() => setForm(f => ({ ...f, category: cat }))}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                form.category === cat ? 'bg-ink text-white border-ink' : 'bg-bg border-border text-muted hover:border-muted'
              }`}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Descripción / Indicaciones técnicas</label>
        <textarea rows={4} placeholder="Describe la técnica, puntos clave, errores comunes... Esta descripción se mostrará al cliente durante el entrenamiento."
          className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none leading-relaxed"
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>

      {/* Vídeos */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
          Vídeos de referencia ({form.videos.length})
        </label>

        {/* Vídeos añadidos */}
        {form.videos.length > 0 && (
          <div className="space-y-2 mb-3">
            {form.videos.map((v, i) => {
              const ytId = getYTId(v.url)
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-bg border border-border rounded-xl">
                  {ytId ? (
                    <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                      className="w-16 h-10 object-cover rounded border border-border flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-16 h-10 bg-bg-alt rounded border border-border flex items-center justify-center flex-shrink-0">
                      <Video className="w-4 h-4 text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{v.label || 'Vídeo ' + (i + 1)}</p>
                    <p className="text-[10px] text-muted truncate">{v.url}</p>
                  </div>
                  <a href={v.url} target="_blank" rel="noreferrer" className="p-1.5 text-muted hover:text-accent transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => removeVideo(i)} className="p-1.5 text-muted hover:text-warn transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Añadir vídeo YouTube */}
        <div className="flex flex-col gap-2 p-4 bg-bg border border-dashed border-border rounded-xl">
          <p className="text-[10px] text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Youtube className="w-3.5 h-3.5" /> Añadir vídeo de YouTube
          </p>
          <input type="text" placeholder="https://youtube.com/watch?v=..."
            className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addVideo()}
          />
          <div className="flex gap-2">
            <input type="text" placeholder="Etiqueta opcional (ej: Vista frontal)"
              className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
              value={newVideoLabel} onChange={e => setNewVideoLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addVideo()}
            />
            <button onClick={addVideo}
              className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
            >+ Añadir</button>
          </div>
        </div>

        {/* Subir vídeo propio */}
        <UploadVideoSection onUploaded={(url, label) => {
          setForm(f => ({ ...f, videos: [...f.videos, { url, label }] }))
          toast('Vídeo subido ✓', 'ok')
        }} trainerId={trainerId} />
      </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-bg-alt transition-colors">Cancelar</button>
        <button
          onClick={() => { if (!form.name.trim()) { toast('El nombre es obligatorio', 'warn'); return }; onSave(form) }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Check className="w-4 h-4" /> {isNew ? 'Crear ejercicio' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

// ── Subir vídeo propio ─────────────────────────────────
function UploadVideoSection({ onUploaded, trainerId }: {
  onUploaded: (url: string, label: string) => void
  trainerId: string
}) {
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('')
  const [progress, setProgress] = useState(0)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 100 * 1024 * 1024) { toast('Máximo 100MB por vídeo', 'warn'); return }
    setUploading(true); setProgress(10)
    const url = await uploadVideoToStorage(trainerId, file)
    setProgress(100)
    if (url) onUploaded(url, label || file.name.replace(/\.[^.]+$/, ''))
    else toast('Error al subir el vídeo', 'warn')
    setUploading(false); setProgress(0); setLabel('')
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-bg border border-dashed border-border rounded-xl">
      <p className="text-[10px] text-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
        <Upload className="w-3.5 h-3.5" /> Subir vídeo propio (MP4, MOV...)
      </p>
      <input type="text" placeholder="Etiqueta del vídeo (ej: Técnica sentadilla)"
        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"
        value={label} onChange={e => setLabel(e.target.value)}
      />
      <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium cursor-pointer transition-all ${
        uploading ? 'bg-bg-alt border-border text-muted cursor-wait' : 'border-border text-muted hover:border-accent hover:text-accent'
      }`}>
        <Upload className="w-4 h-4" />
        {uploading ? `Subiendo... ${progress}%` : 'Seleccionar archivo'}
        <input type="file" accept="video/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      {uploading && (
        <div className="h-1.5 bg-bg-alt rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

// ── Tab principal ─────────────────────────────────────
export function ExercisesTab({ trainerId }: Props) {
  const { exercises, addExercise, updateExercise, deleteExercise } = useExerciseLibrary(trainerId)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Todos')
  const [forming, setForming] = useState<{ mode: 'new' | 'edit'; id?: string } | null>(null)
  const [editForm, setEditForm] = useState<ExForm>(emptyForm())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return exercises
      .filter(e => catFilter === 'Todos' || e.category === catFilter)
      .filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
  }, [exercises, search, catFilter])

  const openNew = () => { setEditForm(emptyForm()); setForming({ mode: 'new' }) }
  const openEdit = (ex: LibraryExercise) => {
    setEditForm({ name: ex.name, description: ex.description || '', category: ex.category || 'General', videos: ex.videos || [] })
    setForming({ mode: 'edit', id: ex.id })
    setExpandedId(null)
  }

  const handleSave = (form: ExForm) => {
    if (forming?.mode === 'new') {
      addExercise(form.name, form.description, form.category, form.videos)
      toast('Ejercicio creado ✓', 'ok')
    } else if (forming?.id) {
      updateExercise(forming.id, { name: form.name, description: form.description, category: form.category, videos: form.videos })
      toast('Guardado ✓', 'ok')
    }
    setForming(null)
  }

  const handleDelete = (id: string) => {
    deleteExercise(id)
    setDeletingId(null)
    toast('Ejercicio eliminado', 'ok')
  }

  const cats = ['Todos', ...EXERCISE_CATEGORIES]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold">Biblioteca de ejercicios</h2>
          <p className="text-muted text-sm mt-1">{exercises.length} ejercicios · con vídeos y descripciones</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo ejercicio
        </button>
      </div>

      {/* Formulario inline */}
      {forming && (
        <ExerciseForm
          initial={editForm}
          isNew={forming.mode === 'new'}
          onSave={handleSave}
          onCancel={() => setForming(null)}
          trainerId={trainerId}
        />
      )}

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input type="text" placeholder="Buscar ejercicio..."
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filtros categoría */}
      <div className="flex gap-2 flex-wrap">
        {cats.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              catFilter === cat ? 'bg-ink text-white border-ink' : 'bg-card border-border text-muted hover:border-muted'
            }`}
          >{cat}</button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-muted">
            <Dumbbell className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin resultados para "{search}"</p>
          </div>
        )}
        {filtered.map(ex => {
          const isExpanded = expandedId === ex.id
          const hasVideos = (ex.videos?.length || 0) > 0
          const hasDesc = !!ex.description

          return (
            <div key={ex.id}>
              {/* Fila principal */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-bg-alt/40 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-bg flex items-center justify-center text-muted flex-shrink-0">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : ex.id)}>
                  <p className="text-sm font-semibold">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ex.category && (
                      <span className="text-[10px] text-muted bg-bg px-2 py-0.5 rounded-full border border-border">{ex.category}</span>
                    )}
                    {hasVideos && (
                      <span className="text-[10px] text-accent flex items-center gap-1">
                        <Video className="w-3 h-3" />{ex.videos!.length} vídeo{ex.videos!.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {hasDesc && <span className="text-[10px] text-muted">📝 descripción</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setExpandedId(isExpanded ? null : ex.id)}
                    className="p-1.5 rounded-lg text-muted hover:bg-bg transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(ex)} className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {deletingId === ex.id ? (
                      <>
                        <button onClick={() => handleDelete(ex.id)} className="px-2 py-1 bg-warn/10 text-warn border border-warn/30 rounded text-[10px] font-bold">Borrar</button>
                        <button onClick={() => setDeletingId(null)} className="px-2 py-1 bg-bg border border-border rounded text-[10px] font-bold text-muted">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(ex.id)} className="p-1.5 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalle expandido */}
              {isExpanded && (
                <div className="px-4 pb-4 bg-bg/30 space-y-3 border-t border-border">
                  {hasDesc && (
                    <div className="pt-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1.5">Descripción técnica</p>
                      <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-wrap">{ex.description}</p>
                    </div>
                  )}
                  {hasVideos && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Vídeos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ex.videos!.map((v, i) => {
                          const ytId = getYTId(v.url)
                          return (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer"
                              className="group relative rounded-xl overflow-hidden border border-border hover:border-accent transition-colors"
                            >
                              {ytId ? (
                                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                  className="w-full aspect-video object-cover" alt="" />
                              ) : (
                                <div className="w-full aspect-video bg-bg-alt flex items-center justify-center">
                                  <Video className="w-6 h-6 text-muted" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-center justify-center">
                                <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {v.label && (
                                <div className="absolute bottom-1.5 left-1.5 bg-ink/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                                  {v.label}
                                </div>
                              )}
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {!hasDesc && !hasVideos && (
                    <div className="pt-3 flex items-center gap-2 text-muted">
                      <p className="text-sm">Sin descripción ni vídeos aún.</p>
                      <button onClick={() => openEdit(ex)} className="text-sm text-accent hover:underline">Añadir →</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
