import { useState } from 'react'
import { Modal } from '../shared/Modal'
import { MOTIVOS_BAJA, type MotivoBaja } from '../../lib/motivosBaja'

// Al archivar a un cliente: por qué se va (opcional, lib/motivosBaja). En Negocio se ve el reparto.
export function ArchivarCliente({ nombre, onArchivar, onCerrar }: { nombre: string; onArchivar: (motivo: MotivoBaja | null) => void; onCerrar: () => void }) {
  const [motivo, setMotivo] = useState<MotivoBaja | null>(null)
  return (
    <Modal open onClose={onCerrar} ariaLabel={`Archivar a ${nombre}`} maxWidth="max-w-sm" plain>
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-serif font-bold text-lg">Archivar a {nombre}</h3>
          <p className="text-xs text-muted mt-1">Deja de contar en tu plan y no puede abrir su panel; conservas todo su historial. ¿Por qué se va? (opcional)</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Por qué se va">
          {MOTIVOS_BAJA.map(m => (
            <button key={m.id} type="button" role="radio" aria-checked={motivo === m.id} onClick={() => setMotivo(v => v === m.id ? null : m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${motivo === m.id ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:text-ink'}`}>{m.label}</button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm font-semibold text-muted">Cancelar</button>
          <button type="button" onClick={() => onArchivar(motivo)} className="px-4 py-2 bg-ink text-white rounded-xl text-sm font-bold">Archivar</button>
        </div>
      </div>
    </Modal>
  )
}
