import { useEffect, useRef, useState } from 'react'
import { FileText, Upload, Trash2, ExternalLink, PlayCircle, Link2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { DEMO_TRAINER_ID, DEMO_LABELS } from '../../lib/demo-data'
import {
  ACEPTA, borrarDocumento, cambiarVisibilidad, listarDocumentos, problemaArchivo, quienLoVe, subirDocumento,
  tamanoLegible, tituloDesdeNombre, enlaceDe, anadirVideo, esVideo, limpiarVideo, miniaturaVideo, plataformaVideo,
  type Documento, type Visibilidad,
} from '../../lib/documentos'

interface Etiqueta { id: string; name: string; emoji?: string }

const OPCIONES: { id: Visibilidad; label: string }[] = [
  { id: 'todos', label: 'Todos mis clientes' },
  { id: 'etiquetas', label: 'Solo algunas etiquetas' },
  { id: 'oculto', label: 'Oculto' },
]

/** Elegir quién ve un documento: todos, solo ciertas etiquetas, o nadie. */
function QuienLoVe({ visibilidad, etiquetas, todas, onChange, nombre }: {
  visibilidad: Visibilidad; etiquetas: string[]; todas: Etiqueta[]; nombre: string
  onChange: (v: Visibilidad, e: string[]) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-muted mb-1">¿Quién lo ve?</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Quién ve ${nombre}`}>
        {OPCIONES.map(o => (
          <button key={o.id} type="button" role="radio" aria-checked={visibilidad === o.id} onClick={() => onChange(o.id, etiquetas)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${visibilidad === o.id ? 'bg-ink text-white border-ink' : 'bg-card border-border text-muted hover:border-ink hover:text-ink'}`}>
            {o.label}
          </button>
        ))}
      </div>
      {visibilidad === 'etiquetas' && (
        todas.length === 0 ? <p className="text-xs text-muted">Aún no tienes etiquetas. Créalas en Más → Etiquetas.</p> : (
          <div className="flex flex-wrap gap-2">
            {todas.map(l => {
              const on = etiquetas.includes(l.id)
              return (
                <button key={l.id} type="button" aria-pressed={on} onClick={() => onChange(visibilidad, on ? etiquetas.filter(x => x !== l.id) : [...etiquetas, l.id])}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${on ? 'bg-accent/10 border-accent text-accent font-semibold' : 'bg-card border-border text-muted hover:text-ink'}`}>
                  {l.emoji} {l.name}
                </button>
              )
            })}
          </div>
        )
      )}
    </fieldset>
  )
}

