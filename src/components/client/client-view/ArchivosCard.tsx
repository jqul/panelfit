import { useEffect, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import { toast } from '../../shared/Toast'
import { documentosDelCliente, tamanoLegible, urlDocumento, type Documento } from '../../../lib/documentos'

// Más → Archivos: los documentos que el entrenador ha compartido con este cliente. Qué le toca lo decide la base de
// datos (visibilidad y etiquetas, lib/documentos); sin ninguno, la tarjeta no sale.
export function ArchivosCard({ trainerId }: { trainerId: string }) {
  const [docs, setDocs] = useState<Documento[]>([])
  const [abriendo, setAbriendo] = useState<string | null>(null)

  useEffect(() => {
    if (!trainerId || trainerId.startsWith('demo-')) return
    let vivo = true
    documentosDelCliente(trainerId).then(d => { if (vivo) setDocs(d) })
    return () => { vivo = false }
  }, [trainerId])

  if (!docs.length) return null

  const abrir = async (d: Documento) => {
    // La pestaña se abre ya, dentro del toque: si se abre después de esperar la URL, Safari la bloquea
    const ventana = window.open('', '_blank')
    setAbriendo(d.id)
    const url = await urlDocumento(d.ruta)
    setAbriendo(null)
    if (url && ventana) ventana.location.href = url
    else if (url) window.location.href = url
    else { ventana?.close(); toast('No se pudo abrir el archivo', 'warn') }
  }

  return (
    <section aria-label="Archivos" className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Archivos</p>
      </div>
      <ul className="divide-y divide-border">
        {docs.map(d => (
          <li key={d.id}>
            <button onClick={() => abrir(d)} disabled={abriendo === d.id} aria-label={`Abrir ${d.titulo}`}
              className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-bg-alt disabled:opacity-60" style={{ minHeight: '56px' }}>
              <FileText className="w-5 h-5 text-muted flex-shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{d.titulo}</p>
                <p className="text-xs text-muted truncate">{d.descripcion || tamanoLegible(d.tamano)}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted flex-shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
