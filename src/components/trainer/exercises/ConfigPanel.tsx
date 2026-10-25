import { useState } from 'react'
import { X, Trash2, Settings2 } from 'lucide-react'
import { ESPECIALIDADES } from '../../../lib/especialidades'
import { CATS_KEY, ESPS_KEY, TAGS_KEY, DEFAULT_CATS, TAG_COLORS, TagBadge, load, save, type CustomEsp, type CustomTag } from './classification'

export function ConfigPanel({ trainerId, onClose, onRefresh }: { trainerId: string; onClose: () => void; onRefresh: () => void }) {
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
              <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Del sistema (fijas)</p>
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
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Personalizadas</p>
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
