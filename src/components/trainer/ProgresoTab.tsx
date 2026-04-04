import { useState, useEffect, useRef } from 'react'
import { Camera, Plus, Trash2, Scale, ChevronDown, ChevronUp, X, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ClientData } from '../../types'
import { toast } from '../shared/Toast'

interface WeightEntry { date: string; weight: number }
interface PhotoSession {
  id: string
  date: string
  front?: string
  side?: string
  back?: string
  note?: string
}

interface Props { client: ClientData }

export function ProgresoTab({ client }: Props) {
  const [subtab, setSubtab] = useState<'peso' | 'fotos' | 'encuesta' | 'checkins'>('peso')
  const [checkins, setCheckins] = useState<any[]>([])
  const [loadingCheckins, setLoadingCheckins] = useState(false)
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [photos, setPhotos] = useState<PhotoSession[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [uploading, setUploading] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const LS_W = `pf_weight_${client.id}`
  const LS_P = `pf_photos_${client.id}`

  useEffect(() => {
    try { setWeights(JSON.parse(localStorage.getItem(LS_W) || '[]')) } catch {}
    try { setPhotos(JSON.parse(localStorage.getItem(LS_P) || '[]')) } catch {}
    loadCheckins()
  }, [client.id])

  const loadCheckins = async () => {
    setLoadingCheckins(true)
    const { data } = await supabase.from('checkins')
      .select('*').eq('clientId', client.id)
      .order('createdAt', { ascending: false }).limit(10)
    setCheckins(data || [])
    setLoadingCheckins(false)
  }

  const saveWeights = (w: WeightEntry[]) => {
    setWeights(w); localStorage.setItem(LS_W, JSON.stringify(w))
  }
  const savePhotos = (p: PhotoSession[]) => {
    setPhotos(p); localStorage.setItem(LS_P, JSON.stringify(p))
  }

  const addWeight = () => {
    const w = parseFloat(newWeight)
    if (!w || w < 20 || w > 300) { toast('Peso no válido', 'warn'); return }
    const existing = weights.find(x => x.date === newDate)
    if (existing) {
      saveWeights(weights.map(x => x.date === newDate ? { ...x, weight: w } : x))
    } else {
      saveWeights([...weights, { date: newDate, weight: w }].sort((a, b) => b.date.localeCompare(a.date)))
    }
    setNewWeight(''); toast('Peso registrado ✓', 'ok')
  }

  const deleteWeight = (date: string) => saveWeights(weights.filter(w => w.date !== date))

  const uploadPhoto = async (sessionId: string, type: 'front' | 'side' | 'back', file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast('Máximo 10MB', 'warn'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `fotos/${client.id}/${sessionId}/${type}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (error) { toast('Error al subir: ' + error.message, 'warn'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
    savePhotos(photos.map(s => s.id === sessionId ? { ...s, [type]: urlData.publicUrl } : s))
    toast('Foto guardada ✓', 'ok'); setUploading(false)
  }

  const newSession = () => {
    const session: PhotoSession = {
      id: `session_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      note: ''
    }
    savePhotos([session, ...photos])
    setExpandedSession(session.id)
  }

  const deleteSession = (id: string) => savePhotos(photos.filter(s => s.id !== id))

  // Encuesta
  const LS_ENC = `pf_encuesta_${client.id}`
  const [preguntas, setPreguntas] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_ENC) || 'null') || [
      '¿Cómo te has sentido esta semana en los entrenamientos?',
      '¿Has tenido alguna molestia o dolor?',
      '¿Estás descansando bien?',
      '¿Cómo ha ido la dieta?',
    ]} catch { return [] }
  })
  const [nuevaPregunta, setNuevaPregunta] = useState('')
  const savePreguntas = (p: string[]) => { setPreguntas(p); localStorage.setItem(LS_ENC, JSON.stringify(p)) }

  // Calcular cambio de peso
  const lastTwo = weights.slice(0, 2)
  const weightDiff = lastTwo.length === 2 ? (lastTwo[0].weight - lastTwo[1].weight) : null

  return (
    <div className="space-y-5 max-w-xl">
      <h3 className="font-serif font-bold text-lg">Progreso</h3>

      {/* Subtabs */}
      <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border w-fit flex-wrap">
        <button onClick={() => setSubtab('peso')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${subtab === 'peso' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
          <Scale className="w-4 h-4" /> Peso
        </button>
        <button onClick={() => setSubtab('fotos')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${subtab === 'fotos' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
          <Camera className="w-4 h-4" /> Fotos
        </button>
        <button onClick={() => setSubtab('encuesta')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${subtab === 'encuesta' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
          <MessageSquare className="w-4 h-4" /> Encuesta
        </button>
        <button onClick={() => { setSubtab('checkins'); loadCheckins() }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${subtab === 'checkins' ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}>
          📋 Check-ins {checkins.length > 0 && <span className="bg-accent text-white text-[10px] px-1.5 py-0.5 rounded-full">{checkins.length}</span>}
        </button>
      </div>

      {/* ── PESO ── */}
      {subtab === 'peso' && (
        <div className="space-y-4">
          {/* Stats rápidos */}
          {weights.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-serif font-bold">{weights[0].weight}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">kg actual</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className={`text-2xl font-serif font-bold ${weightDiff === null ? 'text-muted' : weightDiff > 0 ? 'text-warn' : weightDiff < 0 ? 'text-ok' : 'text-muted'}`}>
                  {weightDiff === null ? '—' : `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(1)}`}
                </p>
                <p className="text-[10px] text-muted uppercase tracking-wider">vs anterior</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-serif font-bold">{weights.length}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider">registros</p>
              </div>
            </div>
          )}

          {/* Añadir peso */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-semibold">Registrar peso</h4>
            <div className="flex gap-2">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="flex-1 px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
              />
              <div className="relative flex-1">
                <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addWeight()}
                  placeholder="75.5"
                  className="w-full px-3 py-2.5 pr-8 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">kg</span>
              </div>
              <button onClick={addWeight}
                className="px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 flex-shrink-0">
                + Añadir
              </button>
            </div>
          </div>

          {/* Historial */}
          {weights.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin registros de peso aún</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {weights.map(w => (
                <div key={w.date} className="flex items-center gap-4 px-4 py-3 group">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{w.weight} kg</p>
                    <p className="text-xs text-muted">{new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  <button onClick={() => deleteWeight(w.date)}
                    className="p-1.5 text-muted hover:text-warn opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FOTOS ── */}
      {subtab === 'fotos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">{photos.length} sesión{photos.length !== 1 ? 'es' : ''} de fotos</p>
            <button onClick={newSession}
              className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-semibold hover:opacity-90">
              <Plus className="w-4 h-4" /> Nueva sesión
            </button>
          </div>

          {photos.length === 0 && (
            <div className="text-center py-10 text-muted border-2 border-dashed border-border rounded-2xl">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin fotos de progreso aún</p>
              <p className="text-xs mt-1">Crea una sesión para añadir fotos de frente, lado y espalda</p>
            </div>
          )}

          {photos.map(session => (
            <div key={session.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Header sesión */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-alt/40 transition-colors"
                onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}>
                <Camera className="w-4 h-4 text-muted flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted">
                    {[session.front, session.side, session.back].filter(Boolean).length}/3 fotos
                  </p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                  className="p-1.5 text-muted hover:text-warn transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {expandedSession === session.id ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </div>

              {/* Fotos */}
              {expandedSession === session.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border">
                  <div className="grid grid-cols-3 gap-3 pt-3">
                    {(['front', 'side', 'back'] as const).map(type => {
                      const labels = { front: 'Frente', side: 'Lado', back: 'Espalda' }
                      const url = session[type]
                      return (
                        <div key={type} className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{labels[type]}</p>
                          <label className={`block relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                            url ? 'border-border' : 'border-dashed border-border hover:border-accent'
                          } aspect-[3/4]`}>
                            {url ? (
                              <>
                                <img src={url} className="w-full h-full object-cover" alt={labels[type]} />
                                <div className="absolute inset-0 bg-ink/0 hover:bg-ink/20 transition-colors flex items-center justify-center">
                                  <Camera className="w-6 h-6 text-white opacity-0 hover:opacity-100" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted">
                                <Camera className="w-6 h-6 opacity-40" />
                                <span className="text-[10px]">Subir foto</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" capture="environment" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) uploadPhoto(session.id, type, file)
                              }}
                            />
                          </label>
                        </div>
                      )
                    })}
                  </div>

                  {/* Nota */}
                  <textarea rows={2} value={session.note || ''}
                    onChange={e => savePhotos(photos.map(s => s.id === session.id ? { ...s, note: e.target.value } : s))}
                    placeholder="Nota de esta sesión (peso, observaciones...)"
                    className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                  />

                  {uploading && (
                    <p className="text-xs text-accent text-center">Subiendo foto...</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CHECK-INS */}
      {subtab === 'checkins' && (
        <div className="space-y-3">
          {loadingCheckins ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
            </div>
          ) : checkins.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <p className="text-sm">El cliente aún no ha enviado ningún check-in.</p>
              <p className="text-xs mt-1">Envíale el enlace de encuesta desde la pestaña Encuesta.</p>
            </div>
          ) : checkins.map((c, i) => (
            <div key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {new Date(c.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {i === 0 && <span className="text-[10px] bg-ok/10 text-ok font-bold px-2 py-0.5 rounded-full">Último</span>}
              </div>
              <div className="divide-y divide-border">
                {(c.respuestas || []).map((r: any, ri: number) => (
                  <div key={ri} className="px-4 py-3">
                    <p className="text-xs text-muted font-semibold mb-1">{r.pregunta}</p>
                    <p className="text-sm">{r.respuesta || <span className="text-muted italic">Sin respuesta</span>}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ENCUESTA */}
      {subtab === 'encuesta' && (
        <div className="space-y-4">
          <p className="text-xs text-muted">Configura las preguntas y envía el enlace al cliente cuando quieras.</p>
          <div className="space-y-2">
            {preguntas.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
                <span className="text-xs font-bold text-muted w-5 flex-shrink-0">{i + 1}.</span>
                <p className="text-sm flex-1">{p}</p>
                <button onClick={() => savePreguntas(preguntas.filter((_, idx) => idx !== i))}
                  className="p-1 text-muted hover:text-warn transition-colors flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Nueva pregunta..." value={nuevaPregunta}
              onChange={e => setNuevaPregunta(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && nuevaPregunta.trim()) { savePreguntas([...preguntas, nuevaPregunta.trim()]); setNuevaPregunta('') }}}
              className="flex-1 px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
            <button onClick={() => { if (nuevaPregunta.trim()) { savePreguntas([...preguntas, nuevaPregunta.trim()]); setNuevaPregunta('') }}}
              className="px-4 py-2.5 bg-ink text-white rounded-xl text-sm font-medium hover:opacity-90 flex-shrink-0">
              + Añadir
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?c=${client.token}&encuesta=1`); toast('Enlace copiado ✓', 'ok') }}
              className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold text-muted hover:border-ink hover:text-ink transition-all">
              🔗 Copiar enlace
            </button>
            <button onClick={() => {
              const url = `${window.location.origin}?c=${client.token}&encuesta=1`
              const msg = encodeURIComponent(`Hola ${client.name} 👋\n\nTe mando la encuesta de seguimiento:\n\n${url}\n\nTarda menos de 2 minutos 🙏`)
              window.open(`https://wa.me/?text=${msg}`, '_blank')
            }} className="flex-1 py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
              📱 Enviar por WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
