import { useEffect, useState } from 'react'
import { Copy, Share2, QrCode, Download, Globe } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { isDemoTrainerId } from '../../lib/demoIds'
import { qrRuta, qrSvg } from '../../lib/qr'
import { toast } from '../shared/Toast'

// "Tu página pública": el enlace para captar clientes, a un toque de copiarlo, compartirlo o imprimirlo en un QR.
// Vive en Contactos porque es donde se ve lo que trae; si la página no está lista, dice qué falta.
export function PaginaPublicaCard({ trainerId, miNombre, onIrAAjustes }: { trainerId: string; miNombre?: string; onIrAAjustes: () => void }) {
  const [estado, setEstado] = useState<{ slug: string | null; activa: boolean } | null>(null)
  const [verQr, setVerQr] = useState(false)

  useEffect(() => {
    let vigente = true
    if (isDemoTrainerId(trainerId)) { setEstado({ slug: 'demo-alex', activa: true }); return }
    supabase.from('entrenadores').select('slug, public_page').eq('uid', trainerId).maybeSingle().then(({ data }) => {
      if (!vigente) return
      setEstado({ slug: data?.slug ?? null, activa: !!(data?.public_page as { activa?: boolean } | null)?.activa })
    })
    return () => { vigente = false }
  }, [trainerId])

  if (!estado) return null
  const lista = !!estado.slug && estado.activa
  const url = estado.slug ? `${window.location.origin}/p/${estado.slug}` : ''

  if (!lista) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
        <Globe className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Aún no tienes página pública activa</p>
          <p className="text-xs text-muted mt-0.5">
            {estado.slug ? 'Está creada pero desactivada: actívala para que la gente pueda escribirte.' : 'Con ella, quien te encuentre puede dejarte su contacto y te llega un aviso. Se crea en un minuto.'}
          </p>
          <button onClick={onIrAAjustes} className="mt-2 px-3 py-2 rounded-xl bg-ink text-white text-xs font-bold">Configurar mi página</button>
        </div>
      </div>
    )
  }

  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado ✓', 'ok') } catch { toast('No se pudo copiar', 'warn') }
  }
  const compartir = async () => {
    try { await navigator.share({ title: miNombre ? `Entrena con ${miNombre}` : 'Mi página de entrenador', text: 'Mira mi página y escríbeme:', url }) } catch { /* cerró el menú de compartir */ }
  }
  const descargarQr = () => {
    const blob = new Blob([qrSvg(url)], { type: 'image/svg+xml' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qr-${estado.slug}.svg`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const { tamano, d } = verQr ? qrRuta(url) : { tamano: 0, d: '' }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-accent" />
        <p className="text-sm font-semibold">Tu página pública</p>
        <button onClick={onIrAAjustes} className="ml-auto text-xs font-semibold text-muted hover:text-ink">Editar</button>
      </div>
      <p className="text-xs bg-bg border border-border rounded-xl px-3 py-2 break-all select-all">{url}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={copiar} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink text-white text-xs font-bold"><Copy className="w-3.5 h-3.5" /> Copiar enlace</button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button onClick={compartir} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-bg-alt"><Share2 className="w-3.5 h-3.5" /> Compartir</button>
        )}
        <button onClick={() => setVerQr(v => !v)} aria-expanded={verQr} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-bg-alt"><QrCode className="w-3.5 h-3.5" /> {verQr ? 'Ocultar QR' : 'Ver QR'}</button>
      </div>
      {verQr && (
        <div className="flex items-center gap-4">
          <svg viewBox={`0 0 ${tamano} ${tamano}`} width={160} height={160} role="img" aria-label="Código QR de tu página pública" shapeRendering="crispEdges" className="bg-white rounded-xl border border-border flex-shrink-0">
            <path d={d} fill="#000" />
          </svg>
          <div className="space-y-2">
            <p className="text-xs text-muted">Para tu perfil, un cartel o una tarjeta: quien lo escanee llega directo a tu página.</p>
            <button onClick={descargarQr} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-bg-alt"><Download className="w-3.5 h-3.5" /> Descargar (SVG)</button>
          </div>
        </div>
      )}
    </div>
  )
}
