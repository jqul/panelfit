import { X, ExternalLink } from 'lucide-react'

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
  const mobile = isMobile()

  // En móvil: YouTube siempre abre la app — mejor abrir en navegador
  // En desktop: iframe funciona perfectamente
  const openInBrowser = () => {
    // Forzar apertura en navegador web, no en app YouTube
    // youtube.com/watch funciona en navegador si el usuario no tiene la app o la tiene pero abre Safari/Chrome primero
    const webUrl = ytId
      ? `https://www.youtube.com/watch?v=${ytId}`
      : url
    window.open(webUrl, '_blank', 'noopener,noreferrer')
  }

  const embedUrl = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
    : null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <p className="text-white/60 text-sm truncate flex-1 mr-2">{label || 'Técnica del ejercicio'}</p>
        <button onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center px-4">
        {!ytId ? (
          /* Vídeo nativo — funciona siempre */
          <video src={url} controls playsInline autoPlay className="w-full rounded-xl"
            style={{ maxHeight: '70vh' }} />
        ) : mobile ? (
          /* MÓVIL — no se puede evitar que abra la app de YouTube con iframe
             Solución: mostrar miniatura grande + botón para abrir en navegador */
          <div className="w-full space-y-4">
            <div className="relative w-full rounded-2xl overflow-hidden bg-black"
              style={{ aspectRatio: '16/9' }}>
              <img
                src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` }}
                className="w-full h-full object-cover"
                alt=""
              />
              {/* Logo YouTube encima */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white ml-1">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={openInBrowser}
                className="w-full flex items-center justify-center gap-2 py-4 bg-red-600 text-white rounded-2xl font-bold text-base active:opacity-80">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M8 5v14l11-7z"/></svg>
                Ver en YouTube
              </button>
              <p className="text-white/40 text-xs text-center">
                Se abrirá en el navegador
              </p>
            </div>
          </div>
        ) : (
          /* DESKTOP — iframe funciona perfectamente */
          <div className="w-full rounded-2xl overflow-hidden"
            style={{ aspectRatio: '16/9', maxHeight: '70vh' }}>
            <iframe
              src={embedUrl!}
              className="w-full h-full"
              style={{ border: 'none' }}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Vídeo ejercicio"
            />
          </div>
        )}
      </div>

      {/* Fondo tapable para cerrar */}
      <div className="flex-shrink-0 py-4 text-center">
        <button onClick={onClose} className="text-white/30 text-xs">
          Toca aquí para cerrar
        </button>
      </div>
    </div>
  )
}
