import { useEffect, useState } from 'react'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { isDemoClientId } from '../../lib/demoIds'

// En Hoy, debajo del entreno: "Tienes un cuestionario de tu entrenador". Sin pendientes no pinta nada.
// Se carga aparte (lazy): la carga inicial de la app del cliente no crece.
export function CuestionarioAviso({ clientId, onAbrir }: { clientId: string; onAbrir: () => void }) {
  const [nombres, setNombres] = useState<string[]>([])

  useEffect(() => {
    if (isDemoClientId(clientId)) return
    supabase.rpc('encuestas_pendientes').then(({ data }) => setNombres(((data || []) as { nombre: string }[]).map(d => d.nombre)))
  }, [clientId])

  if (!nombres.length) return null
  return (
    <button onClick={onAbrir}
      className="w-full flex items-center gap-3 bg-card border border-accent/30 rounded-2xl px-4 py-3 text-left hover:border-accent transition-colors">
      <span className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0" aria-hidden><ClipboardList className="w-4 h-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{nombres.length === 1 ? 'Tienes un cuestionario pendiente' : `Tienes ${nombres.length} cuestionarios pendientes`}</span>
        <span className="block text-xs text-muted truncate">{nombres.join(' · ')}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
    </button>
  )
}
