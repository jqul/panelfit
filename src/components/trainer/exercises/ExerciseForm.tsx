import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ESPECIALIDADES } from '../../../lib/especialidades'
import type { LibraryExercise, LibraryVideo } from '../../../types'
import { norm } from '../../../lib/globalSearch'
import { fraseUso } from '../../../lib/usoEjercicio'
import { MATERIALES, inferMaterial, ORIGEN_LABEL, type Origen } from '../../../lib/exerciseLibrary'
import { MuscleDiagram } from '../MuscleDiagram'
import { CATS_KEY, ESPS_KEY, TAGS_KEY, DEFAULT_CATS, TAG_COLORS, load, type CustomTag } from './classification'

// ── Ficha completa del ejercicio (dentro del cajón lateral) ───────────────
export interface FormState {
  name: string; description: string; category: string
  especialidades: string[]; videos: LibraryVideo[]; tags: string[]
  material: string; alternativas: string[]
}
export const emptyForm = (): FormState => ({ name:'', description:'', category:'', especialidades:[], videos:[], tags:[], material:'', alternativas:[] })
export const formFrom = (ex: LibraryExercise): FormState => ({
  name: ex.name, description: ex.description || '', category: ex.category || '', especialidades: ex.especialidades || [],
  videos: ex.videos || [], tags: ex.tags || [], material: ex.material || '', alternativas: ex.alternativas || [],
})

function getYTId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface ExFormProps {
  initial: FormState; trainerId: string; title: string
  origen: Origen; useCount: number
  /** Clientes que lo llevan ahora en su plan; null mientras se leen (o si no se pudo). */
  uso?: string[] | null
  /** Ejercicios de la biblioteca: sugerencias para las alternativas. */
  library: LibraryExercise[]
  onSave: (f: FormState) => void; onCancel: () => void
}

