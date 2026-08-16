import { useEffect, useRef, useState } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, Video, X, Inbox } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

const G = 9.81 // m/s²
const FPS_OPTIONS = [24, 25, 30, 60, 120, 240]

interface LibraryVideo { id: string; exercise_name: string; video_url: string; created_at: number }

interface Props {
  clientId?: string
  onComputed: (heightCm: number, note: string) => void
  onClose: () => void
}

// Calcula la altura de un salto vertical a partir del tiempo de vuelo marcado
// sobre el propio vídeo (despegue → aterrizaje), en vez de un cronómetro manual.
// h = g·t²/8 — mismo principio que usan las apps de referencia del sector
// (My Jump 2), validadas contra plataformas de fuerza de laboratorio.
export function JumpVideoAnalyzer({ clientId, onComputed, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [fps, setFps] = useState(30)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [takeoff, setTakeoff] = useState<number | null>(null)
  const [landing, setLanding] = useState<number | null>(null)
  const [source, setSource] = useState<'file' | 'library'>('file')
  const [library, setLibrary] = useState<LibraryVideo[] | null>(null)

  useEffect(() => {
    if (source !== 'library' || library !== null || !clientId) return
    supabase.from('video_feedback').select('id, exercise_name, video_url, created_at')
      .eq('client_id', clientId).order('created_at', { ascending: false })
      .then(({ data }) => setLibrary((data || []) as LibraryVideo[]))
  }, [source, clientId, library])

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoUrl(url => { if (url) URL.revokeObjectURL(url); return URL.createObjectURL(file) })
    setTakeoff(null); setLanding(null)
  }

  const pickLibraryVideo = (v: LibraryVideo) => {
    setVideoUrl(v.video_url)
    setTakeoff(null); setLanding(null)
  }

  const step = (dir: 1 | -1) => {
    const v = videoRef.current; if (!v) return
    v.pause(); setIsPlaying(false)
    const t = Math.max(0, v.currentTime + dir / fps)
    v.currentTime = t; setCurrentTime(t)
  }

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play(); setIsPlaying(true) } else { v.pause(); setIsPlaying(false) }
  }

  const flightTime = takeoff !== null && landing !== null ? landing - takeoff : null
  const heightCm = flightTime && flightTime > 0 ? (G * flightTime ** 2 / 8) * 100 : null
  const suspicious = flightTime !== null && flightTime > 0 && (flightTime < 0.2 || flightTime > 1.2)

  return (
    <div className="bg-white border-2 border-accent/30 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-accent flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Calcular altura desde vídeo</p>
        <button onClick={onClose} className="text-muted hover:text-warn"><X className="w-3.5 h-3.5" /></button>
      </div>

      {!videoUrl ? (
        <>
          {clientId && (
            <div className="flex gap-2">
              <button onClick={() => setSource('file')} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${source === 'file' ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>Subir archivo</button>
              <button onClick={() => setSource('library')} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${source === 'library' ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>Vídeos del cliente</button>
            </div>
          )}

          {source === 'file' || !clientId ? (
            <label className="flex flex-col items-center justify-center gap-1.5 py-6 border-2 border-dashed border-border rounded-xl text-xs text-muted cursor-pointer hover:border-accent hover:text-accent">
              <Video className="w-5 h-5" />
              Elegir vídeo del salto
              <input type="file" accept="video/*" capture="environment" className="hidden" onChange={pickFile} />
            </label>
          ) : library === null ? (
            <div className="py-6 text-center text-xs text-muted">Cargando vídeos...</div>
          ) : library.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted">
              <Inbox className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
              El cliente no ha subido ningún vídeo todavía.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {library.map(v => (
                <button key={v.id} onClick={() => pickLibraryVideo(v)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-border text-left hover:border-accent transition-colors">
                  <span className="text-xs font-semibold truncate">{v.exercise_name}</span>
                  <span className="text-[10px] text-muted flex-shrink-0">{new Date(v.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <video ref={videoRef} src={videoUrl} playsInline className="w-full rounded-lg bg-black max-h-64"
            onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)} onPause={() => setIsPlaying(false)} />

          <div className="flex items-center justify-center gap-2">
            <button onClick={() => step(-1)} className="p-2 border border-border rounded-lg hover:border-accent transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={togglePlay} className="p-2 border border-border rounded-lg hover:border-accent transition-colors">{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
            <button onClick={() => step(1)} className="p-2 border border-border rounded-lg hover:border-accent transition-colors"><ChevronRight className="w-4 h-4" /></button>
            <span className="text-xs text-muted ml-2 tabular-nums">{currentTime.toFixed(3)}s</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[10px] text-muted font-semibold">FPS del vídeo</label>
            <select value={fps} onChange={e => setFps(parseInt(e.target.value))} className="px-2 py-1 bg-bg border border-border rounded-lg text-xs outline-none">
              {FPS_OPTIONS.map(f => <option key={f} value={f}>{f} fps</option>)}
            </select>
            <span className="text-[9px] text-muted">A más fps, más precisión — usa cámara lenta si tu móvil la tiene</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setTakeoff(currentTime)}
              className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${takeoff !== null ? 'bg-ok/10 border-ok text-ok' : 'border-border text-muted hover:border-accent'}`}>
              {takeoff !== null ? `✓ Despegue ${takeoff.toFixed(3)}s` : 'Marcar despegue'}
            </button>
            <button onClick={() => setLanding(currentTime)}
              className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${landing !== null ? 'bg-ok/10 border-ok text-ok' : 'border-border text-muted hover:border-accent'}`}>
              {landing !== null ? `✓ Aterrizaje ${landing.toFixed(3)}s` : 'Marcar aterrizaje'}
            </button>
          </div>

          {flightTime !== null && (
            flightTime <= 0 ? (
              <p className="text-xs text-warn">El aterrizaje debe ser posterior al despegue.</p>
            ) : (
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 space-y-1">
                <p className="text-xs text-muted">Tiempo de vuelo: <strong className="text-ink">{(flightTime * 1000).toFixed(0)} ms</strong></p>
                <p className="text-lg font-serif font-bold text-accent">{heightCm!.toFixed(1)} cm</p>
                {suspicious && <p className="text-[10px] text-warn">⚠ Tiempo de vuelo poco habitual — revisa las marcas antes de guardar.</p>}
                <button
                  onClick={() => onComputed(Math.round(heightCm! * 10) / 10, `Calculado desde vídeo · t. vuelo ${(flightTime * 1000).toFixed(0)}ms · ${fps}fps`)}
                  className="w-full mt-1 py-2 bg-ink text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
                  Usar este resultado
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
