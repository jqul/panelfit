import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

export function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // No mostrar si ya está instalada o fue descartada
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    const wasDismissed = localStorage.getItem('pf_pwa_dismissed')
    if (isInstalled || wasDismissed) return

    // iOS — no tiene beforeinstallprompt, usar instrucciones manuales
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)
    if (ios) { setTimeout(() => setShow(true), 3000); return }

    // Android/Chrome — esperar el evento
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setShow(false)
    setDismissed(true)
    localStorage.setItem('pf_pwa_dismissed', '1')
  }

  const install = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
  }

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in">
      <div className="bg-ink text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3"
        style={{ maxWidth: 400, margin: '0 auto' }}>
        {/* Icono */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#6e5438' }}>
          <span className="text-white font-bold text-sm">PF</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Instalar PanelFit</p>
          {isIOS ? (
            <p className="text-white/70 text-xs mt-0.5">
              Toca <span className="font-semibold">Compartir</span> → <span className="font-semibold">Añadir a inicio</span> para instalarlo como app
            </p>
          ) : (
            <p className="text-white/70 text-xs mt-0.5">
              Añade la app a tu pantalla de inicio para acceder más rápido
            </p>
          )}
          {!isIOS && (
            <button onClick={install}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white text-ink rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
              <Download className="w-3.5 h-3.5" /> Instalar
            </button>
          )}
        </div>

        <button onClick={dismiss} className="p-1 text-white/50 hover:text-white flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
