import { useState } from 'react'
import { ArchiveRestore, Trash2 } from 'lucide-react'
import { ClientData } from '../../types'

const fmtDate = (ms?: number) => ms ? new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

// Clientes archivados: no cuentan en el plan ni pueden abrir su panel, pero conservan todo.
// Es el único sitio desde el que se borra del todo (borrado RGPD), de uno en uno y confirmando.
export function ArchivedClientList({ clients, onRestore, onDelete }: {
  clients: ClientData[]
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null)

  return (
    <div className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div className="hidden md:flex items-center gap-4 px-5 py-2.5 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted">
        <span className="flex-1">Cliente</span>
        <span className="w-40">Archivado</span>
        <span className="w-[180px]" />
      </div>
      <ul className="divide-y divide-border/50">
        {clients.map(client => {
          const confirming = confirmId === client.id
          const fullName = `${client.name} ${client.surname || ''}`.trim()
          return (
            <li key={client.id} className="flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3.5">
              <span className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-10 h-10 rounded-full bg-bg-alt flex items-center justify-center font-serif text-base text-muted flex-shrink-0">{client.name[0]?.toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block font-serif font-bold text-base truncate text-muted">{fullName}</span>
                  <span className="block md:hidden text-xs text-muted mt-0.5">Archivado el {fmtDate(client.archivedAt)}</span>
                </span>
              </span>
              <span className="hidden md:block w-40 text-sm text-muted">{fmtDate(client.archivedAt)}</span>
              <div className="flex items-center justify-end gap-1.5 md:w-[180px] ml-auto">
                {confirming ? (
                  <>
                    <button onClick={() => { onDelete(client.id); setConfirmId(null) }} title="Borra todos sus datos y su cuenta. No se puede deshacer."
                      className="px-3 min-h-[44px] rounded-lg bg-warn text-white text-xs font-bold whitespace-nowrap">Borrar todo</button>
                    <button onClick={() => setConfirmId(null)} className="px-3 min-h-[44px] rounded-lg border border-border text-xs font-semibold text-muted">No</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => onRestore(client.id)}
                      className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg border border-border text-xs font-semibold text-ink hover:border-ink transition-colors">
                      <ArchiveRestore className="w-4 h-4" /> Reactivar
                    </button>
                    <button onClick={() => setConfirmId(client.id)} aria-label={`Eliminar definitivamente a ${fullName}`} title="Eliminar definitivamente (no se puede deshacer)"
                      className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border border-border text-muted hover:text-warn hover:border-warn transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
