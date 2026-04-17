import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Edit2, X, Video, Search, Settings2 } from 'lucide-react'
import { LibraryExercise, LibraryVideo } from '../../types'
import { ESPECIALIDADES, Especialidad } from '../../lib/especialidades'

// ── Persistencia ───────────────────────────────────────────
const TAGS_KEY      = (uid: string) => `pf_tags_${uid}`
const CATS_KEY      = (uid: string) => `pf_cats_${uid}`
const ESPS_KEY      = (uid: string) => `pf_esps_${uid}`

const DEFAULT_CATS = ['Piernas','Pecho','Espalda','Hombros','Bíceps','Tríceps','Core','Cardio','General']

export interface CustomTag  { id: string; label: string; emoji: string; colorIdx: number }
export interface CustomEsp  { id: string; label: string; emoji: string }

const TAG_COLORS = [
  { bg:'bg-blue-100',   text:'text-blue-700',   border:'border-blue-200'  },
  { bg:'bg-purple-100', text:'text-purple-700',  border:'border-purple-200'},
  { bg:'bg-pink-100',   text:'text-pink-700',    border:'border-pink-200'  },
  { bg:'bg-green-100',  text:'text-green-700',   border:'border-green-200' },
  { bg:'bg-orange-100', text:'text-orange-700',  border:'border-orange-200'},
  { bg:'bg-teal-100',   text:'text-teal-700',    border:'border-teal-200'  },
  { bg:'bg-rose-100',   text:'text-rose-700',    border:'border-rose-200'  },
  { bg:'bg-amber-100',  text:'text-amber-700',   border:'border-amber-200' },
]

function load<T>(key: string, def: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function save<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)) }

function TagBadge({ tag }: { tag: CustomTag }) {
  const c = TAG_COLORS[(tag.colorIdx ?? 0) % TAG_COLORS.length] ?? TAG_COLORS[0]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {tag.emoji} {tag.label}
    </span>
  )
}

