import { useState, useMemo } from 'react'
import { Search, Video, Check, Plus } from 'lucide-react'
import { LibraryExercise, Exercise } from '../../types'
import { EXERCISE_CATEGORIES } from '../../lib/constants'

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface Props {
  library: LibraryExercise[]
  onSelect: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePicker({ library, onSelect, onClose }: Props) {
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('Todos')
  const [selected, setSelected] = useState<LibraryExercise | null>(null)
  const [selectedVideoIdx, setSelectedVideoIdx] = useState<number[]>([]) // índices de vídeos seleccionados
  const [customName, setCustomName] = useState('')
  const [mode, setMode] = useState<'library' | 'custom'>('library')

  const filtered = useMemo(() => {
    return library
      .filter(e => catFilter === 'Todos' || e.category === catFilter)
      .filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 20)
  }, [library, q, catFilter])

  const handleSelect = (ex: LibraryExercise) => {
    if (selected?.id === ex.id) {
      setSelected(null)
      setSelectedVideoIdx([])
    } else {
      setSelected(ex)
      // Auto-seleccionar todos los vídeos por defecto
      setSelectedVideoIdx((ex.videos || []).map((_, i) => i))
    }
  }

  const toggleVideo = (i: number) => {
    setSelectedVideoIdx(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    )
  }

  const handleConfirm = () => {
    if (mode === 'custom') {
      const name = customName.trim() || q.trim()
      if (!name) return
      onSelect({ name, sets: '3×10', weight: '', isMain: false, comment: '' })
      onClose()
      return
    }
    if (!selected) return

    const videos = selectedVideoIdx
      .sort()
      .map(i => selected.videos![i].url)
      .filter(Boolean)

    const exercise: Exercise = {
      name: selected.name,
      sets: '3×10',
      weight: '',
      isMain: false,
      comment: selected.description || '',
      videoUrl: videos[0] || '',
      videoUrls: videos,
    }
    onSelect(exercise)
    onClose()
  }

  const cats = ['Todos', ...EXERCISE_CATEGORIES]

  return (
    <div className="flex flex-col max-h-[80vh]">
      {/* Tabs library / custom */}
      <div className="flex gap-1 mb-4 bg-bg rounded-xl p-1">
        <button onClick={() => setMode('library')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'library' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}
        >📚 Biblioteca</button>
        <button onClick={() => setMode('custom')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'custom' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}
        >✏️ Nombre libre</button>
      </div>

      {mode === 'custom' ? (
        <div className="space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Escribe el nombre del ejercicio..."
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <button
            onClick={handleConfirm}
            disabled={!customName.trim()}
            className="w-full py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Añadir ejercicio
          </button>
        </div>
      ) : (
        <>
          {/* Búsqueda */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              autoFocus
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar en tu biblioteca..."
              className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          {/* Filtros categoría */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {cats.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                  catFilter === cat ? 'bg-ink text-white border-ink' : 'bg-bg border-border text-muted hover:border-muted'
                }`}
              >{cat}</button>
            ))}
          </div>

          {/* Lista de ejercicios */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-48">
            {filtered.map(ex => {
              const isSelected = selected?.id === ex.id
              return (
                <button key={ex.id} onClick={() => handleSelect(ex)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected ? 'bg-accent/10 border border-accent/30' : 'hover:bg-bg-alt border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected ? 'bg-accent border-accent' : 'border-border'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    {ex.category && <p className="text-[10px] text-muted">{ex.category}</p>}
                  </div>
                  {(ex.videos?.length || 0) > 0 && (
                    <span className="text-[10px] text-accent flex items-center gap-1 flex-shrink-0">
                      <Video className="w-3 h-3" />{ex.videos!.length}
                    </span>
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-6 text-center text-muted text-sm">
                Sin resultados.
                <button onClick={() => setMode('custom')} className="block mx-auto mt-1 text-accent hover:underline text-xs">
                  Añadir "{q}" como nuevo →
                </button>
              </div>
            )}
          </div>

          {/* Panel de vídeos del ejercicio seleccionado */}
          {selected && (selected.videos?.length || 0) > 0 && (
            <div className="mt-3 p-3 bg-bg rounded-xl border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">
                Vídeos a añadir — selecciona cuáles quieres
              </p>
              <div className="grid grid-cols-3 gap-2">
                {selected.videos!.map((v, i) => {
                  const ytId = getYTId(v.url)
                  const isChecked = selectedVideoIdx.includes(i)
                  return (
                    <button key={i} onClick={() => toggleVideo(i)}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                        isChecked ? 'border-accent' : 'border-border opacity-50'
                      }`}
                    >
                      {ytId ? (
                        <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                          className="w-full aspect-video object-cover" alt="" />
                      ) : (
                        <div className="w-full aspect-video bg-bg-alt flex items-center justify-center">
                          <Video className="w-4 h-4 text-muted" />
                        </div>
                      )}
                      {isChecked && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      {v.label && (
                        <div className="absolute bottom-0 left-0 right-0 bg-ink/70 text-white text-[8px] px-1 py-0.5 truncate">
                          {v.label}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selected && selected.description && (
            <div className="mt-2 p-3 bg-bg rounded-xl border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Descripción técnica</p>
              <p className="text-xs text-ink/70 leading-relaxed line-clamp-3">{selected.description}</p>
            </div>
          )}

          {/* Botón confirmar */}
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="mt-3 w-full py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {selected ? `Añadir "${selected.name}"` : 'Selecciona un ejercicio'}
          </button>
        </>
      )}
    </div>
  )
}
