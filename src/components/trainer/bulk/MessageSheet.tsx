import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../shared/Modal'
import { useMessageTemplates, type MessageType } from '../../../lib/messageTemplates'
import { buildMessages } from '../../../lib/bulkActions'
import { AffectedClients, SendList } from './parts'
import type { SheetProps } from './types'

/** Mensaje (con plantilla o escrito) a varios clientes: un enlace de WhatsApp personalizado por cada uno. */
export function MessageSheet({ trainerId, clients, onClose, preset }: Omit<SheetProps, 'onChanged'> & { preset?: MessageType }) {
  const { templates, loading } = useMessageTemplates(trainerId)
  const [text, setText] = useState('')
  const [includeLink, setIncludeLink] = useState(preset === 'nueva_rutina')
  const [sending, setSending] = useState(false)
  const names = clients.map(c => `${c.name} ${c.surname || ''}`.trim())

  // Con un tipo de plantilla pedido (p. ej. "nueva rutina" tras asignar un plan) se rellena solo, una vez.
  useEffect(() => {
    if (!preset || text || loading) return
    const t = templates.find(x => x.tipo === preset)
    if (t) setText(t.texto)
  }, [preset, templates, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const messages = useMemo(
    () => buildMessages(clients, text, { origin: window.location.origin, includeLink }),
    [clients, text, includeLink],
  )

  const footer = sending ? (
    <button onClick={onClose} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold">Listo</button>
  ) : (
    <button onClick={() => setSending(true)} disabled={!text.trim()} className="w-full min-h-[44px] bg-ink text-white rounded-xl text-sm font-bold disabled:opacity-40">
      {text.trim() ? `Preparar mensaje para ${clients.length} cliente${clients.length === 1 ? '' : 's'}` : 'Escribe o elige un mensaje'}
    </button>
  )

  return (
    <Modal open onClose={onClose} title="Enviar mensaje" variant="drawer" bare footer={footer}>
      {sending ? (
        <>
          <p className="px-5 sm:px-6 pt-4 text-xs text-muted">Cada mensaje se abre en WhatsApp ya escrito para ese cliente; tú pulsas «enviar» en WhatsApp. Ve marcando los que envías.</p>
          <SendList items={messages} />
        </>
      ) : (
        <>
          <AffectedClients names={names} />
          <div className="px-5 sm:px-6 pt-4 space-y-4 pb-4">
            <div>
              <p className="text-xs font-semibold mb-1.5">Plantilla</p>
              {loading ? <p className="text-sm text-muted">Cargando…</p> : (
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => setText(t.texto)} aria-pressed={text === t.texto}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-all ${text === t.texto ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:border-ink'}`}>{t.nombre}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="bulk-msg" className="text-xs font-semibold block mb-1.5">Mensaje</label>
              <textarea id="bulk-msg" value={text} onChange={e => setText(e.target.value)} rows={5} placeholder="Escribe el mensaje. {{cliente}} se cambia por el nombre de cada uno."
                className="w-full px-3 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
              <p className="text-[11px] text-muted mt-1">{'{{cliente}}'} se sustituye por el nombre de cada cliente.</p>
            </div>
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={includeLink} onChange={e => setIncludeLink(e.target.checked)} className="accent-accent w-4 h-4" />
              <span className="text-sm">Incluir el enlace a su panel</span>
            </label>
            {text.trim() && messages[0] && (
              <div>
                <p className="text-xs font-semibold mb-1.5">Así lo verá {messages[0].name}</p>
                <p className="whitespace-pre-wrap text-sm bg-bg-alt rounded-xl px-3 py-2.5">{messages[0].text}</p>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}
