import { useState, useEffect } from 'react'
import { Scale, Camera, TrendingUp, Trophy, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { TrainingLogs } from '../../types'
import { supabase } from '../../lib/supabase'

interface Props {
  clientId: string
  logs: TrainingLogs
}

interface WeightEntry { date: string; weight: number }
interface PhotoSession { id: string; date: string; front?: string; side?: string; back?: string; note?: string }

export function ProgresoClienteTab({ clientId, logs }: Props) {
  const [subtab, setSubtab] = useState<'peso' | 'fotos' | 'records'>('peso')
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [photos, setPhotos] = useState<PhotoSession[]>([])
  const [newWeight, setNewWeight] = useState('')
  const [uploading, setUploading] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const LS_W = `pf_weight_${clientId}`
  const LS_P = `pf_photos_${clientId}`

  useEffect(() => {
    try { setWeights(JSON.parse(localStorage.getItem(LS_W) || '[]')) } catch {}
    try { setPhotos(JSON.parse(localStorage.getItem(LS_P) || '[]')) } catch {}
  }, [clientId])

  const saveWeights = (w: WeightEntry[]) => { setWeights(w); localStorage.setItem(LS_W, JSON.stringify(w)) }
  const savePhotos = (p: PhotoSession[]) => { setPhotos(p); localStorage.setItem(LS_P, JSON.stringify(p)) }

  const addWeight = () => {
    const w = parseFloat(newWeight)
    if (!w || w < 20 || w > 300) return
    const date = new Date().toISOString().split('T')[0]
    saveWeights([{ date, weight: w }, ...weights.filter(x => x.date !== date)].sort((a, b) => b.date.localeCompare(a.date)))
    setNewWeight('')
  }

  const uploadPhoto = async (sessionId: string, type: 'front' | 'side' | 'back', file: File) => {
    if (file.size > 10 * 1024 * 1024) return
    setUploading(true)
    const path = `fotos/${clientId}/${sessionId}/${type}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      savePhotos(photos.map(s => s.id === sessionId ? { ...s, [type]: data.publicUrl } : s))
    }
    setUploading(false)
  }

  // Calcular récords personales
  const records: Record<string, number> = {}
  Object.entries(logs).forEach(([key, log]) => {
    const m = key.match(/ex_w\d+_d\d+_r(\d+)/)
    if (!m) return
    const exName = key.split('_r')[0]
    Object.values(log.sets || {}).forEach((s) => {
      const w = parseFloat(s.weight) || 0
      if (!records[exName] || w > records[exName]) records[exName] = w
    })
  })
  const sortedRecords = Object.entries(records).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const pesoInicial = weights[weights.length - 1]?.weight
  const pesoActual = weights[0]?.weight
  const pesoCambio = pesoInicial && pesoActual ? pesoActual - pesoInicial : null

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-4">
      <h3 className="font-serif font-bold text-xl">Tu progreso</h3>

      {/* Subtabs */}
      <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border">
        {[
          { id: 'peso', icon: <Scale className="w-4 h-4" />, label: 'Peso' },
          { id: 'fotos', icon: <Camera className="w-4 h-4" />, label: 'Fotos' },
          { id: 'records', icon: <Trophy className="w-4 h-4" />, label: 'Récords' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubtab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${subtab === t.id ? 'bg-card shadow-sm text-ink' : 'text-muted'}`}
            style={{ minHeight: '44px' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* PESO */}
      {subtab === 'peso' && (
        <div className="space-y-4">
          {/* Resumen */}
          {weights.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-serif font-bold">{pesoActual}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">kg actual</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className={`text-2xl font-serif font-bold ${pesoCambio === null ? 'text-muted' : pesoCambio < 0 ? 'text-ok' : pesoCambio > 0 ? 'text-warn' : 'text-muted'}`}>
                  {pesoCambio === null ? '—' : `${pesoCambio > 0 ? '+' : ''}${pesoCambio.toFixed(1)}`}
                </p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">cambio total</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className="text-2xl font-serif font-bold">{weights.length}</p>
                <p className="text-[10px] text-muted uppercase tracking-wider mt-1">registros</p>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addWeight()}
                placeholder="Registrar peso de hoy (kg)"
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-base outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                style={{ fontSize: '16px' }}
              />
            </div>
            <button onClick={addWeight} style={{ minHeight: '44px' }}
              className="px-5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 flex-shrink-0">
              + Añadir
            </button>
          </div>

          {/* Mini gráfica */}
          {weights.length >= 3 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted mb-3">Evolución</p>
              <div className="flex items-end gap-1 h-16">
                {weights.slice(0, 10).reverse().map((w, i) => {
                  const min = Math.min(...weights.map(x => x.weight))
                  const max = Math.max(...weights.map(x => x.weight))
                  const range = max - min || 1
                  const h = Math.max(8, ((w.weight - min) / range) * 48 + 8)
                  const isLast = i === Math.min(weights.length, 10) - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full rounded-sm transition-all ${isLast ? 'bg-accent' : 'bg-bg-alt border border-border'}`}
                        style={{ height: `${h}px` }} />
                      <p className="text-[8px] text-muted">{w.weight}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Historial */}
          {weights.length > 0 && (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {weights.map((w, i) => (
                <div key={w.date} className="flex items-center gap-4 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-accent' : 'bg-bg-alt border border-border'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{w.weight} kg</p>
                    <p className="text-xs text-muted">{new Date(w.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  {i > 0 && (
                    <p className={`text-xs font-bold ${w.weight > weights[i-1].weight ? 'text-warn' : w.weight < weights[i-1].weight ? 'text-ok' : 'text-muted'}`}>
                      {w.weight > weights[i-1].weight ? '+' : ''}{(w.weight - weights[i-1].weight).toFixed(1)}
                    </p>
                  )}
                  <button onClick={() => saveWeights(weights.filter((_, idx) => idx !== i))}
                    className="p-1.5 text-muted hover:text-warn transition-colors" style={{ minWidth: '44px', minHeight: '44px' }}>
                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {weights.length === 0 && (
            <div className="text-center py-10 text-muted">
              <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Registra tu peso para ver tu evolución</p>
            </div>
          )}
        </div>
      )}

      {/* FOTOS */}
      {subtab === 'fotos' && (
        <div className="space-y-4">
          <button onClick={() => {
            const s: PhotoSession = { id: `s_${Date.now()}`, date: new Date().toISOString().split('T')[0] }
            savePhotos([s, ...photos])
            setExpandedSession(s.id)
          }} style={{ minHeight: '44px' }}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-2xl text-muted hover:border-accent hover:text-accent transition-all text-sm font-semibold">
            <Plus className="w-4 h-4" /> Nueva sesión de fotos
          </button>

          {photos.length === 0 && (
            <div className="text-center py-10 text-muted">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin fotos aún. Crea una sesión para empezar.</p>
            </div>
          )}

          {photos.map(session => (
            <div key={session.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}>
                <Camera className="w-4 h-4 text-muted" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {new Date(session.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted">{[session.front, session.side, session.back].filter(Boolean).length}/3 fotos</p>
                </div>
                <button onClick={e => { e.stopPropagation(); savePhotos(photos.filter(s => s.id !== session.id)) }}
                  className="p-2 text-muted hover:text-warn transition-colors" style={{ minWidth: '44px', minHeight: '44px' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {expandedSession === session.id ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </div>

              {expandedSession === session.id && (
                <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(['front', 'side', 'back'] as const).map(type => {
                      const labels = { front: 'Frente', side: 'Lado', back: 'Espalda' }
                      const url = session[type]
                      return (
                        <div key={type} className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted text-center">{labels[type]}</p>
                          <label className={`block cursor-pointer rounded-xl overflow-hidden border-2 aspect-[3/4] ${url ? 'border-border' : 'border-dashed border-border hover:border-accent'}`}
                            style={{ minHeight: '100px' }}>
                            {url ? (
                              <img src={url} className="w-full h-full object-cover" alt={`${labels[type]} de progreso`} />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted p-2">
                                <Camera className="w-5 h-5 opacity-40" />
                                <span className="text-[10px] text-center">Toca para subir</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" capture="environment" className="hidden"
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(session.id, type, f) }} />
                          </label>
                        </div>
                      )
                    })}
                  </div>
                  {uploading && <p className="text-xs text-accent text-center">Subiendo foto...</p>}
                  <textarea rows={2} value={session.note || ''}
                    onChange={e => savePhotos(photos.map(s => s.id === session.id ? { ...s, note: e.target.value } : s))}
                    placeholder="Nota de esta sesión..."
                    className="w-full px-3 py-2 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* RÉCORDS */}
      {subtab === 'records' && (
        <div className="space-y-4">
          {sortedRecords.length === 0 ? (
            <div className="text-center py-10 text-muted">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Completa entrenamientos para ver tus récords</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {sortedRecords.map(([key, best], i) => {
                const name = key.split('_').slice(1).join(' ') || key
                return (
                  <div key={key} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-bg-alt text-muted'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </div>
                    <p className="text-sm flex-1 truncate capitalize">{name.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-bold text-accent flex-shrink-0">{best} kg</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
