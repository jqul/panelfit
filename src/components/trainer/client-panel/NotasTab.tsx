import { anadirEtiquetaANotas } from '../../../lib/notasPrivadas'
import type { EstadoNotas } from '../../../hooks/useNotasPrivadas'

const TAGS = ['⚠️ Lesión', '🔥 Alta intensidad', '🐢 Progreso lento', '⭐ Cliente VIP', '📞 Llamar esta semana']
const ESTADO: Record<EstadoNotas, string> = { idle: '', pendiente: 'Sin guardar…', guardando: 'Guardando…', guardado: 'Guardado ✓', error: 'No se pudo guardar: se reintentará al seguir escribiendo' }

// Las notas viven en su propia tabla (no en el plan: el cliente lee el plan entero). El estado lo lleva FichaSections
// (useNotasPrivadas) para poder mostrar «Tienes notas guardadas» sin abrir la sección.
export function NotasTab({ notas, cargando, estado, onChange }: { notas: string; cargando: boolean; estado: EstadoNotas; onChange: (texto: string) => void }) {
  return (
    <div className="max-w-lg space-y-4">
      <div><h3 className="font-serif font-bold text-lg">Notas privadas</h3><p className="text-xs text-muted">Solo las ves tú. El cliente no puede leerlas.</p></div>
      <textarea rows={10} value={notas} onChange={e => onChange(e.target.value)} disabled={cargando}
        placeholder={cargando ? 'Cargando…' : 'Ej: Cuidado con la rodilla izquierda...'} aria-label="Notas privadas"
        className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed" />
      <div className="flex flex-wrap gap-2">
        {TAGS.map(tag => (
          <button key={tag} onClick={() => onChange(anadirEtiquetaANotas(notas, tag))} disabled={cargando}
            className="px-3 py-1.5 text-xs border border-border rounded-lg hover:border-accent hover:text-accent transition-colors">{tag}</button>
        ))}
      </div>
      <p className="text-xs text-muted min-h-4" role="status" aria-live="polite">{ESTADO[estado]}</p>
    </div>
  )
}
