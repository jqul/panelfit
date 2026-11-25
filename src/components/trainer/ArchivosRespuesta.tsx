import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react'
import { archivosDe, extensionDe, tamanoLegible } from '../../lib/archivos'
import { archivosPorIds, urlDescarga, type ArchivoFila } from '../../lib/archivosCliente'
import { toast } from '../shared/Toast'

// Los archivos que un cliente envió como respuesta a una pregunta de tipo «archivos»: su lista y la descarga. Se carga aparte (lazy). Solo se muestran los que la base de datos deja
// ver a este entrenador (los de sus clientes); se descargan con un enlace firmado de 5 minutos, siempre como archivo adjunto y nunca abiertos dentro de la app.

function Icono({ nombre }: { nombre: string }) {
  const ext = extensionDe(nombre)
  const cls = 'w-4 h-4 text-muted flex-shrink-0'
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) return <ImageIcon className={cls} aria-hidden="true" />
  if (['xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className={cls} aria-hidden="true" />
  return <FileText className={cls} aria-hidden="true" />
}

export default function ArchivosRespuesta({ valor }: { valor: unknown }) {
  const citados = archivosDe(valor)
  const [filas, setFilas] = useState<Map<string, ArchivoFila> | null>(null)
  const [bajando, setBajando] = useState<string | null>(null)
  const clave = citados.map(a => a.id).join(',')
  useEffect(() => {
    let vivo = true
    archivosPorIds(citados.map(a => a.id)).then(r => { if (vivo) setFilas(new Map(r.map(f => [f.id, f]))) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  const descargar = async (a: ArchivoFila) => {
    setBajando(a.id)
    const url = await urlDescarga(a.ruta, a.nombre)
    setBajando(null)
    if (!url) { toast('No se pudo preparar la descarga. Inténtalo de nuevo', 'warn'); return }
    const enlace = document.createElement('a')
    enlace.href = url; enlace.rel = 'noopener noreferrer'; enlace.download = a.nombre
    document.body.appendChild(enlace); enlace.click(); enlace.remove()
  }

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1.5">
        {citados.map(c => {
          const f = filas?.get(c.id)
          const caducado = f?.estado === 'caducado'
          const disponible = !!f && (f.estado === 'verificado' || f.estado === 'enviado')
          return (
            <li key={c.id} className="flex items-center gap-2.5 px-3 py-2 bg-bg border border-border rounded-xl">
              <Icono nombre={c.nombre} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{c.nombre}</p>
                <p className="text-xs text-muted">
                  {tamanoLegible(c.tamano)}
                  {filas && caducado && ' · borrado por caducidad'}
                  {filas && !caducado && !disponible && ' · no disponible'}
                </p>
              </div>
              {disponible && (
                <button type="button" onClick={() => descargar(f!)} disabled={bajando === c.id} aria-label={`Descargar ${c.nombre}`}
                  className="min-h-[44px] px-3 flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 disabled:opacity-50">
                  <Download className="w-3.5 h-3.5" aria-hidden="true" /> {bajando === c.id ? 'Preparando…' : 'Descargar'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-[11px] text-muted">Enviado por el cliente. Se descarga como archivo: ábrelo con tu propio programa (un Excel o un CSV pueden llevar fórmulas).</p>
    </div>
  )
}
