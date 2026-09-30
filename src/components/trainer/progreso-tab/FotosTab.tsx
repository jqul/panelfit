import { useState, useEffect, useMemo } from 'react'
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { EmptyState } from './helpers'

interface PhotoSession { id: string; date: string; front?: string; side?: string; back?: string; note?: string }

export function FotosTab({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<PhotoSession[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<{ session: PhotoSession; type: 'front'|'side'|'back' } | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareA, setCompareA] = useState<string | null>(null)
  const [compareB, setCompareB] = useState<string | null>(null)
  useEffect(() => {
    setLoading(true)
    supabase.from('foto_sessions').select('*').eq('client_id', clientId).order('date', { ascending: false })
      .then(({ data }) => { if (data) setPhotos(data.map((r: any) => ({ id: r.id, date: r.date, front: r.front_url, side: r.side_url, back: r.back_url, note: r.note || '' }))); setLoading(false) })
  }, [clientId])
  const TYPES: ('front'|'side'|'back')[] = ['front','side','back']
  const TYPE_LABELS = { front: 'Frente', side: 'Lateral', back: 'Espalda' }
  const allImages = useMemo(() => { const imgs: { session: PhotoSession; type: 'front'|'side'|'back' }[] = []; photos.forEach(s => TYPES.forEach(t => { if (s[t]) imgs.push({ session: s, type: t }) })); return imgs }, [photos])
  const lightboxIdx = lightbox ? allImages.findIndex(i => i.session.id === lightbox.session.id && i.type === lightbox.type) : -1
  if (loading) return <div className="py-8 text-center text-muted text-sm">Cargando fotos...</div>
  if (!photos.length) return <EmptyState icon={<Camera className="w-8 h-8 opacity-30" />} text="Sin fotos aún" sub="Las fotos aparecerán cuando el cliente las suba desde su panel" />
  const sessionsWithPhotos = photos.filter(s => s.front || s.side || s.back)
  return (
    <div className="space-y-4">
      {sessionsWithPhotos.length >= 2 && (
        <button onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null) }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${compareMode ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`}>
          🔄 {compareMode ? 'Salir de comparativa' : 'Comparar fechas'}
        </button>
      )}
      {compareMode && (
        <div className="grid grid-cols-2 gap-3">
          {(['A','B'] as const).map((slot, si) => {
            const selectedId = si === 0 ? compareA : compareB
            const session = photos.find(p => p.id === selectedId)
            return (
              <div key={slot} className="space-y-2">
                <p className="text-xs font-bold text-muted uppercase">Sesión {slot}</p>
                <select value={selectedId || ''} onChange={e => si === 0 ? setCompareA(e.target.value) : setCompareB(e.target.value)} className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs outline-none">
                  <option value="">Seleccionar...</option>
                  {sessionsWithPhotos.map(s => <option key={s.id} value={s.id}>{new Date(s.date+'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</option>)}
                </select>
                {session && <div className="grid grid-cols-3 gap-1">{TYPES.map(t => session[t] ? <div key={t}><p className="text-[9px] text-muted text-center font-semibold">{TYPE_LABELS[t]}</p><img src={session[t]} className="w-full aspect-[3/4] object-cover rounded-lg border border-border" alt="" /></div> : null)}</div>}
              </div>
            )
          })}
        </div>
      )}
      {!compareMode && sessionsWithPhotos.map(session => (
        <div key={session.id} className="bg-bg rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Camera className="w-4 h-4 text-muted flex-shrink-0" />
            <div className="flex-1"><p className="text-sm font-semibold">{new Date(session.date+'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>{session.note && <p className="text-xs text-muted mt-0.5 italic">"{session.note}"</p>}</div>
            <span className="text-xs text-muted">{TYPES.filter(t => session[t]).length}/3</span>
          </div>
          <div className="p-3 grid grid-cols-3 gap-2">
            {TYPES.map(type => session[type] ? (
              <div key={type} className="space-y-1"><p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{TYPE_LABELS[type]}</p><button onClick={() => setLightbox({ session, type })} className="w-full aspect-[3/4] rounded-xl overflow-hidden border border-border hover:border-accent transition-colors"><img src={session[type]} className="w-full h-full object-cover" alt="" /></button></div>
            ) : (
              <div key={type} className="space-y-1"><p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{TYPE_LABELS[type]}</p><div className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-border flex items-center justify-center"><Camera className="w-4 h-4 text-muted/30" /></div></div>
            ))}
          </div>
        </div>
      ))}
      {lightbox && lightbox.session[lightbox.type] && (
        <div className="fixed inset-0 z-[200] bg-ink/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {lightboxIdx > 0 && <button onClick={e => { e.stopPropagation(); setLightbox(allImages[lightboxIdx-1]) }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><ChevronLeft className="w-6 h-6" /></button>}
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white text-sm font-semibold">{new Date(lightbox.session.date+'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · {TYPE_LABELS[lightbox.type]}</p>
              <button onClick={() => setLightbox(null)} className="p-1 text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <img src={lightbox.session[lightbox.type]} className="w-full rounded-2xl" alt="" />
          </div>
          {lightboxIdx < allImages.length - 1 && <button onClick={e => { e.stopPropagation(); setLightbox(allImages[lightboxIdx+1]) }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"><ChevronRight className="w-6 h-6" /></button>}
        </div>
      )}
    </div>
  )
}
