import { useState } from 'react'
import { Download, FileText, Trash2 } from 'lucide-react'
import { ClienteRow } from '../../../lib/supabase-types'
import { supabase } from '../../../lib/supabase'
import { fetchClientExport, downloadJson } from '../../../lib/clientData'
import { localDateKey } from '../../../lib/dates'
import { PRIVACY_INFO } from '../../../lib/privacyTexts'

interface Props {
  client: ClienteRow
  fotosConsent: boolean
  onConsentChange: (salud: boolean, fotos: boolean) => Promise<boolean>
}

// Derechos del cliente sobre sus datos (RGPD): acceder y descargarlos, decidir si se
// guardan sus fotos, y pedir que se borren todos. El borrado lo ejecuta su entrenador
// (es el responsable de los datos); aquí se retira el consentimiento y se le avisa.
export function MisDatosCard({ client, fotosConsent, onConsentChange }: Props) {
  const isDemo = client.id.startsWith('demo-client-')
  const [busy, setBusy] = useState<'export' | 'fotos' | 'borrar' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [info, setInfo] = useState(false)

  const exportar = async () => {
    setBusy('export'); setMsg(null)
    if (isDemo) {
      downloadJson(`mis-datos-demo.json`, { clientes: { name: client.name }, nota: 'Datos de demostración' })
      setMsg({ ok: true, text: 'Descargado (datos de demostración).' }); setBusy(null); return
    }
    const { data, error } = await fetchClientExport(client.id)
    if (error || !data) setMsg({ ok: false, text: `No se pudieron descargar tus datos: ${error}` })
    else { downloadJson(`mis-datos-panelfit-${localDateKey()}.json`, data); setMsg({ ok: true, text: 'Descargado. Incluye tus registros, tu plan, tu historial y enlaces a tus fotos y vídeos.' }) }
    setBusy(null)
  }

  const cambiarFotos = async () => {
    setBusy('fotos'); setMsg(null)
    const ok = await onConsentChange(true, !fotosConsent)
    setMsg(ok
      ? { ok: true, text: fotosConsent ? 'Ya no se guardarán fotos nuevas. Las que subiste siguen ahí: bórralas desde Progreso > Fotos si quieres.' : 'Listo, ya puedes subir fotos.' }
      : { ok: false, text: 'No se pudo guardar el cambio. Inténtalo de nuevo.' })
    setBusy(null)
  }

  const pedirBorrado = async () => {
    if (!window.confirm('Vas a pedir que se borren todos tus datos (plan, entrenos, fotos, historial y tu cuenta). Se retira tu consentimiento ahora y tu entrenador tiene que confirmar el borrado. No se puede deshacer. ¿Continuar?')) return
    setBusy('borrar'); setMsg(null)
    if (isDemo) { setMsg({ ok: true, text: 'En la demostración no se borra nada.' }); setBusy(null); return }
    const { error } = await supabase.from('notificaciones').insert({
      id: `nt_${Date.now()}`, trainer_id: client.trainerId, client_id: client.id, tipo: 'solicitud_borrado',
      titulo: `${client.name} pide que se borren sus datos`,
      mensaje: 'Ejerce su derecho de supresión (RGPD art. 17) y ha retirado su consentimiento. Bórralos desde su ficha > Configuración > Datos personales.',
      created_at: Date.now(), destinatario: 'trainer',
    })
    if (error) { setMsg({ ok: false, text: 'No se pudo enviar la solicitud. Inténtalo de nuevo o díselo a tu entrenador.' }); setBusy(null); return }
    await onConsentChange(false, false)
    setBusy(null)
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Tus datos</p>
          <p className="text-xs text-muted mt-0.5">Puedes descargarlos, decidir sobre tus fotos o pedir que se borren.</p>
        </div>
      </div>

      <button type="button" onClick={exportar} disabled={busy !== null}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-bg-alt transition-colors disabled:opacity-50">
        <Download className="w-4 h-4" /> {busy === 'export' ? 'Preparando…' : 'Descargar mis datos'}
      </button>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Guardar mis fotos de progreso</p>
          <p className="text-xs text-muted">{fotosConsent ? 'Activado' : 'Desactivado'}</p>
        </div>
        <button type="button" role="switch" aria-checked={fotosConsent} aria-label="Guardar mis fotos de progreso" onClick={cambiarFotos} disabled={busy !== null}
          className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${fotosConsent ? 'bg-ink' : 'bg-border'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${fotosConsent ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <button type="button" onClick={pedirBorrado} disabled={busy !== null}
        className="w-full flex items-center justify-center gap-2 py-2.5 border border-warn/30 text-warn rounded-xl text-sm font-medium hover:bg-warn/5 transition-colors disabled:opacity-50">
        <Trash2 className="w-4 h-4" /> Pedir que se borren mis datos
      </button>

      {msg && <p role="status" className={`text-xs font-medium ${msg.ok ? 'text-ok' : 'text-warn'}`}>{msg.text}</p>}

      <button type="button" onClick={() => setInfo(v => !v)} className="text-xs font-semibold text-muted underline underline-offset-2">
        Cómo se tratan tus datos {info ? '▲' : '▼'}
      </button>
      {info && (
        <dl className="space-y-2">
          {PRIVACY_INFO.map(i => (
            <div key={i.titulo}>
              <dt className="text-xs font-semibold">{i.titulo}</dt>
              <dd className="text-xs text-muted leading-relaxed">{i.texto}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