// ── Panel configuración ────────────────────────────────────
function ConfigPanel({ trainerId, onClose, onRefresh }: { trainerId: string; onClose: () => void; onRefresh: () => void }) {
  const [section, setSection] = useState<'cats'|'esps'|'tags'>('cats')

  // Grupos musculares
  const [cats, setCats] = useState<string[]>(() => load(CATS_KEY(trainerId), DEFAULT_CATS))
  const [newCat, setNewCat] = useState('')
  const addCat = () => { if (!newCat.trim()) return; const u=[...cats,newCat.trim()]; setCats(u); save(CATS_KEY(trainerId),u); setNewCat(''); onRefresh() }
  const delCat = (i:number) => { const u=cats.filter((_,idx)=>idx!==i); setCats(u); save(CATS_KEY(trainerId),u); onRefresh() }
  const editCat = (i:number,v:string) => { const u=[...cats]; u[i]=v; setCats(u); save(CATS_KEY(trainerId),u) }

  // Especialidades
  const [esps, setEsps] = useState<CustomEsp[]>(() => load(ESPS_KEY(trainerId), []))
  const [newEspLabel, setNewEspLabel] = useState('')
  const [newEspEmoji, setNewEspEmoji] = useState('⚡')
  const addEsp = () => {
    if (!newEspLabel.trim()) return
    const u=[...esps,{ id:`esp_${Date.now()}`, label:newEspLabel.trim(), emoji:newEspEmoji }]
    setEsps(u); save(ESPS_KEY(trainerId),u); setNewEspLabel(''); onRefresh()
  }
  const delEsp = (id:string) => { const u=esps.filter(e=>e.id!==id); setEsps(u); save(ESPS_KEY(trainerId),u); onRefresh() }
  const editEsp = (id:string, updates:Partial<CustomEsp>) => { const u=esps.map(e=>e.id===id?{...e,...updates}:e); setEsps(u); save(ESPS_KEY(trainerId),u) }

  // Etiquetas
  const [tags, setTags] = useState<CustomTag[]>(() => load(TAGS_KEY(trainerId), []))
  const [newTagLabel, setNewTagLabel] = useState('')
  const [newTagEmoji, setNewTagEmoji] = useState('🏷️')
  const [newTagColor, setNewTagColor] = useState(0)
  const addTag = () => {
    if (!newTagLabel.trim()) return
    const u=[...tags,{ id:`tag_${Date.now()}`, label:newTagLabel.trim(), emoji:newTagEmoji, colorIdx:newTagColor }]
    setTags(u); save(TAGS_KEY(trainerId),u); setNewTagLabel(''); onRefresh()
  }
  const delTag = (id:string) => { const u=tags.filter(t=>t.id!==id); setTags(u); save(TAGS_KEY(trainerId),u); onRefresh() }
  const editTag = (id:string, updates:Partial<CustomTag>) => { const u=tags.map(t=>t.id===id?{...t,...updates}:t); setTags(u); save(TAGS_KEY(trainerId),u) }

  const SECTIONS = [
    { id:'cats' as const, label:'Grupos musculares', emoji:'💪' },
    { id:'esps' as const, label:'Especialidades',    emoji:'⚡' },
    { id:'tags' as const, label:'Etiquetas',         emoji:'🏷️' },
  ]

  return (
    <div className="bg-card border border-accent/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-alt/30">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold">Configurar clasificaciones</p>
        </div>
        <button onClick={onClose}><X className="w-4 h-4 text-muted" /></button>
      </div>

      {/* Tabs internas */}
      <div className="flex border-b border-border">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-all ${section===s.id ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-ink'}`}>
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-3">

        {/* ── Grupos musculares ── */}
        {section==='cats' && (
          <>
            <div className="space-y-1.5">
              {cats.map((cat,i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={cat} onChange={e=>editCat(i,e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
                  <button onClick={()=>delCat(i)} className="p-1.5 text-muted hover:text-warn flex-shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCat()}
                placeholder="Nuevo grupo muscular..." autoFocus
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              <button onClick={addCat} disabled={!newCat.trim()}
                className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold disabled:opacity-40">Añadir</button>
            </div>
          </>
        )}

        {/* ── Especialidades personalizadas ── */}
        {section==='esps' && (
          <>
            {/* Especialidades del sistema */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Del sistema (fijas)</p>
              <div className="flex flex-wrap gap-1.5">
                {ESPECIALIDADES.map(e => (
                  <span key={e.value} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs bg-bg-alt border border-border text-muted">
                    {e.emoji} {e.label}
                  </span>
                ))}
              </div>
            </div>
            {/* Personalizadas */}
            {esps.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Personalizadas</p>
                <div className="space-y-1.5">
                  {esps.map(esp => (
                    <div key={esp.id} className="flex items-center gap-2">
                      <input value={esp.emoji} onChange={e=>editEsp(esp.id,{emoji:e.target.value})}
                        className="w-8 text-center bg-bg border border-border rounded text-sm outline-none"/>
                      <input value={esp.label} onChange={e=>editEsp(esp.id,{label:e.target.value})}
                        className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none"/>
                      <button onClick={()=>delEsp(esp.id)} className="p-1.5 text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input value={newEspEmoji} onChange={e=>setNewEspEmoji(e.target.value)}
                className="w-10 text-center bg-bg border border-border rounded-lg text-sm outline-none" placeholder="⚡"/>
              <input value={newEspLabel} onChange={e=>setNewEspLabel(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEsp()}
                placeholder="Nueva especialidad..." autoFocus
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"/>
              <button onClick={addEsp} disabled={!newEspLabel.trim()}
                className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold disabled:opacity-40">Añadir</button>
            </div>
          </>
        )}

        {/* ── Etiquetas ── */}
        {section==='tags' && (
          <>
            {tags.length > 0 && (
              <div className="space-y-2">
                {tags.map(tag => {
                  const c = TAG_COLORS[(tag.colorIdx ?? 0) % TAG_COLORS.length] ?? TAG_COLORS[0]
                  return (
                    <div key={tag.id} className="flex items-center gap-2">
                      <input value={tag.emoji} onChange={e=>editTag(tag.id,{emoji:e.target.value})}
                        className="w-8 text-center bg-bg border border-border rounded text-sm outline-none"/>
                      <input value={tag.label} onChange={e=>editTag(tag.id,{label:e.target.value})}
                        className="flex-1 px-3 py-1.5 bg-bg border border-border rounded-lg text-sm outline-none"/>
                      <div className="flex gap-1">
                        {TAG_COLORS.map((col,i) => (
                          <button key={i} onClick={()=>editTag(tag.id,{colorIdx:i})}
                            className={`w-4 h-4 rounded-full ${col.bg} border-2 transition-all ${tag.colorIdx===i?'border-ink scale-110':'border-transparent'}`}/>
                        ))}
                      </div>
                      <TagBadge tag={tag}/>
                      <button onClick={()=>delTag(tag.id)} className="p-1.5 text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex gap-2 flex-wrap items-center">
              <input value={newTagEmoji} onChange={e=>setNewTagEmoji(e.target.value)}
                className="w-10 text-center bg-bg border border-border rounded-lg text-sm outline-none" placeholder="🏷️"/>
              <input value={newTagLabel} onChange={e=>setNewTagLabel(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag()}
                placeholder="Nueva etiqueta..." autoFocus
                className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"/>
              <div className="flex gap-1">
                {TAG_COLORS.map((col,i) => (
                  <button key={i} onClick={()=>setNewTagColor(i)}
                    className={`w-5 h-5 rounded-full ${col.bg} border-2 transition-all ${newTagColor===i?'border-ink scale-110':'border-transparent'}`}/>
                ))}
              </div>
              <button onClick={addTag} disabled={!newTagLabel.trim()}
                className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold disabled:opacity-40">Añadir</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── ExForm ─────────────────────────────────────────────────
interface FormState {
  name: string; description: string; category: string
  especialidades: string[]; videos: LibraryVideo[]; tags: string[]
}
const emptyForm = (): FormState => ({ name:'', description:'', category:'', especialidades:[], videos:[], tags:[] })

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface ExFormProps { initial:FormState; trainerId:string; onSave:(f:FormState)=>void; onCancel:()=>void; title:string }

function ExForm({ initial, trainerId, onSave, onCancel, title }: ExFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoLabel, setNewVideoLabel] = useState('')
  const [newVideoEsps, setNewVideoEsps] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [videoMode, setVideoMode] = useState<'url'|'file'>('url')

  const cats   = load(CATS_KEY(trainerId), DEFAULT_CATS)
  const esps   = load<{id:string;label:string;emoji:string}[]>(ESPS_KEY(trainerId), [])
  const tags   = load<CustomTag[]>(TAGS_KEY(trainerId), [])
  const allEsps = [
    ...ESPECIALIDADES.map(e => ({ id:e.value, label:e.label, emoji:e.emoji })),
    ...esps,
  ]

  const toggle = (field:'especialidades'|'tags', val:string) =>
    setForm(f => ({ ...f, [field]: f[field].includes(val) ? f[field].filter((x:string)=>x!==val) : [...f[field], val] }))

  const addVideo = () => {
    if (!newVideoUrl.trim()) return
    const nv: LibraryVideo = { url:newVideoUrl.trim(), label:newVideoLabel.trim()||undefined, especialidades:newVideoEsps as any }
    setForm(f => ({ ...f, videos:[...f.videos, nv] }))
    setNewVideoUrl(''); setNewVideoLabel(''); setNewVideoEsps([])
  }

  return (
    <div className="bg-card border border-accent/20 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={onCancel}><X className="w-4 h-4 text-muted"/></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Nombre *</label>
          <input autoFocus type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
            placeholder="Ej: Sentadilla barra"
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Grupo muscular</label>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
            className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none">
            <option value="">Sin categoría</option>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted mb-1">Descripción / notas</label>
        <textarea rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
          placeholder="Indicaciones técnicas..."
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none resize-none"/>
      </div>

      {/* Especialidades (sistema + custom) */}
      <div>
        <label className="block text-xs font-semibold text-muted mb-2">Especialidades</label>
        <div className="flex flex-wrap gap-2">
          {allEsps.map(e => (
            <button key={e.id} type="button" onClick={()=>toggle('especialidades',e.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs border transition-all ${form.especialidades.includes(e.id)?'bg-ink text-white border-ink':'border-border text-muted hover:border-accent'}`}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Etiquetas personalizadas */}
      {tags.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-muted mb-2">Etiquetas</label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const c = TAG_COLORS[(tag.colorIdx ?? 0) % TAG_COLORS.length] ?? TAG_COLORS[0]
              const active = form.tags.includes(tag.id)
              return (
                <button key={tag.id} type="button" onClick={()=>toggle('tags',tag.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs border-2 transition-all ${active?`${c.bg} ${c.text} ${c.border}`:'border-border text-muted hover:border-accent'}`}>
                  {tag.emoji} {tag.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Vídeos */}
      {form.videos.length > 0 && (
        <div className="space-y-2">
          {form.videos.map((v,i) => {
            const ytId = getYTId(v.url)
            return (
              <div key={i} className="flex items-center gap-2 bg-bg border border-border rounded-lg p-2">
                {ytId && <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-12 h-9 object-cover rounded" alt=""/>}
                <p className="flex-1 text-xs truncate">{v.label||v.url}</p>
                <button onClick={()=>setForm(f=>({...f,videos:f.videos.filter((_,idx)=>idx!==i)}))} className="p-1 text-muted hover:text-warn"><X className="w-3.5 h-3.5"/></button>
              </div>
            )
          })}
        </div>
      )}

      {/* Añadir vídeo */}
      <div className="bg-bg-alt border border-border rounded-xl p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Añadir vídeo</p>
        <div className="flex gap-1 bg-bg p-0.5 rounded-lg border border-border w-fit">
          {(['url','file'] as const).map(m => (
            <button key={m} type="button" onClick={()=>setVideoMode(m)}
              className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${videoMode===m?'bg-card shadow-sm text-ink':'text-muted'}`}>
              {m==='url'?'🔗 YouTube URL':'📁 Subir archivo'}
            </button>
          ))}
        </div>
        {videoMode==='url' ? (
          <input type="text" value={newVideoUrl} onChange={e=>setNewVideoUrl(e.target.value)}
            placeholder="URL YouTube" className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none"/>
        ) : (
          <label className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-lg text-xs font-semibold cursor-pointer ${uploading?'border-accent text-accent':'border-border text-muted hover:border-accent'}`}>
            {uploading?'Subiendo...':'📁 Seleccionar vídeo (máx 500MB)'}
            <input type="file" accept="video/*" className="hidden" disabled={uploading}
              onChange={async e => {
                const file=e.target.files?.[0]; if(!file) return
                setUploading(true)
                const ext=file.name.split('.').pop()
                const path=`${trainerId}/${Date.now()}.${ext}`
                const {error}=await supabase.storage.from('trainer-videos').upload(path,file,{upsert:true})
                if(error){alert('Error al subir');setUploading(false);return}
                const {data}=supabase.storage.from('trainer-videos').getPublicUrl(path)
                setNewVideoUrl(data.publicUrl);setUploading(false)
              }}/>
          </label>
        )}
        <input type="text" value={newVideoLabel} onChange={e=>setNewVideoLabel(e.target.value)}
          placeholder="Etiqueta del vídeo" className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none"/>
        <div className="flex flex-wrap gap-1.5">
          {allEsps.map(e => (
            <button key={e.id} type="button" onClick={()=>setNewVideoEsps(p=>p.includes(e.id)?p.filter(x=>x!==e.id):[...p,e.id])}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all ${newVideoEsps.includes(e.id)?'bg-accent text-white border-accent':'border-border text-muted'}`}>
              {e.emoji} {e.label}
            </button>
          ))}
        </div>
        <button onClick={addVideo} disabled={!newVideoUrl.trim()||uploading}
          className="w-full py-2 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">
          + Añadir vídeo
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
        <button onClick={()=>onSave(form)} disabled={!form.name.trim()}
          className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">Guardar</button>
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────
interface Props {
  exercises: LibraryExercise[]
  trainerId: string
  onAdd: (name:string,desc:string,cat:string,videos:LibraryVideo[],esps:string[],tags:string[])=>void
  onUpdate: (id:string,updates:Partial<LibraryExercise>)=>void
  onDelete: (id:string)=>void
}

// ── ExercisesTab ───────────────────────────────────────────
export function ExercisesTab({ exercises, trainerId, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('')
  const [filterEsp, setFilterEsp]   = useState('')
  const [filterTag, setFilterTag]   = useState('')
  const [editId, setEditId]         = useState<string|null>(null)
  const [showNew, setShowNew]       = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [editInitial, setEditInitial] = useState<FormState>(emptyForm())
  const [, forceUpdate] = useState(0)
  const refresh = () => forceUpdate(n=>n+1)

  const cats     = load(CATS_KEY(trainerId), DEFAULT_CATS)
  const esps     = load<{id:string;label:string;emoji:string}[]>(ESPS_KEY(trainerId), [])
  const tags     = load<CustomTag[]>(TAGS_KEY(trainerId), [])
  const allEsps  = [...ESPECIALIDADES.map(e=>({id:e.value,label:e.label,emoji:e.emoji})), ...esps]

  const filtered = exercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && ex.category !== filterCat) return false
    if (filterEsp && !(ex.especialidades||[]).includes(filterEsp as any)) return false
    if (filterTag && !((ex as any).tags||[]).includes(filterTag)) return false
    return true
  })

  const startEdit = (ex: LibraryExercise) => {
    setEditInitial({
      name:ex.name, description:ex.description||'', category:ex.category||'',
      especialidades:(ex.especialidades||[]) as string[],
      videos:ex.videos||[], tags:(ex as any).tags||[],
    })
    setEditId(ex.id); setShowNew(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold">Ejercicios</h2>
          <p className="text-muted text-sm mt-1">{exercises.length} ejercicios en tu biblioteca</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowConfig(!showConfig)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-sm font-semibold transition-all ${showConfig?'bg-ink text-white border-ink':'border-border text-muted hover:border-accent'}`}>
            <Settings2 className="w-3.5 h-3.5"/> Configurar
          </button>
          <button onClick={()=>{setShowNew(true);setEditId(null)}}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4"/> Nuevo ejercicio
          </button>
        </div>
      </div>

      {/* Panel configuración */}
      {showConfig && <ConfigPanel trainerId={trainerId} onClose={()=>{setShowConfig(false);refresh()}} onRefresh={refresh}/>}

      {showNew && (
        <ExForm key="new" initial={emptyForm()} trainerId={trainerId} title="Nuevo ejercicio"
          onSave={f=>{onAdd(f.name,f.description,f.category,f.videos,f.especialidades,f.tags);setShowNew(false)}}
          onCancel={()=>setShowNew(false)}/>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"/>
          <input type="text" placeholder="Buscar ejercicio..." value={search} onChange={e=>setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm outline-none"/>
        </div>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none text-muted">
          <option value="">Todos los grupos</option>
          {cats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterEsp} onChange={e=>setFilterEsp(e.target.value)}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none text-muted">
          <option value="">Todas especialidades</option>
          {allEsps.map(e=><option key={e.id} value={e.id}>{e.emoji} {e.label}</option>)}
        </select>
        {tags.length>0 && (
          <select value={filterTag} onChange={e=>setFilterTag(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm outline-none text-muted">
            <option value="">Todas etiquetas</option>
            {tags.map(t=><option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
          </select>
        )}
      </div>

      {/* Chips filtros activos */}
      {(filterEsp||filterTag||filterCat) && (
        <div className="flex gap-2 flex-wrap">
          {filterCat&&<button onClick={()=>setFilterCat('')} className="flex items-center gap-1 px-2.5 py-1 bg-ink text-white rounded-full text-xs font-semibold">{filterCat} <X className="w-3 h-3"/></button>}
          {filterEsp&&<button onClick={()=>setFilterEsp('')} className="flex items-center gap-1 px-2.5 py-1 bg-ink text-white rounded-full text-xs font-semibold">{allEsps.find(e=>e.id===filterEsp)?.emoji} {allEsps.find(e=>e.id===filterEsp)?.label} <X className="w-3 h-3"/></button>}
          {filterTag&&<button onClick={()=>setFilterTag('')} className="flex items-center gap-1 px-2.5 py-1 bg-ink text-white rounded-full text-xs font-semibold">{tags.find(t=>t.id===filterTag)?.emoji} {tags.find(t=>t.id===filterTag)?.label} <X className="w-3 h-3"/></button>}
        </div>
      )}

      {/* Lista */}
      {filtered.length===0 ? (
        <div className="text-center py-12 text-muted border-2 border-dashed border-border rounded-2xl">
          <p className="font-serif text-lg">Sin ejercicios</p>
          <p className="text-sm mt-1">Añade ejercicios a tu biblioteca para reutilizarlos en los planes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ex => {
            const exTags = ((ex as any).tags||[]) as string[]
            return (
              <div key={ex.id}>
                {editId===ex.id ? (
                  <ExForm key={`edit-${ex.id}`} initial={editInitial} trainerId={trainerId} title={`Editar: ${ex.name}`}
                    onSave={f=>{onUpdate(ex.id,{...f,tags:f.tags} as any);setEditId(null)}}
                    onCancel={()=>setEditId(null)}/>
                ) : (
                  <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{ex.name}</p>
                        {ex.category&&<span className="text-[10px] bg-bg-alt border border-border px-1.5 py-0.5 rounded-full text-muted">{ex.category}</span>}
                        {(ex.especialidades||[]).map(esp=>{
                          const info=allEsps.find(e=>e.id===esp)
                          return info?<span key={esp} className="text-[10px] bg-bg-alt border border-border px-1.5 py-0.5 rounded-full text-muted">{info.emoji} {info.label}</span>:null
                        })}
                        {exTags.map(tagId=>{
                          const tag=tags.find(t=>t.id===tagId)
                          return tag?<TagBadge key={tagId} tag={tag}/>:null
                        })}
                      </div>
                      {ex.description&&<p className="text-xs text-muted mt-0.5 truncate">{ex.description}</p>}
                      {(ex.videos?.length||0)>0&&(
                        <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
                          <Video className="w-3 h-3"/>{ex.videos!.length} vídeo{ex.videos!.length>1?'s':''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={()=>startEdit(ex)} className="p-1.5 text-muted hover:text-accent"><Edit2 className="w-3.5 h-3.5"/></button>
                      <button onClick={()=>onDelete(ex.id)} className="p-1.5 text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5"/></button>
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
