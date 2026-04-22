import { X } from 'lucide-react'

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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink/95 backdrop-blur-sm"
      onClick={onClose}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 flex-shrink-0"
        onClick={e => e.stopPropagation()}>
        <p className="text-white/60 text-sm font-medium">Técnica del ejercicio</p>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Vídeo */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8"
        onClick={e => e.stopPropagation()}>
        {ytId ? (
          <div className="w-full max-w-lg">
            <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl"
              style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                title="Vídeo ejercicio"
              />
            </div>
          </div>
        ) : (
          /* Fallback para vídeos no-YouTube */
          <div className="w-full max-w-lg rounded-2xl overflow-hidden bg-black shadow-2xl">
            <video src={url} controls autoPlay className="w-full" />
          </div>
        )}
      </div>

      {/* Tap fuera para cerrar */}
      <p className="text-center text-white/30 text-xs pb-6 flex-shrink-0">Toca fuera para cerrar</p>
    </div>
  )
}
