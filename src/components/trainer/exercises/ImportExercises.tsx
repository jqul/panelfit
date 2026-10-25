import { useMemo, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Modal } from '../../shared/Modal'
import { parseImportText, readImportFile, MAX_IMPORT_ROWS, type ImportRow } from '../../../lib/exerciseImport'
import { norm } from '../../../lib/globalSearch'

interface Props {
  open: boolean
  existingNames: string[]
  categories: string[]
  onClose: () => void
  onImport: (rows: ImportRow[]) => Promise<void> | void
}

/** "Pierna" del CSV → "Piernas" de los grupos del entrenador; si no encaja, se respeta lo escrito. */
function matchCategory(raw: string | undefined, categories: string[]) {
  if (!raw) return undefined
  const n = norm(raw)
  return categories.find(c => norm(c) === n) ?? categories.find(c => norm(c).startsWith(n) || n.startsWith(norm(c))) ?? raw
}

export function ImportExercises({ open, existingNames, categories, onClose, onImport }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const preview = useMemo(() => {
    const p = parseImportText(text, existingNames)
    return { ...p, nuevos: p.nuevos.map(r => ({ ...r, category: matchCategory(r.category, categories) })) }
  }, [text, existingNames, categories])

  const close = () => { setText(''); setError(''); onClose() }

  const onFile = async (file?: File) => {
    if (!file) return
    try { setText(await readImportFile(file)); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo leer el archivo') }
    if (fileRef.current) fileRef.current.value = ''
  }

  const confirm = async () => {
    setBusy(true)
    try { await onImport(preview.nuevos); close() } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={close} title="Importar ejercicios" maxWidth="max-w-lg"
      footer={
        <div className="flex gap-2">
          <button onClick={close} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted">Cancelar</button>
          <button onClick={confirm} disabled={!preview.nuevos.length || busy}
            className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">
            {preview.nuevos.length ? `Importar ${preview.nuevos.length} ejercicio${preview.nuevos.length === 1 ? '' : 's'}` : 'Importar'}
          </button>
        </div>
      }>
      <div className="space-y-4">
        <p className="text-sm text-muted">Pega una lista (un ejercicio por línea) o sube un CSV con las columnas <strong className="text-ink">nombre, grupo, material</strong>. Los que ya tienes se omiten.</p>
        <textarea aria-label="Lista de ejercicios" value={text} onChange={e => { setText(e.target.value); setError('') }} rows={7}
          placeholder={'Sentadilla goblet\nPeso muerto rumano\nRemo con mancuerna\n\nO con cabecera:\nnombre;grupo;material\nHip thrust;Glúteos;Barra'}
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 font-mono resize-y" />
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" aria-label="Subir archivo CSV" onChange={e => onFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-border rounded-xl text-xs font-semibold text-ink hover:border-ink">
            <Upload className="w-3.5 h-3.5" /> Subir CSV o TXT
          </button>
          <span className="text-[11px] text-muted">Máx. {MAX_IMPORT_ROWS} por vez</span>
        </div>
        {error && <p role="alert" className="text-xs text-warn font-medium">{error}</p>}

        {text.trim() && (
          <div role="status" className="bg-bg-alt/50 border border-border rounded-xl p-3 space-y-2 text-xs">
            <p><strong className="text-ink">{preview.nuevos.length}</strong> nuevos{preview.duplicados.length > 0 && <> · <span className="text-muted">{preview.duplicados.length} ya existen o están repetidos (se omiten)</span></>}</p>
            {preview.nuevos.length > 0 && (
              <ul className="space-y-0.5 text-muted">
                {preview.nuevos.slice(0, 6).map(r => <li key={r.name} className="truncate"><span className="text-ink font-medium">{r.name}</span>{(r.category || r.material) && ` · ${[r.category, r.material].filter(Boolean).join(' · ')}`}</li>)}
                {preview.nuevos.length > 6 && <li>y {preview.nuevos.length - 6} más…</li>}
              </ul>
            )}
            {preview.truncado && <p className="text-warn font-medium">Había más de {MAX_IMPORT_ROWS}: solo se importan las primeras.</p>}
            {preview.descartados.length > 0 && <p className="text-warn">{preview.descartados.length} descartados: {preview.descartados[0]}</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