// Más → Documentos: archivos para los clientes (normas, guías, manuales...) con quién los ve (lib/documentos).
export function DocumentosTab({ trainerId }: { trainerId: string }) {
  const [docs, setDocs] = useState<Documento[] | null>(null)
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([])
  const [archivo, setArchivo] = useState<File | null>(null)
  // Archivo del ordenador o vídeo por enlace (YouTube, Vimeo...)
  const [modo, setModo] = useState<'archivo' | 'video'>('archivo')
  const [enlace, setEnlace] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [visibilidad, setVisibilidad] = useState<Visibilidad>('todos')
  const [elegidas, setElegidas] = useState<string[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listarDocumentos(trainerId).then(d => { setDocs(d ?? []); if (d === null) toast('No se pudieron cargar los documentos', 'warn') })
    if (trainerId === DEMO_TRAINER_ID) { setEtiquetas(DEMO_LABELS); return }
    supabase.from('labels').select('id, name, emoji').eq('trainer_id', trainerId).order('created_at').then(({ data }) => setEtiquetas((data || []) as Etiqueta[]))
  }, [trainerId])

  const elegirArchivo = (f: File | undefined) => {
    if (!f) return
    const p = problemaArchivo(f)
    if (p) { toast(p, 'warn'); if (input.current) input.current.value = ''; return }
    setArchivo(f); if (!titulo) setTitulo(tituloDesdeNombre(f.name))
  }
  const limpiar = () => { setArchivo(null); setEnlace(''); setTitulo(''); setDescripcion(''); setVisibilidad('todos'); setElegidas([]); if (input.current) input.current.value = '' }

  const enlaceValido = limpiarVideo(enlace)
  const listo = modo === 'archivo' ? !!archivo : !!enlaceValido

  const subir = async () => {
    if (!listo || !titulo.trim()) return
    if (visibilidad === 'etiquetas' && elegidas.length === 0) { toast('Elige al menos una etiqueta', 'warn'); return }
    setSubiendo(true)
    const datos = { titulo: titulo.trim(), descripcion: descripcion.trim(), visibilidad, etiquetas: visibilidad === 'etiquetas' ? elegidas : [] }
    const doc = modo === 'video' ? await anadirVideo(trainerId, enlace, datos) : await subirDocumento(trainerId, archivo!, datos)
    setSubiendo(false)
    if (!doc) { toast(modo === 'video' ? 'No se pudo añadir el vídeo' : 'No se pudo subir el documento', 'warn'); return }
    setDocs(d => [doc, ...(d || [])]); limpiar()
    toast(`«${doc.titulo}» ${esVideo(doc) ? 'añadido' : 'subido'} ✓`, 'ok')
  }

  const cambiar = async (d: Documento, v: Visibilidad, e: string[]) => {
    const etiq = v === 'etiquetas' ? e : []
    setDocs(ds => ds?.map(x => x.id === d.id ? { ...x, visibilidad: v, etiquetas: etiq } : x) ?? ds)
    if (v === 'etiquetas' && etiq.length === 0) return // aún eligiendo: se guarda al marcar una etiqueta
    if (!await cambiarVisibilidad(trainerId, d.id, v, etiq)) toast('No se pudo cambiar quién lo ve', 'warn')
  }

  const borrar = async (d: Documento) => {
    if (!confirm(`¿Borrar «${d.titulo}»? Tus clientes dejarán de verlo.`)) return
    if (!await borrarDocumento(trainerId, d)) { toast('No se pudo borrar', 'warn'); return }
    setDocs(ds => ds?.filter(x => x.id !== d.id) ?? ds)
    toast('Documento borrado', 'ok')
  }

  const abrir = async (d: Documento) => {
    const url = await enlaceDe(d)
    if (url) window.open(url, '_blank', 'noopener'); else toast('No se pudo abrir el archivo', 'warn')
  }

  return (
    <div className="animate-fade-in max-w-2xl space-y-5">
      <div>
        <h2 className="text-3xl font-serif font-bold mb-1">Documentos y vídeos</h2>
        <p className="text-muted text-sm">Guías, normas, manuales o vídeos (clases grabadas, movilidad, técnica) para tus clientes. Los ven en su app, en Más → Archivos.</p>
      </div>

      <section aria-label="Subir documento" className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex gap-2" role="radiogroup" aria-label="Qué añades">
          {([['archivo', 'Archivo'], ['video', 'Vídeo (enlace)']] as const).map(([m, l]) => (
            <button key={m} type="button" role="radio" aria-checked={modo === m} onClick={() => { setModo(m); limpiar() }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${modo === m ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        {modo === 'video' ? (
          <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-border rounded-xl">
            <Link2 className="w-5 h-5 text-muted flex-shrink-0" aria-hidden />
            <input value={enlace} onChange={e => setEnlace(e.target.value)} maxLength={500} aria-label="Enlace del vídeo" placeholder="Pega el enlace de YouTube o Vimeo"
              className="flex-1 min-w-0 text-sm bg-transparent outline-none" />
          </label>
        ) : (
        <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent transition-colors">
          <Upload className="w-5 h-5 text-muted flex-shrink-0" aria-hidden />
          <span className="text-sm">{archivo ? <><strong>{archivo.name}</strong> <span className="text-muted">· {tamanoLegible(archivo.size)}</span></> : <span className="text-muted">Elige un archivo (PDF, imagen, Word, Excel… hasta 20 MB)</span>}</span>
          <input ref={input} type="file" accept={ACEPTA} className="sr-only" aria-label="Archivo" onChange={e => elegirArchivo(e.target.files?.[0])} />
        </label>
        )}
        {modo === 'video' && enlace.trim() && !enlaceValido && <p className="text-xs text-warn">Pega el enlace completo del vídeo (empieza por https://)</p>}
        {listo && (
          <>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} aria-label="Título" placeholder="Título"
              className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20" />
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={500} rows={2} aria-label="Descripción" placeholder="Descripción (opcional)"
              className="w-full text-sm bg-card border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
            <QuienLoVe nombre="el documento nuevo" visibilidad={visibilidad} etiquetas={elegidas} todas={etiquetas} onChange={(v, e) => { setVisibilidad(v); setElegidas(e) }} />
            <div className="flex justify-end gap-2">
              <button onClick={limpiar} className="px-3 py-2 border border-border rounded-xl text-xs font-semibold text-muted hover:text-ink">Cancelar</button>
              <button onClick={subir} disabled={subiendo || !titulo.trim()} className="px-4 py-2 bg-ink text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50">
                {subiendo ? 'Guardando…' : modo === 'video' ? 'Añadir vídeo' : 'Subir documento'}
              </button>
            </div>
          </>
        )}
      </section>

      {docs === null ? (
        <div className="h-24 bg-card border border-border rounded-2xl animate-pulse" />
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Todavía no has subido ningún documento.</p>
      ) : (
        <ul className="space-y-2" aria-label="Tus documentos">
          {docs.map(d => (
            <li key={d.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start gap-3">
                {esVideo(d) && miniaturaVideo(d.url!)
                  ? <img src={miniaturaVideo(d.url!)!} alt="" className="w-20 h-12 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                  : esVideo(d) ? <PlayCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" aria-hidden /> : <FileText className="w-5 h-5 text-muted flex-shrink-0 mt-0.5" aria-hidden />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{d.titulo}</p>
                  {d.descripcion && <p className="text-xs text-muted mt-0.5">{d.descripcion}</p>}
                  <p className="text-xs text-muted mt-1">{esVideo(d) ? `▶ ${plataformaVideo(d.url!)}` : tamanoLegible(d.tamano)} · <span className={d.visibilidad === 'oculto' ? 'text-warn' : ''}>{quienLoVe(d, etiquetas)}</span></p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => abrir(d)} aria-label={`Abrir ${d.titulo}`} className="p-2 rounded-lg text-muted hover:bg-bg-alt hover:text-ink"><ExternalLink className="w-4 h-4" /></button>
                  <button onClick={() => borrar(d)} aria-label={`Borrar ${d.titulo}`} className="p-2 rounded-lg text-muted hover:bg-warn/10 hover:text-warn"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {editando === d.id ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <QuienLoVe nombre={d.titulo} visibilidad={d.visibilidad} etiquetas={d.etiquetas} todas={etiquetas} onChange={(v, e) => cambiar(d, v, e)} />
                  <button onClick={() => setEditando(null)} className="mt-2 text-xs font-semibold text-accent">Listo</button>
                </div>
              ) : (
                <button onClick={() => setEditando(d.id)} className="mt-2 text-xs font-semibold text-accent">Cambiar quién lo ve</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
