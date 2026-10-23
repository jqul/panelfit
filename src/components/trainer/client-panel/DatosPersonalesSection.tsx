import { useEffect, useState } from 'react'
import { ClientData } from '../../../types'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../shared/Button'
import { toast } from '../../shared/Toast'
import { fetchClientExport, downloadJson, eraseClient } from '../../../lib/clientData'
import { evaluateConsent, ConsentRow } from '../../../lib/consent'
import { localDateKey } from '../../../lib/dates'

// Datos personales del cliente (RGPD): estado de su consentimiento, exportación
// completa (art. 15 y 20) y borrado completo (art. 17). El responsable del
// tratamiento es el entrenador, así que el borrado lo ejecuta él.
export function DatosPersonalesSection({ client }: { client: ClientData }) {
  const isDemo = client.id.startsWith('demo-client-')
  const fullName = `${client.name || ''} ${client.surname || ''}`.trim()
  const [consent, setConsent] = useState<ConsentRow | null | undefined>(undefined)
  const [busy, setBusy] = useState<'export' | 'erase' | null>(null)
  const [showErase, setShowErase] = useState(false)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (isDemo) return
    supabase.from('consentimientos').select('version, salud, fotos, accepted_at').eq('clientId', client.id)
      .order('accepted_at', { ascending: false }).limit(1)
      .then(({ data, error }) => { if (!error) setConsent((data?.[0] as ConsentRow | undefined) ?? null) })
  }, [client.id, isDemo])

  const exportar = async () => {
    setBusy('export')
    if (isDemo) { downloadJson('datos-demo.json', { clientes: { name: client.name } }); setBusy(null); return }
    const { data, error } = await fetchClientExport(client.id)
    if (error || !data) toast(`No se pudieron exportar los datos: ${error}`, 'warn')
    else {
      downloadJson(`datos-${fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${localDateKey()}.json`, data)
      toast('Datos exportados ✓', 'ok')
    }
    setBusy(null)
  }

  const borrar = async () => {
    if (isDemo) { toast('En la demostración no se borra nada', 'ok'); return }
    setBusy('erase')
    const res = await eraseClient(client.id)
    if (!res.ok) { toast(res.error, 'warn'); setBusy(null); return }
    toast(`Cliente borrado con todos sus datos (${res.archivos} ficheros) ✓`, 'ok')
    // La lista de clientes y el panel guardan copias en memoria: se recarga para no enseñar un cliente que ya no existe.
    setTimeout(() => window.location.reload(), 1500)
  }

  const status = consent === undefined ? null : evaluateConsent(consent)
  let consentText: string
  if (isDemo) consentText = 'Cliente de demostración'
  else if (consent === undefined) consentText = 'Consultando…'
  else if (consent === null) consentText = 'Sin consentimiento registrado (se le pedirá la próxima vez que entre)'
  else if (status?.status === 'withdrawn') consentText = 'Consentimiento RETIRADO: no se deben guardar más datos de salud'
  else consentText = `Salud ✓ · Fotos ${consent.fotos ? '✓' : '✗'} · versión ${consent.version}, ${new Date(consent.accepted_at).toLocaleDateString('es-ES')}`

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div>
        <h4 className="text-sm font-semibold">Datos personales (RGPD)</h4>
        <p className="text-xs text-muted mt-0.5">Tú eres el responsable de los datos de salud de {client.name}. Aquí puedes atender sus solicitudes de acceso y de borrado.</p>
      </div>
      <p className="text-xs"><span className="font-semibold">Consentimiento:</span> <span className={status?.status === 'withdrawn' ? 'text-warn font-semibold' : 'text-muted'}>{consentText}</span></p>
      <Button variant="outline" size="sm" onClick={exportar} disabled={busy !== null}>{busy === 'export' ? 'Preparando…' : 'Exportar todos sus datos (JSON)'}</Button>
      {!showErase
        ? <button onClick={() => setShowErase(true)} className="w-full py-2.5 border border-warn/30 text-warn rounded-xl text-sm font-semibold hover:bg-warn/5">🗑 Borrar todos sus datos…</button>
        : <div className="bg-warn/5 border border-warn/20 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-warn">Se borrará TODO de {client.name}: plan, entrenos, dolor, peso, fotos, vídeos, historial y su cuenta de acceso. No se puede deshacer.</p>
            <p className="text-xs text-muted">Si quieres conservar una copia, exporta sus datos antes. Para confirmar, escribe su nombre completo: <span className="font-semibold">{fullName}</span></p>
            <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Nombre completo" aria-label="Nombre completo para confirmar el borrado"
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm outline-none" />
            <div className="flex gap-2">
              <button onClick={() => { setShowErase(false); setTyped('') }} disabled={busy !== null} className="flex-1 py-2 border border-border rounded-lg text-sm text-muted">Cancelar</button>
              <button onClick={borrar} disabled={busy !== null || typed.trim().toLowerCase() !== fullName.toLowerCase()}
                className="flex-1 py-2 bg-warn text-white rounded-lg text-sm font-semibold disabled:opacity-40">{busy === 'erase' ? 'Borrando…' : 'Borrar definitivamente'}</button>
            </div>
          </div>}
    </div>
  )
}
