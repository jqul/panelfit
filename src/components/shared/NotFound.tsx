export function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-1">Panel<span className="text-accent italic">Fit</span></h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
          <p className="text-6xl font-serif font-bold text-muted/30">404</p>
          <h2 className="font-serif font-bold text-xl">Enlace no válido</h2>
          <p className="text-sm text-muted leading-relaxed">
            Este enlace no existe o ha caducado. Pide a tu entrenador que te envíe el enlace correcto.
          </p>
        </div>
        <p className="text-xs text-muted">¿Eres entrenador? <a href="/" className="text-accent hover:underline font-semibold">Accede aquí</a></p>
      </div>
    </div>
  )
}
