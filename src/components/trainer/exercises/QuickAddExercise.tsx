import { useState } from 'react'
import { Modal } from '../../shared/Modal'
import { MATERIALES, inferMaterial } from '../../../lib/exerciseLibrary'

interface Props {
  open: boolean
  categories: string[]
  onClose: () => void
  /** Devuelve cuando el ejercicio ya está creado. `completar` abre su ficha completa después. */
  onCreate: (f: { name: string; material: string; category: string }, completar: boolean) => Promise<void> | void
}

const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${on ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-accent'}`

/** Alta en 30 segundos: nombre, material y grupo. Vídeo, indicaciones y alternativas se completan después. */
export function QuickAddExercise({ open, categories, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [material, setMaterial] = useState('')
  const [category, setCategory] = useState('')
  const [created, setCreated] = useState(0)
  const [busy, setBusy] = useState(false)

  const deducido = !material && name.trim() ? inferMaterial(name) : ''
  const reset = () => { setName(''); setMaterial(''); setCategory('') }

  const submit = async (modo: 'cerrar' | 'otro' | 'completar') => {
    if (!name.trim() || busy) return
    setBusy(true)
    await onCreate({ name: name.trim(), material: material || deducido, category }, modo === 'completar')
    setBusy(false)
    if (modo === 'otro') { reset(); setCreated(n => n + 1) } else { reset(); setCreated(0); onClose() }
  }

  return (
    <Modal open={open} onClose={() => { reset(); setCreated(0); onClose() }} title="Nuevo ejercicio" maxWidth="max-w-md"
      footer={
        <div className="flex gap-2">
          <button onClick={() => submit('otro')} disabled={!name.trim() || busy}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-ink hover:border-ink disabled:opacity-40">Crear y añadir otro</button>
          <button onClick={() => submit('cerrar')} disabled={!name.trim() || busy}
            className="flex-1 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">Crear</button>
        </div>
      }>
      <form onSubmit={e => { e.preventDefault(); submit('cerrar') }} className="space-y-4">
        <div>
          <label htmlFor="nuevo-ejercicio-nombre" className="block text-xs font-semibold text-muted mb-1">Nombre</label>
          <input id="nuevo-ejercicio-nombre" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Press militar sentado con pausa"
            className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted mb-1.5">Material {deducido && <span className="font-normal">· parece {deducido}</span>}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Material">
            {MATERIALES.map(m => <button key={m} type="button" onClick={() => setMaterial(material === m ? '' : m)} aria-pressed={(material || deducido) === m} className={chip((material || deducido) === m)}>{m}</button>)}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted mb-1.5">Grupo muscular</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Grupo muscular">
            {categories.map(c => <button key={c} type="button" onClick={() => setCategory(category === c ? '' : c)} aria-pressed={category === c} className={chip(category === c)}>{c}</button>)}
          </div>
        </div>
        {created > 0 && <p role="status" className="text-xs text-ok font-medium">{created === 1 ? '1 ejercicio creado' : `${created} ejercicios creados`}. Sigue con el siguiente.</p>}
        <button type="button" onClick={() => submit('completar')} disabled={!name.trim() || busy}
          className="text-xs font-semibold text-accent hover:underline disabled:opacity-40 disabled:no-underline">Crear y completar la ficha (vídeo, indicaciones…) →</button>
      </form>
    </Modal>
  )
}