export function ExerciseForm({ initial, trainerId, title, origen, useCount, uso, library, onSave, onCancel }: ExFormProps) {
  const [form, setForm] = useState<FormState>(initial)
  const [newAlt, setNewAlt] = useState('')
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoLabel, setNewVideoLabel] = useState('')
  const [newVideoEsps, setNewVideoEsps] = useState<string[]>([])       // para YouTube URL
  const [uploadVideoEsps, setUploadVideoEsps] = useState<string[]>([]) // para subida local
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
    const nv: LibraryVideo = { url:newVideoUrl.trim(), label:newVideoLabel.trim()||undefined, especialidades:newVideoEsps }
    setForm(f => ({ ...f, videos:[...f.videos, nv] }))
    setNewVideoUrl(''); setNewVideoLabel(''); setNewVideoEsps([])
  }

  // Alternativas: sugerencias del mismo grupo (o de toda la biblioteca si aún no tiene), sin las ya elegidas ni él mismo.
  const altSugeridas = library
    .filter(e => e.name !== form.name && !form.alternativas.includes(e.name) && (!form.category || e.category === form.category))
    .filter(e => !newAlt.trim() || norm(e.name).includes(norm(newAlt)))
    .slice(0, 6)
  const addAlt = (name: string) => {
    const n = name.trim()
    if (!n || form.alternativas.some(a => norm(a) === norm(n)) || norm(n) === norm(form.name)) { setNewAlt(''); return }
    setForm(f => ({ ...f, alternativas: [...f.alternativas, n] })); setNewAlt('')
  }
  const deducido = !form.material ? inferMaterial(form.name) : ''
  const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${on ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
        <div className="min-w-0">
          <h3 className="text-lg font-serif font-bold truncate">{title}</h3>
          <p className="text-xs text-muted mt-0.5">{ORIGEN_LABEL[origen]}{useCount > 0 && ` · usado ${useCount} ${useCount === 1 ? 'vez' : 'veces'} en planes`}</p>
          {uso && <p className="text-xs text-muted mt-0.5">{fraseUso(uso)}</p>}
        </div>
        <button onClick={onCancel} aria-label="Cerrar" className="p-2 -mr-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink"><X className="w-4 h-4"/></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
      <div className="flex items-center justify-center bg-bg border border-border rounded-2xl py-3 min-h-[90px]">
        {form.name.trim() || form.category
          ? <MuscleDiagram category={form.category} name={form.name} size={72} />
          : <p className="text-xs text-muted">Escribe un nombre o elige grupo muscular para ver el pictograma</p>}
      </div>

      <div>
        <label htmlFor="ejercicio-nombre" className="block text-xs font-semibold text-muted mb-1">Nombre *</label>
        <input id="ejercicio-nombre" autoFocus type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
          placeholder="Ej: Sentadilla barra"
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"/>
        {origen === 'base' && <p className="text-[11px] text-muted mt-1">Es del catálogo base. Puedes cambiarle el nombre o duplicarlo para hacer tu variante: tus planes antiguos siguen funcionando.</p>}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted mb-1.5">Grupo muscular</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Grupo muscular">
          {cats.map(c => <button key={c} type="button" aria-pressed={form.category===c} onClick={()=>setForm(f=>({...f,category:f.category===c?'':c}))} className={chip(form.category===c)}>{c}</button>)}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted mb-1.5">Material {deducido && <span className="font-normal">· parece {deducido}</span>}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Material">
          {MATERIALES.map(m => <button key={m} type="button" aria-pressed={(form.material||deducido)===m} onClick={()=>setForm(f=>({...f,material:f.material===m?'':m}))} className={chip((form.material||deducido)===m)}>{m}</button>)}
        </div>
      </div>

      <div>
        <label htmlFor="ejercicio-descripcion" className="block text-xs font-semibold text-muted mb-1">Indicaciones técnicas</label>
        <textarea id="ejercicio-descripcion" rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
          placeholder="Claves técnicas, errores frecuentes..."
          className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none resize-none"/>
      </div>

      {/* Alternativas: lo que el cliente puede hacer si no puede con este ejercicio (material ocupado, etc.) */}
      <div>
        <label htmlFor="ejercicio-alternativa" className="block text-xs font-semibold text-muted mb-1">Alternativas</label>
        <p className="text-[11px] text-muted mb-2">Qué puede hacer tu cliente si no puede con este (p. ej. el banco está ocupado).</p>
        {form.alternativas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.alternativas.map(a => (
              <span key={a} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-bg-alt border border-border">
                {a}
                <button type="button" aria-label={`Quitar alternativa ${a}`} onClick={()=>setForm(f=>({...f,alternativas:f.alternativas.filter(x=>x!==a)}))} className="p-0.5 text-muted hover:text-warn"><X className="w-3 h-3"/></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input id="ejercicio-alternativa" value={newAlt} onChange={e=>setNewAlt(e.target.value)} onKeyDown={e=>{ if (e.key==='Enter') { e.preventDefault(); addAlt(newAlt) } }}
            placeholder="Busca o escribe un ejercicio" className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent/20"/>
          <button type="button" onClick={()=>addAlt(newAlt)} disabled={!newAlt.trim()} className="px-3 py-2 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">Añadir</button>
        </div>
        {altSugeridas.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {altSugeridas.map(e => <button key={e.id} type="button" onClick={()=>addAlt(e.name)} className="px-2.5 py-1 rounded-lg text-[11px] border border-dashed border-border text-muted hover:border-accent hover:text-accent">+ {e.name}</button>)}
          </div>
        )}
      </div>

      {/* Especialidades (sistema + custom) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-muted">Especialidades del ejercicio</label>
          <span className="text-[11px] text-muted">Añade más en ⚙️ Configurar</span>
        </div>
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
              <div key={i} className="bg-bg border border-border rounded-xl p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  {ytId && <img src={`https://img.youtube.com/vi/${ytId}/default.jpg`} className="w-12 h-9 object-cover rounded flex-shrink-0" alt=""/>}
                  <input value={v.label||''} onChange={e=>{const vs=[...form.videos];vs[i]={...vs[i],label:e.target.value};setForm(f=>({...f,videos:vs}))}}
                    placeholder="Etiqueta del vídeo..." className="flex-1 text-xs bg-transparent outline-none border-b border-border focus:border-accent"/>
                  <button onClick={()=>setForm(f=>({...f,videos:f.videos.filter((_,idx)=>idx!==i)}))} className="p-1 text-muted hover:text-warn flex-shrink-0"><X className="w-3.5 h-3.5"/></button>
                </div>
                {/* Edición rápida de especialidades del vídeo */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-[11px] text-muted uppercase tracking-wider self-center mr-1">Especialidades:</span>
                  {allEsps.map(e => {
                    const active = (v.especialidades||[]).includes(e.id)
                    return (
                      <button key={e.id} type="button"
                        onClick={()=>{
                          const vs=[...form.videos]
                          const esps=vs[i].especialidades||[]
                          vs[i]={...vs[i],especialidades:active?esps.filter(x=>x!==e.id):[...esps,e.id]}
                          setForm(f=>({...f,videos:vs}))
                        }}
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold border transition-all ${active?'bg-accent text-white border-accent':'border-border text-muted hover:border-accent'}`}>
                        {e.emoji} {e.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Añadir vídeo */}
      <div className="bg-bg-alt border border-border rounded-xl p-3 space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Añadir vídeo</p>
        <div className="flex gap-1 bg-bg p-0.5 rounded-lg border border-border w-fit">
          {(['url','file'] as const).map(m => (
            <button key={m} type="button" onClick={()=>setVideoMode(m)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${videoMode===m?'bg-card shadow-sm text-ink':'text-muted'}`}>
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
        {/* Opciones extra — solo cuando hay URL/archivo */}
        {newVideoUrl.trim() && (
          <>
            <input type="text" value={newVideoLabel} onChange={e=>setNewVideoLabel(e.target.value)}
              placeholder="Etiqueta del vídeo (opcional)" className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-xs outline-none"/>
            <div>
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1.5">Solo mostrar a clientes de... (opcional)</p>
              <div className="flex flex-wrap gap-1.5">
                {allEsps.map(e => {
                  const esps = videoMode === 'file' ? uploadVideoEsps : newVideoEsps
                  const setEsps = videoMode === 'file' ? setUploadVideoEsps : setNewVideoEsps
                  const active = esps.includes(e.id)
                  return (
                    <button key={e.id} type="button" onClick={()=>setEsps(p=>p.includes(e.id)?p.filter(x=>x!==e.id):[...p,e.id])}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border transition-all ${active?'bg-accent text-white border-accent':'border-border text-muted'}`}>
                      {e.emoji} {e.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted mt-1">Sin selección = vídeo genérico visible para todos</p>
            </div>
          </>
        )}
        <button onClick={addVideo} disabled={!newVideoUrl.trim()||uploading}
          className="w-full py-2 bg-ink text-white rounded-lg text-xs font-semibold disabled:opacity-40">
          + Añadir vídeo
        </button>
      </div>

      </div>

      <div className="px-5 sm:px-6 py-4 border-t border-border flex-shrink-0 bg-card flex gap-2" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button onClick={onCancel} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
        <button onClick={()=>onSave(form)} disabled={!form.name.trim()}
          className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">Guardar</button>
      </div>
    </div>
  )
}
