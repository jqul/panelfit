import { useState } from 'react'
import { Pencil, Check, Plus, Trash2, MessageSquareText } from 'lucide-react'
import { ClientData, TrainingPlan } from '../../../types'
import { useMessageTemplates, resolveMessage, MESSAGE_TYPE_LABEL } from '../../../lib/messageTemplates'
import { toast } from '../../shared/Toast'

export function MessageTemplatesSection({ client, plan, onChange, trainerId }: {
  client: ClientData; plan: TrainingPlan; onChange: (p: TrainingPlan) => void; trainerId: string
}) {
  const { templates, loading, saveTemplate, addTemplate, deleteTemplate } = useMessageTemplates(trainerId)
  const [editingDefault, setEditingDefault] = useState<string | null>(null)
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [addingCustom, setAddingCustom] = useState(false)
  const [newName, setNewName] = useState('')
  const [newText, setNewText] = useState('')

  const overrides = plan.customMessages || {}

  const setOverride = (id: string, text: string) => {
    onChange({ ...plan, customMessages: { ...overrides, [id]: text } })
  }

  const sendWhatsApp = (text: string) => {
    const phone = (client.phone || '').replace(/\D/g, '')
    const resolved = resolveMessage(text, client.name)
    window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(resolved)}` : `https://wa.me/?text=${encodeURIComponent(resolved)}`, '_blank')
  }

  if (loading) return <div className="h-32 bg-card border border-border rounded-2xl animate-pulse" />

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div>
        <h4 className="text-sm font-semibold flex items-center gap-2"><MessageSquareText className="w-4 h-4" /> Mensajes preestablecidos</h4>
        <p className="text-xs text-muted mt-0.5">Plantilla por tipo de situación, con opción de personalizarla solo para {client.name}. El envío por WhatsApp es de un clic — el navegador no puede enviarlo sin que lo confirmes tú dentro de WhatsApp.</p>
      </div>

      <div className="space-y-3">
        {templates.map(t => {
          const override = overrides[t.id]
          const effectiveText = override ?? t.texto
          return (
            <div key={t.id} className="border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{MESSAGE_TYPE_LABEL[t.tipo]} · {t.nombre}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setEditingDefault(t.id); setDraft(t.texto) }} title="Editar plantilla general" className="p-1 text-muted hover:text-accent"><Pencil className="w-3 h-3" /></button>
                  {t.tipo === 'custom' && <button onClick={() => deleteTemplate(t.id)} className="p-1 text-muted hover:text-warn"><Trash2 className="w-3 h-3" /></button>}
                </div>
              </div>

              {editingDefault === t.id ? (
                <div className="space-y-1.5">
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2}
                    className="w-full px-2.5 py-2 bg-bg border border-border rounded-lg text-xs outline-none resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingDefault(null)} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
                    <button onClick={async () => { await saveTemplate(t.id, { texto: draft }); setEditingDefault(null); toast('Plantilla actualizada ✓', 'ok') }}
                      className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold">Guardar para todos</button>
                  </div>
                </div>
              ) : editingClient === t.id ? (
                <div className="space-y-1.5">
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2}
                    className="w-full px-2.5 py-2 bg-bg border border-accent/40 rounded-lg text-xs outline-none resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingClient(null)} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
                    <button onClick={() => { setOverride(t.id, draft); setEditingClient(null); toast(`Personalizado para ${client.name} ✓`, 'ok') }}
                      className="flex-1 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold">Guardar solo para {client.name}</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm italic">"{resolveMessage(effectiveText, client.name)}"</p>
                  <div className="flex items-center gap-2">
                    {override !== undefined
                      ? <span className="text-[10px] text-accent font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Personalizado para {client.name}</span>
                      : <button onClick={() => { setEditingClient(t.id); setDraft(t.texto) }} className="text-[10px] text-muted hover:text-accent underline">Personalizar para {client.name}</button>}
                    {override !== undefined && (
                      <button onClick={() => { const o = { ...overrides }; delete o[t.id]; onChange({ ...plan, customMessages: o }) }}
                        className="text-[10px] text-muted hover:text-warn underline">Quitar personalización</button>
                    )}
                    <button onClick={() => sendWhatsApp(effectiveText)}
                      className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-[#25D366] text-white rounded-lg text-[10px] font-bold">📱 Enviar</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {addingCustom ? (
        <div className="space-y-1.5 border border-dashed border-border rounded-xl p-3">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la plantilla"
            className="w-full px-2.5 py-1.5 bg-bg border border-border rounded-lg text-xs outline-none" />
          <textarea value={newText} onChange={e => setNewText(e.target.value)} rows={2} placeholder="Texto del mensaje... usa {{cliente}} para el nombre"
            className="w-full px-2.5 py-2 bg-bg border border-border rounded-lg text-xs outline-none resize-none" />
          <div className="flex gap-2">
            <button onClick={() => { setAddingCustom(false); setNewName(''); setNewText('') }} className="flex-1 py-1.5 border border-border rounded-lg text-xs text-muted">Cancelar</button>
            <button onClick={async () => { if (!newName.trim() || !newText.trim()) return; await addTemplate(newName.trim(), newText.trim()); setAddingCustom(false); setNewName(''); setNewText('') }}
              className="flex-1 py-1.5 bg-ink text-white rounded-lg text-xs font-semibold">Crear</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingCustom(true)}
          className="w-full border-2 border-dashed border-border rounded-xl py-2 text-xs text-muted hover:border-accent hover:text-accent flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Crear plantilla personalizada
        </button>
      )}
    </div>
  )
}
