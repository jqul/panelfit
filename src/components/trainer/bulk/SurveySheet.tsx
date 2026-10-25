import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../shared/Modal'
import { buildSurveyMessages } from '../../../lib/bulkActions'
import { AffectedClients, SendList, loadSurveys } from './parts'
import type { SheetProps } from './types'

/** Envía una encuesta o check-in a varios clientes: un enlace de WhatsApp por cliente con su acceso a la encuesta. */
export function SurveySheet({ trainerId, clients, onClose }: Omit<SheetProps, 'onChanged'>) {
  const [surveys, setSurveys] = useState<{ id: string; name: string }[] | null | undefined>(undefined)
  const [pickedId, setPickedId] = useState('')
  const [sending, setSending] = useState(false)
  const names = clients.map(c => `${c.name} ${c.surname || ''}`.trim())
  const picked = surveys?.find(s => s.id === pickedId)

  useEffect(() => { loadSurveys(trainerId).then(setSurveys) }, [trainerId])

  const messages = useMemo(
    () => (picked ? buildSurveyMessages(clients, picked.name, window.location.origin) : []),
    [clients, picked],
  )

  const footer = sending ? (
    <button onClick={onClose} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold">Listo</button>
  ) : (
    <button onClick={() => setSending(true)} disabled={!picked} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
      {picked ? `Preparar «${picked.name}» para ${clients.length} cliente${clients.length === 1 ? '' : 's'}` : 'Elige una encuesta'}
    </button>
  )

  return (
    <Modal open onClose={onClose} title="Enviar encuesta" variant="drawer" bare footer={footer}>
      {sending ? (
        <>
          <p className="px-5 sm:px-6 pt-4 text-xs text-muted">Cada enlace abre WhatsApp con el mensaje y el acceso a «{picked?.name}» ya puestos. Ve marcando los que envías.</p>
          <SendList items={messages} />
        </>
      ) : (
        <>
          <AffectedClients names={names} />
          <div className="px-5 sm:px-6 py-4">
            {surveys === undefined ? (
              <p className="text-sm text-muted text-center py-6">Cargando…</p>
            ) : surveys === null ? (
              <p className="text-sm text-warn text-center py-6">No se pudieron cargar las encuestas. Cierra e inténtalo de nuevo.</p>
            ) : surveys.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">Aún no tienes encuestas. Crea una en Más › Encuestas.</p>
            ) : (
              <div role="radiogroup" aria-label="Encuestas" className="space-y-1.5">
                {surveys.map(s => (
                  <label key={s.id} className={`flex items-center gap-3 px-3 min-h-[44px] rounded-xl border cursor-pointer transition-all ${pickedId === s.id ? 'bg-accent/10 border-accent' : 'border-border hover:bg-bg-alt'}`}>
                    <input type="radio" name="bulk-encuesta" checked={pickedId === s.id} onChange={() => setPickedId(s.id)} className="accent-accent" />
                    <span className="text-sm flex-1 min-w-0 truncate">{s.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
