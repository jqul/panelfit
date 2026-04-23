import { useState, useMemo } from 'react'
import { Search, Video, Check, Plus, Filter } from 'lucide-react'
import { LibraryExercise, Exercise } from '../../types'
import { EXERCISE_CATEGORIES } from '../../lib/constants'
import { ESPECIALIDADES, Especialidad } from '../../lib/especialidades'

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

const ESP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fuerza:        { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
  hipertrofia:   { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200' },
  halterofilia:  { bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-200' },
  rehabilitacion:{ bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-200' },
  rendimiento:   { bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200' },
  perdida_grasa: { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200' },
}

function EspBadge({ esp, small }: { esp: string; small?: boolean }) {
  const info = ESPECIALIDADES.find(e => e.value === esp)
  const color = ESP_COLORS[esp] || { bg: 'bg-bg-alt', text: 'text-muted', border: 'border-border' }
  if (!info) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-semibold ${color.bg} ${color.text} ${color.border} ${small ? 'text-[9px]' : 'text-[10px]'}`}>
      {info.emoji} {small ? '' : info.label}
    </span>
  )
}

interface Props {
  library: LibraryExercise[]
  onSelect: (exercise: Exercise) => void
  onClose: () => void
  clientEspecialidad?: Especialidad
  trackUsage?: (id: string, name: string, event: 'selected' | 'video_played' | 'added_to_plan', clientId?: string, esp?: string) => void
  clientId?: string
}

const LAST_FILTER_KEY = 'pf_picker_last_filter'

export function ExercisePicker({ library, onSelect, onClose, clientEspecialidad, trackUsage, clientId }: Props) {
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState(() => localStorage.getItem(LAST_FILTER_KEY) || 'Todos')
  const [espFilter, setEspFilter] = useState<Especialidad | ''>('')
  const [onlyClientEsp, setOnlyClientEsp] = useState(false)
  const [selected, setSelected] = useState<LibraryExercise | null>(null)
  const [selectedVideoIdx, setSelectedVideoIdx] = useState<number[]>([])
  const [customName, setCustomName] = useState('')
  const [mode, setMode] = useState<'library' | 'custom'>('library')

  const espCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    library.forEach(ex => {
      const esps = ex.especialidades || []
      if (esps.length === 0) {
        counts['generico'] = (counts['generico'] || 0) + 1
      } else {
        esps.forEach(e => { counts[e] = (counts[e] || 0) + 1 })
      }
    })
    return counts
  }, [library])

  const filtered = useMemo(() => {
    let list = library
    if (catFilter !== 'Todos') list = list.filter(e => e.category === catFilter)
    if (onlyClientEsp && clientEspecialidad) {
      list = list.filter(e => !e.especialidades?.length || e.especialidades.includes(clientEspecialidad))
    } else if (espFilter) {
      list = list.filter(e => e.especialidades?.includes(espFilter))
    }
    if (q) list = list.filter(e => e.name.toLowerCase().includes(q.toLowerCase()))
    return list.slice(0, 25)
  }, [library, q, catFilter, espFilter, onlyClientEsp, clientEspecialidad])

  const handleSelect = (ex: LibraryExercise) => {
    if (selected?.id === ex.id) { setSelected(null); setSelectedVideoIdx([]); return }
    setSelected(ex)
    const vids = ex.videos || []
    if (!clientEspecialidad || !vids.length) {
      setSelectedVideoIdx(vids.map((_, i) => i)); return
    }
    const exactIdx = vids.map((v, i) => ({ v, i }))
      .filter(({ v }) => v.especialidades?.includes(clientEspecialidad)).map(({ i }) => i)
    if (exactIdx.length) { setSelectedVideoIdx(exactIdx); return }
    const genericIdx = vids.map((v, i) => ({ v, i }))
      .filter(({ v }) => !v.especialidades?.length).map(({ i }) => i)
    if (genericIdx.length) { setSelectedVideoIdx(genericIdx); return }
    setSelectedVideoIdx(vids.map((_, i) => i))
  }

  const toggleVideo = (i: number) =>
    setSelectedVideoIdx(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const handleConfirm = () => {
    if (mode === 'custom') {
      const name = customName.trim() || q.trim()
      if (!name) return
      onSelect({ name, sets: '3×10', weight: '', isMain: false, comment: '' })
      onClose(); return
    }
    if (!selected) return
    const videos = selectedVideoIdx.sort().map(i => selected.videos![i].url).filter(Boolean)
    // Telemetría
    trackUsage?.(selected.id, selected.name, 'added_to_plan', clientId, clientEspecialidad)
    onSelect({
      name: selected.name, sets: '3×10', weight: '', isMain: false,
      comment: selected.description || '', videoUrl: videos[0] || '', videoUrls: videos,
    })
    onClose()
  }

  const cats = ['Todos', ...EXERCISE_CATEGORIES]

  return (
    <div className="flex flex-col max-h-[80vh]">
      <div className="flex gap-1 mb-4 bg-bg rounded-xl p-1">
        <button onClick={() => setMode('library')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'library' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
          📚 Biblioteca
        </button>
        <button onClick={() => setMode('custom')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'custom' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
          ✏️ Nombre libre
        </button>
      </div>

      {mode === 'custom' ? (
        <div className="space-y-4">
          <input autoFocus type="text" placeholder="Escribe el nombre del ejercicio..."
            value={customName} onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          <button onClick={handleConfirm} disabled={!customName.trim()}
            className="w-full py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Añadir ejercicio
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input autoFocus type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar en tu biblioteca..."
              className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
          </div>

          {clientEspecialidad && (
            <button onClick={() => setOnlyClientEsp(!onlyClientEsp)}
              className={`mb-2 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                onlyClientEsp ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:border-accent'
              }`}>
              <Filter className="w-3 h-3" />
              Solo aptos para {ESPECIALIDADES.find(e => e.value === clientEspecialidad)?.label}
              {onlyClientEsp && ' ✓'}
            </button>
          )}

          <div className="flex gap-1 flex-wrap mb-2">
            {cats.map(cat => (
              <button key={cat} onClick={() => { setCatFilter(cat); localStorage.setItem(LAST_FILTER_KEY, cat) }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                  catFilter === cat ? 'bg-ink text-white border-ink' : 'bg-bg border-border text-muted hover:border-muted'
                }`}>{cat}</button>
            ))}
          </div>

          {!onlyClientEsp && (
            <div className="flex gap-1 flex-wrap mb-2">
              <button onClick={() => setEspFilter('')}
                className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all ${
                  espFilter === '' ? 'bg-ink text-white border-ink' : 'border-border text-muted'
                }`}>
                Todas {library.length > 0 && `(${library.length})`}
              </button>
              {ESPECIALIDADES.filter(e => espCounts[e.value]).map(e => (
                <button key={e.value} onClick={() => setEspFilter(espFilter === e.value ? '' : e.value)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border transition-all ${
                    espFilter === e.value
                      ? `${ESP_COLORS[e.value]?.bg} ${ESP_COLORS[e.value]?.text} ${ESP_COLORS[e.value]?.border} border-2`
                      : 'border-border text-muted'
                  }`}>
                  {e.emoji} {e.label} ({espCounts[e.value]})
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-48">
            {filtered.map(ex => {
              const isSelected = selected?.id === ex.id
              const mainEsp = ex.especialidades?.[0]
              const color = mainEsp ? ESP_COLORS[mainEsp] : null
              return (
                <button key={ex.id} onClick={() => handleSelect(ex)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected ? 'bg-accent/10 border border-accent/30' : 'hover:bg-bg-alt border border-transparent'
                  }`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                    color ? `${color.bg} ${color.text}` : 'bg-bg-alt text-muted'
                  }`}>
                    {mainEsp ? ESPECIALIDADES.find(e => e.value === mainEsp)?.emoji : '🌐'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {ex.category && <span className="text-[9px] text-muted">{ex.category}</span>}
                      {(!ex.especialidades || ex.especialidades.length === 0) && (
                        <span className="text-[9px] text-muted/60 italic">genérico</span>
                      )}
                      {ex.especialidades?.slice(0, 2).map(esp => <EspBadge key={esp} esp={esp} small />)}
                    </div>
                  </div>
                  {(ex.videos?.length || 0) > 0 && (
                    <span className="text-[10px] text-accent flex items-center gap-1 flex-shrink-0">
                      <Video className="w-3 h-3" />{ex.videos!.length}
                    </span>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
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

          {/* SECCIÓN VÍDEOS — aquí está el fix principal */}
          {selected && (selected.videos?.length || 0) > 0 && (
            <div className="mt-3 p-3 bg-bg rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                  Vídeos — selecciona cuáles añadir
                </p>
                {clientEspecialidad && (
                  <span className="text-[9px] text-accent">
                    Auto para {ESPECIALIDADES.find(e => e.value === clientEspecialidad)?.label}
                  </span>
                )}
              </div>

              {/* Layout en lista en vez de grid — más espacio para las etiquetas */}
              <div className="space-y-2">
                {selected.videos!.map((v, i) => {
                  const ytId = getYTId(v.url)
                  const isChecked = selectedVideoIdx.includes(i)
                  const vEsps = v.especialidades || []

                  return (
                    <button key={i} onClick={() => toggleVideo(i)}
                      className={`w-full flex items-center gap-3 rounded-xl border-2 overflow-hidden transition-all ${
                        isChecked ? 'border-accent bg-accent/5' : 'border-border opacity-60 hover:opacity-80'
                      }`}>

                      {/* Miniatura */}
                      <div className="flex-shrink-0 w-20 h-14">
                        {ytId
                          ? <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-full h-full object-cover" alt="" />
                          : <div className="w-full h-full bg-bg-alt flex items-center justify-center"><Video className="w-4 h-4 text-muted" /></div>
                        }
                      </div>

                      {/* Info del vídeo */}
                      <div className="flex-1 min-w-0 py-2 pr-2 text-left">
                        {/* Etiqueta del vídeo */}
                        <p className="text-xs font-semibold truncate">
                          {v.label || `Vídeo ${i + 1}`}
                        </p>

                        {/* Especialidades como badges legibles */}
                        <div className="flex gap-1 flex-wrap mt-1">
                          {vEsps.length > 0 ? (
                            vEsps.map(esp => {
                              const info = ESPECIALIDADES.find(e => e.value === esp)
                              const c = ESP_COLORS[esp] || { bg: 'bg-bg-alt', text: 'text-muted', border: 'border-border' }
                              return info ? (
                                <span key={esp} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
                                  {info.emoji} {info.label}
                                </span>
                              ) : null
                            })
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg-alt border border-border text-muted">
                              🌐 Genérico
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Check */}
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 mr-3 flex items-center justify-center border-2 transition-all ${
                        isChecked ? 'bg-accent border-accent' : 'border-border'
                      }`}>
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selected?.description && (
            <div className="mt-2 p-3 bg-bg rounded-xl border border-border">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Descripción técnica</p>
              <p className="text-xs text-ink/70 leading-relaxed line-clamp-3">{selected.description}</p>
            </div>
          )}

          <button onClick={handleConfirm} disabled={!selected}
            className="mt-3 w-full py-3 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            {selected ? `Añadir "${selected.name}"` : 'Selecciona un ejercicio'}
          </button>
        </>
      )}
    </div>
  )
}
