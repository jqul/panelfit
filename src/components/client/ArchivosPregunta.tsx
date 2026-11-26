import { useEffect, useRef, useState } from 'react'
import { FileText, FileSpreadsheet, Image as ImageIcon, Paperclip, X } from 'lucide-react'
import type { Pregunta } from '../../lib/cuestionarios'
import { ACEPTA, FORMATOS_LEGIBLES, MAX_ARCHIVOS, archivosDe, extensionDe, quedan, tamanoLegible, type ArchivoRef } from '../../lib/archivos'
import { archivosPendientes, descartarArchivo, subirArchivo, type Fase } from '../../lib/archivosCliente'

// La respuesta a una pregunta de tipo «archivos»: hasta 5 archivos de 20 MB (su rutina actual, programas anteriores…). Se carga aparte (lazy): solo la baja quien tiene una
// pregunta de este tipo. Cada archivo se sube y se COMPRUEBA en el servidor antes de contar; hasta el envío del cuestionario no lo ve nadie más (docs/archivos-cuestionarios.md).

const FASES: Record<Fase, string> = { preparando: 'Preparando…', subiendo: 'Subiendo…', comprobando: 'Comprobando…' }

function Icono({ nombre }: { nombre: string }) {
  const ext = extensionDe(nombre)
  const cls = 'w-5 h-5 text-muted flex-shrink-0'
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) return <ImageIcon className={cls} aria-hidden="true" />
  if (['xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className={cls} aria-hidden="true" />
  return <FileText className={cls} aria-hidden="true" />
}

interface Props { pregunta: Pregunta; valor: unknown; templateId: string; onChange: (v: ArchivoRef[]) => void; onOcupado: (ocupado: boolean) => void }

export default function ArchivosPregunta({ pregunta, valor, templateId, onChange, onOcupado }: Props) {
  const archivos = archivosDe(valor)
  // Lo último que se ha emitido: varias subidas seguidas no pueden pisarse con un valor viejo de props
  const actuales = useRef<ArchivoRef[]>(archivos)
  actuales.current = archivos
  const emitir = (v: ArchivoRef[]) => { actuales.current = v; onChange(v) }

  const [subiendo, setSubiendo] = useState<{ clave: string; nombre: string; fase: Fase }[]>([])
  const [errores, setErrores] = useState<{ clave: string; nombre: string; mensaje: string }[]>([])
  const [quitando, setQuitando] = useState<string[]>([])
  const input = useRef<HTMLInputElement>(null)
  const montado = useRef(true)
  useEffect(() => { montado.current = true; return () => { montado.current = false } }, [])
  // El padre no puede enviar mientras haya subidas en marcha; se le avisa por una referencia para no depender de que su función sea siempre la misma
  const avisarOcupado = useRef(onOcupado)
  avisarOcupado.current = onOcupado
  useEffect(() => { avisarOcupado.current(subiendo.length > 0 || quitando.length > 0) }, [subiendo.length, quitando.length])
  useEffect(() => () => avisarOcupado.current(false), [])

  // Lo que el servidor sabe que ya subió a esta pregunta es lo que vale (también si lo subió desde otro dispositivo o el borrador guardado ya no existe)
  useEffect(() => {
    let vivo = true
    archivosPendientes({ templateId, questionId: pregunta.id }).then(r => { if (vivo && r) emitir(r.slice(0, MAX_ARCHIVOS)) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, pregunta.id])

  const hueco = quedan(actuales.current.length + subiendo.length)

  const anadir = async (lista: FileList | null) => {
    const elegidos = lista ? [...lista] : []
    if (input.current) input.current.value = '' // así se puede volver a elegir el mismo archivo
    if (!elegidos.length) return
    setErrores([])
    let libres = quedan(actuales.current.length + subiendo.length)
    for (const file of elegidos) {
      const clave = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      if (libres <= 0) { setErrores(e => [...e, { clave, nombre: file.name, mensaje: `Solo caben ${MAX_ARCHIVOS} archivos. Quita alguno para añadir otro` }]); continue }
      libres--
      if (montado.current) setSubiendo(s => [...s, { clave, nombre: file.name, fase: 'preparando' }])
      const r = await subirArchivo({ templateId, questionId: pregunta.id }, file, fase => { if (montado.current) setSubiendo(s => s.map(x => (x.clave === clave ? { ...x, fase } : x))) })
      if (montado.current) setSubiendo(s => s.filter(x => x.clave !== clave))
      if (r.ok) { if (!actuales.current.some(a => a.id === r.archivo.id)) emitir([...actuales.current, r.archivo]) }
      else { libres++; if (montado.current) setErrores(e => [...e, { clave, nombre: file.name, mensaje: r.error }]) }
    }
  }

  const quitar = async (a: ArchivoRef) => {
    setQuitando(q => [...q, a.id])
    const ok = await descartarArchivo(a.id)
    if (montado.current) setQuitando(q => q.filter(x => x !== a.id))
    if (ok) emitir(actuales.current.filter(x => x.id !== a.id))
    else if (montado.current) setErrores(e => [...e, { clave: `q_${a.id}`, nombre: a.nombre, mensaje: 'No se pudo quitar el archivo. Inténtalo de nuevo' }])
  }

  return (
    <div className="space-y-2" role="group" aria-label={pregunta.label}>
      {(archivos.length > 0 || subiendo.length > 0) && (
        <ul className="space-y-1.5">
          {archivos.map(a => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2 bg-bg border border-border rounded-xl">
              <Icono nombre={a.nombre} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.nombre}</p>
                <p className="text-xs text-muted">{tamanoLegible(a.tamano)}</p>
              </div>
              <button type="button" onClick={() => quitar(a)} disabled={quitando.includes(a.id)} aria-label={`Quitar ${a.nombre}`}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-warn disabled:opacity-40">
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
          {subiendo.map(s => (
            <li key={s.clave} className="flex items-center gap-3 px-3 py-2 bg-bg border border-dashed border-border rounded-xl">
              <Icono nombre={s.nombre} />
              <p className="flex-1 min-w-0 text-sm truncate">{s.nombre}</p>
              <p role="status" className="text-xs text-muted flex-shrink-0">{FASES[s.fase]}</p>
            </li>
          ))}
        </ul>
      )}

      {errores.map(e => (
        <div key={e.clave} role="alert" className="flex items-start gap-2 text-xs text-warn font-medium">
          <p className="flex-1"><span className="font-semibold">{e.nombre}:</span> {e.mensaje}</p>
          <button type="button" aria-label={`Cerrar aviso de ${e.nombre}`} onClick={() => setErrores(x => x.filter(y => y.clave !== e.clave))} className="text-muted"><X className="w-3 h-3" aria-hidden="true" /></button>
        </div>
      ))}

      <input ref={input} type="file" multiple accept={ACEPTA} aria-label="Elegir archivos" className="sr-only" tabIndex={-1} onChange={e => anadir(e.target.files)} />
      <button type="button" onClick={() => input.current?.click()} disabled={hueco <= 0}
        className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 border border-dashed border-border rounded-xl text-sm font-semibold text-ink hover:border-accent disabled:opacity-50">
        <Paperclip className="w-4 h-4" aria-hidden="true" /> {archivos.length ? 'Añadir otro archivo' : 'Añadir archivos'}
      </button>
      <p className="text-xs text-muted">{archivos.length} de {MAX_ARCHIVOS} · hasta 20 MB cada uno: {FORMATOS_LEGIBLES}.</p>
    </div>
  )
}
