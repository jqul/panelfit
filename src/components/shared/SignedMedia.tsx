import { useSignedUrl } from '../../lib/signedMedia'

// exercise-videos / client-videos / media son buckets privados (contenido de
// salud: vídeos de técnica, fotos de progreso) — la fila guarda un path o una
// URL pública antigua, y aquí se resuelve una URL firmada de corta duración
// en el momento de verlo, en vez de una URL pública permanente.

export function SignedVideo({ bucket, src, className, controls = true }: {
  bucket: string; src: string | null | undefined; className?: string; controls?: boolean
}) {
  const url = useSignedUrl(bucket, src)
  if (!src) return null
  if (!url) return <div className={`${className || ''} bg-bg-alt animate-pulse`} />
  return <video src={url} className={className} controls={controls} />
}

export function SignedImage({ bucket, src, alt, className, onClick }: {
  bucket: string; src: string | null | undefined; alt?: string; className?: string; onClick?: () => void
}) {
  const url = useSignedUrl(bucket, src)
  if (!src) return null
  if (!url) return <div className={`${className || ''} bg-bg-alt animate-pulse`} />
  return <img src={url} alt={alt || ''} className={className} onClick={onClick} />
}
