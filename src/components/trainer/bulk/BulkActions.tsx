import { useState } from 'react'
import { Dumbbell, MessageCircle, Tag, ClipboardList, Archive, X, UserCheck } from 'lucide-react'
import type { ClientWithStats } from '../../../hooks/useTrainerClients'
import type { MessageType } from '../../../lib/messageTemplates'
import { AssignSheet } from './AssignSheet'
import { MessageSheet } from './MessageSheet'
import { LabelsSheet } from './LabelsSheet'
import { SurveySheet } from './SurveySheet'
import { ProfesionalSheet } from './ProfesionalSheet'
import { useProfesionalesEquipo } from '../../../hooks/useProfesionalesEquipo'

type Sheet = 'assign' | 'message' | 'labels' | 'survey' | 'profesional'

interface Props {
  trainerId: string
  /** Los seleccionados, ya filtrados a lo que se ve en la lista. */
  clients: ClientWithStats[]
  onClear: () => void
  /** Se escribió algo: recargar la lista. */
  onChanged: () => void
  /** En la demo hay una franja fija abajo ("Estás viendo la demo"): la barra se sube para no quedar tapada. */
  aboveDemoBanner?: boolean
  /** Archivar no abre hoja: es reversible (el aviso trae "Deshacer") y no sobrescribe nada. */
  onArchive?: (ids: string[]) => void
}

const ACTIONS: { id: Sheet; label: string; Icon: typeof Dumbbell }[] = [
  { id: 'assign', label: 'Plan', Icon: Dumbbell },
  { id: 'message', label: 'Mensaje', Icon: MessageCircle },
  { id: 'labels', label: 'Etiquetas', Icon: Tag },
  { id: 'survey', label: 'Encuesta', Icon: ClipboardList },
]

/**
 * Barra de acciones que aparece abajo cuando hay clientes seleccionados, y las hojas de cada acción.
 * Cada hoja dice a cuántos clientes afecta, pide confirmar lo que sobrescribe y termina con un resumen
 * de lo hecho, lo que falló y lo omitido.
 */
export function BulkActions({ trainerId, clients, onClear, onChanged, aboveDemoBanner, onArchive }: Props) {
  const [sheet, setSheet] = useState<Sheet | null>(null)
  // Tras asignar un plan se puede avisar solo a quienes lo recibieron, con la plantilla de "nueva rutina".
  const [notify, setNotify] = useState<{ ids: string[] } | null>(null)
  const n = clients.length
  const close = () => { setSheet(null); setNotify(null) }
  const notifyTargets = notify ? clients.filter(c => notify.ids.includes(c.id)) : clients
  // Con equipo (más de un profesional), también se pueden repartir los clientes
  const profesionales = useProfesionalesEquipo(trainerId)
  const acciones = profesionales.length > 1 ? [...ACTIONS, { id: 'profesional' as Sheet, label: 'Profesional', Icon: UserCheck }] : ACTIONS

  return (
    <>
      <div role="region" aria-label={`Acciones para ${n} cliente${n === 1 ? '' : 's'} seleccionado${n === 1 ? '' : 's'}`}
        className={`fixed inset-x-0 lg:left-52 z-40 bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] ${aboveDemoBanner ? 'bottom-[7rem] sm:bottom-[3.75rem]' : 'bottom-0'}`}
        style={{ paddingBottom: aboveDemoBanner ? 0 : 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-1 px-2 sm:px-4 py-2">
          <p className="px-2 text-sm font-semibold whitespace-nowrap" aria-live="polite">{n} <span className="hidden sm:inline">seleccionado{n === 1 ? '' : 's'}</span><span className="sm:hidden">sel.</span></p>
          <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
            {acciones.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setSheet(id)} disabled={n === 0}
                className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 min-h-[44px] min-w-[44px] px-2 sm:px-4 rounded-xl text-[11px] sm:text-sm font-semibold hover:bg-bg-alt disabled:opacity-40">
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
            {onArchive && (
              <button onClick={() => onArchive(clients.map(c => c.id))} disabled={n === 0}
                className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 min-h-[44px] min-w-[44px] px-2 sm:px-4 rounded-xl text-[11px] sm:text-sm font-semibold hover:bg-bg-alt disabled:opacity-40">
                <Archive className="w-4 h-4" />Archivar
              </button>
            )}
          </div>
          <button onClick={onClear} aria-label="Cancelar la selección" title="Cancelar la selección"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-muted hover:bg-bg-alt"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {sheet === 'assign' && !notify && <AssignSheet trainerId={trainerId} clients={clients} onClose={close} onChanged={onChanged}
        onNotify={ids => { setNotify({ ids }); setSheet('message') }} />}
      {sheet === 'message' && <MessageSheet trainerId={trainerId} clients={notifyTargets} onClose={close} preset={notify ? ('nueva_rutina' as MessageType) : undefined} />}
      {sheet === 'labels' && <LabelsSheet trainerId={trainerId} clients={clients} onClose={close} onChanged={onChanged} />}
      {sheet === 'survey' && <SurveySheet trainerId={trainerId} clients={clients} onClose={close} />}
      {sheet === 'profesional' && <ProfesionalSheet trainerId={trainerId} clients={clients} onClose={close} onChanged={onChanged} profesionales={profesionales} />}
    </>
  )
}
