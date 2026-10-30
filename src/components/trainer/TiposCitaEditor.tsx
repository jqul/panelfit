import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { COLORES_CITA, MAX_TIPOS, nuevoTipo, type TipoCita } from '../../lib/tiposCita'

// Editar los tipos de cita: nombre, color y duración. Se guardan todos juntos (en el perfil del entrenador).
export function TiposCitaEditor({ tipos, onGuardar, onClose }: { tipos: TipoCita[]; onGuardar: (t: TipoCita[]) => Promise<boolean>; onClose: () => void }) {
  const [lista, setLista] = useState<TipoCita[]>(tipos)
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState<string>(COLORES_CITA[lista.length % COLORES_CITA.length])
  const [duracion, setDuracion] = useState(60)
  const [guardando, setGuardando] = useState(false)

  const anadir = () => {
    if (!nombre.trim()) return
    setLista(l => [...l, nuevoTipo(nombre, color, duracion)])
    setNombre(''); setColor(COLORES_CITA[(lista.length + 1) % COLORES_CITA.length])
  }
  const guardar = async () => { setGuardando(true); const ok = await onGuardar(lista); setGuardando(false); if (ok) onClose() }

  return (
    <Modal open onClose={onClose} title="Tipos de cita" maxWidth="max-w-md"
      footer={<button onClick={guardar} disabled={guardando} className="w-full py-3 bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">{guardando ? 'Guardando…' : 'Guardar tipos'}</button>}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-muted">Al crear una cita eliges su tipo: pone el título y la duración, y el color la distingue en el calendario.</p>
        {lista.length > 0 && (
          <ul className="space-y-1.5">
            {lista.map(t => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2 border border-border rounded-xl">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} aria-hidden />
                <span className="flex-1 text-sm font-medium">{t.nombre}</span>
                <span className="text-xs text-muted">{t.duracion} min</span>
                <button onClick={() => setLista(l => l.filter(x => x.id !== t.id))} aria-label={`Quitar el tipo ${t.nombre}`} className="p-1 text-muted hover:text-warn"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
        {lista.length < MAX_TIPOS && (
          <div className="space-y-2 p-3 bg-bg-alt/40 rounded-xl">
            <div className="flex gap-2">
              <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={40} placeholder="Nuevo tipo (p. ej. Valoración)" aria-label="Nombre del tipo"
                className="flex-1 min-w-0 px-3 py-2 bg-card border border-border rounded-xl text-sm outline-none" />
              <select value={duracion} onChange={e => setDuracion(+e.target.value)} aria-label="Duración del tipo" className="px-2 py-2 bg-card border border-border rounded-xl text-sm">
                {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2" role="radiogroup" aria-label="Color del tipo">
              {COLORES_CITA.map((c, i) => (
                <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Color ${i + 1}`} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 ${color === c ? 'border-ink' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
              <button type="button" onClick={anadir} disabled={!nombre.trim()} className="ml-auto px-3 py-2 border border-border rounded-xl text-sm font-semibold disabled:opacity-40">Añadir</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
