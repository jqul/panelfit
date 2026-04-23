import { X, Play } from 'lucide-react'
import { useState } from 'react'

interface Props {
  url: string
  onClose: () => void
}

function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

export function VideoModal({ url, onClose }: Props) {
  const ytId = getYTId(url)
  const [playing, setPlaying] = useState(false)

  // URL embed con parámetros que evitan redirección a app nativa
  const embedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 bg-black">
        <p className="text-white/60 text-sm">Técnica del ejercicio</p>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
          style={{ minWidth: 44, minHeight: 44 }}>
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Vídeo centrado */}
      <div className="flex-1 flex items-center justify-center px-0 bg-black">
        {ytId ? (
          <div className="w-full" style={{ aspectRatio: '16/9', maxHeight: '70vh' }}>
            {playing ? (
              /* iframe solo se monta al pulsar play — evita redirección automática */
              <iframe
                src={embedUrl!}
                className="w-full h-full"
                style={{ border: 'none', display: 'block' }}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen={false}
                title="Vídeo ejercicio"
                referrerPolicy="strict-origin"
              />
            ) : (
              /* Pantalla de previa con botón play */
              <div className="w-full h-full relative bg-black flex items-center justify-center cursor-pointer"
                onClick={() => setPlaying(true)}>
                <img
                  src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                  onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
                  className="w-full h-full object-contain"
                  alt=""
                />
                {/* Overlay oscuro */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Botón play */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-2xl"
                    style={{ minWidth: 64, minHeight: 64 }}>
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Vídeo no-YouTube — usar <video> nativo */
          <video
            src={url}
            controls
            playsInline
            autoPlay
            className="w-full"
            style={{ maxHeight: '70vh' }}
          />
        )}
      </div>

      {/* Instrucción */}
      <div className="flex-shrink-0 py-4 text-center bg-black">
        <p className="text-white/30 text-xs">Toca fuera del vídeo para cerrar</p>
        {ytId && !playing && (
          <button
            onClick={() => setPlaying(true)}
            className="mt-2 px-4 py-2 bg-white/10 rounded-full text-white text-xs font-semibold">
            ▶ Reproducir
          </button>
        )}
      </div>

      {/* Tap fondo para cerrar */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  )
}
