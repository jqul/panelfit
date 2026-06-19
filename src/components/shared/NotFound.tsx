export function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-6">
        <div className="space-y-1">
          <p className="text-8xl font-serif font-bold text-ink/10">404</p>
          <h1 className="text-3xl font-serif font-bold">
            Panel<span className="text-accent italic">Fit</span>
          </h1>
        </div>
        <div>
          <p className="text-lg font-semibold text-ink">Enlace no encontrado</p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Este enlace no existe o ha caducado. Si eres cliente, pide a tu entrenador que te envíe el enlace correcto.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <a href="/"
            className="px-6 py-3 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
            Ir al inicio
          </a>
          <a href="https://wa.me/?text=Hola,%20necesito%20mi%20enlace%20de%20PanelFit"
            target="_blank" rel="noreferrer"
            className="px-6 py-3 border border-[#25D366]/40 text-[#25D366] rounded-xl text-sm font-semibold hover:bg-[#25D366]/5 transition-colors flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.554 4.103 1.523 5.824L.057 23.082a.75.75 0 00.921.921l5.258-1.466A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.698-.499-5.253-1.373l-.377-.214-3.914 1.092 1.092-3.914-.214-.377A9.937 9.937 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Pedir enlace por WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
