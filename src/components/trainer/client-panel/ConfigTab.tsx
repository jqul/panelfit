import { useState } from 'react'
import { ClientData, TrainingPlan } from '../../../types'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../shared/Button'
import { toast } from '../../shared/Toast'

const AUTOMATIONS = [
  { key: 'autoWelcome', label: 'Mensaje de bienvenida', desc: 'WhatsApp al asignar un plan nuevo', emoji: '👋' },
  { key: 'autoCheckin', label: 'Check-in semanal', desc: 'Recordatorio de encuesta al cerrar semana', emoji: '📋' },
  { key: 'autoInactividad', label: 'Alerta de inactividad', desc: '+3 días sin entrenar → WhatsApp', emoji: '⚠️' },
] as const

export function ConfigTab({ client, plan, onChange }: { client: ClientData; plan: TrainingPlan | null; onChange: (p: TrainingPlan) => void }) {
  const [revoking, setRevoking] = useState(false)
  const [newToken, setNewToken] = useState(client.token)
  const [showRevoke, setShowRevoke] = useState(false)

  const revokeToken = async () => {
    setRevoking(true)
    const token = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('clientes').update({ token }).eq('id', client.id)
    if (error) toast('Error al regenerar enlace', 'warn')
    else { setNewToken(token); toast('Enlace regenerado ✓', 'ok'); setShowRevoke(false) }
    setRevoking(false)
  }

  const currentUrl = `${window.location.origin}?c=${newToken}`
  if (!plan) return null

  return (
    <div className="max-w-lg space-y-5">
      <h3 className="font-serif font-bold text-lg">Configuración</h3>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div><h4 className="text-sm font-semibold">Automatizaciones</h4><p className="text-xs text-muted mt-0.5">Acciones automáticas para este cliente</p></div>
        {AUTOMATIONS.map(a => (
          <div key={a.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${plan[a.key] ? 'bg-ok/5 border-ok/30' : 'bg-bg border-border'}`}
            onClick={() => onChange({ ...plan, [a.key]: !plan[a.key] })}>
            <span className="text-lg">{a.emoji}</span>
            <div className="flex-1"><p className="text-sm font-semibold">{a.label}</p><p className="text-xs text-muted">{a.desc}</p></div>
            <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-all ${plan[a.key] ? 'bg-ok' : 'bg-border'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${plan[a.key] ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold">Mensaje al cliente</h4>
        <textarea rows={3} value={plan.message || ''} onChange={e => onChange({ ...plan, message: e.target.value })}
          placeholder="Mensaje motivacional..." className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold">Acceso del cliente</h4>
        <div className="flex gap-2">
          <input readOnly value={currentUrl} className="flex-1 px-3 py-2 bg-bg border border-border rounded-lg text-xs text-muted outline-none font-mono" />
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(currentUrl); toast('Copiado ✓', 'ok') }}>Copiar</Button>
        </div>
        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${client.name} 👋\n\n${currentUrl}\n\n💪`)}`, '_blank')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:opacity-90">📱 Enviar por WhatsApp</button>
        {!showRevoke
          ? <button onClick={() => setShowRevoke(true)} className="w-full py-2.5 border border-warn/30 text-warn rounded-xl text-sm font-semibold hover:bg-warn/5">🔒 Regenerar enlace</button>
          : <div className="bg-warn/5 border border-warn/20 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-warn">⚠️ El enlace actual dejará de funcionar</p>
              <div className="flex gap-2">
                <button onClick={() => setShowRevoke(false)} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted">Cancelar</button>
                <button onClick={revokeToken} disabled={revoking} className="flex-1 py-2 bg-warn text-white rounded-lg text-sm font-semibold disabled:opacity-50">{revoking ? 'Regenerando...' : 'Sí, revocar'}</button>
              </div>
            </div>
        }
      </div>
    </div>
  )
}
