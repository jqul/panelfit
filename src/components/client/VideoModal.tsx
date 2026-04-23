import { X } from 'lucide-react'

interface Props {
  url: string
  label?: string
  onClose: () => void
}

function getYTId(url: string) {
  const m = url?.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function isMobile() {
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function VideoModal({ url, label, onClose }: Props) {
  const ytId = getYTId(url)

  // En móvil con YouTube — abrir directamente, sin modal
  if (ytId && isMobile()) {
    window.open(url, '_blank', 'noopener,noreferrer')
    onClose()
    return null
  }

  const embedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-white/60 text-sm truncate flex-1 mr-2">{label || 'Técnica del ejercicio'}</p>
        <button onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        {embedUrl ? (
          <div className="w-full rounded-2xl overflow-hidden"
            style={{ aspectRatio: '16/9', maxHeight: '70vh' }}>
            <iframe
              src={embedUrl}
              className="w-full h-full"
              style={{ border: 'none' }}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Vídeo ejercicio"
            />
          </div>
        ) : (
          <video src={url} controls playsInline autoPlay
            className="w-full rounded-xl" style={{ maxHeight: '70vh' }} />
        )}
      </div>

      <div className="flex-shrink-0 py-4 text-center">
        <button onClick={onClose} className="text-white/30 text-xs">Cerrar</button>
      </div>
    </div>
  )
}
