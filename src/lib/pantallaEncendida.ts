// Mantiene la pantalla encendida mientras se entrena: con el móvil apoyado en el rack, que se apague entre series
// obliga a desbloquearlo con las manos sudadas. Usa la Screen Wake Lock API (Chrome, Edge, Safari desde iOS 16.4);
// donde no existe no hace nada. El sistema libera el bloqueo solo al pasar la app a segundo plano, así que se
// vuelve a pedir al volver. Devuelve la función que lo suelta (al salir del entreno).

interface Candado { release: () => Promise<void> }
// Lo mínimo del documento que se usa (así se puede probar sin navegador)
interface DocumentLite {
  visibilityState: string
  addEventListener: (tipo: 'visibilitychange', f: () => void) => void
  removeEventListener: (tipo: 'visibilitychange', f: () => void) => void
}

export function mantenerPantallaEncendida(
  nav: { wakeLock?: { request: (tipo: 'screen') => Promise<Candado> } } = navigator,
  doc: DocumentLite = document,
): () => void {
  if (!nav.wakeLock) return () => {}
  let candado: Candado | null = null
  let activo = true

  const pedir = async () => {
    if (!activo || candado || doc.visibilityState !== 'visible') return
    try {
      const nuevo = await nav.wakeLock!.request('screen')
      if (!activo) { void nuevo.release().catch(() => {}); return } // se salió mientras se pedía
      candado = nuevo
      // Si el sistema lo suelta (segundo plano, ahorro de batería), se podrá pedir de nuevo
      ;(nuevo as Candado & { addEventListener?: (t: string, f: () => void) => void }).addEventListener?.('release', () => { if (candado === nuevo) candado = null })
    } catch { /* sin batería, o el navegador no lo permite: se entrena igual */ }
  }
  const alVolver = () => { void pedir() }

  doc.addEventListener('visibilitychange', alVolver)
  void pedir()

  return () => {
    activo = false
    doc.removeEventListener('visibilitychange', alVolver)
    const c = candado
    candado = null
    if (c) void c.release().catch(() => {})
  }
}
