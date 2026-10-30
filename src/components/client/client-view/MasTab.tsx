import { useState, lazy, Suspense } from 'react'
import { MessageSquare, ShieldCheck } from 'lucide-react'
import { TrainingPlan } from '../../../types'
import { ClienteRow } from '../../../lib/supabase-types'
import { isDeviceCacheEnabled, setDeviceCacheEnabled, clearClientDeviceData, hasPendingLogs } from '../../../lib/deviceStorage'
import { forgetClientLink } from '../../../lib/clientLink'
import { ThemeToggle } from '../../shared/ThemeToggle'
import { PushToggle } from '../../shared/PushToggle'
import { CicloWidget } from '../CicloWidget'
import { ReferralWidget } from '../ReferralWidget'
import { MisDatosCard } from './MisDatosCard'
import { RecordatorioDiario } from './RecordatorioDiario'
import type { Consejo } from '../../../lib/consejos'
// Se descarga solo al mostrarse: espera a sus propios datos de todos modos.
const AusenciasEventos = lazy(() => import('../../shared/AusenciasEventos').then(m => ({ default: m.AusenciasEventos })))
const BonosCliente = lazy(() => import('../../shared/BonosCliente').then(m => ({ default: m.BonosCliente })))
const CalendarioSuscripcion = lazy(() => import('../CalendarioSuscripcion').then(m => ({ default: m.CalendarioSuscripcion })))

export function MasTab({ client, plan, onLogout, fotosConsent, onConsentChange, consejos = [], trainerName }: {
  client: ClienteRow; plan: TrainingPlan | null; onLogout: () => void
  /** Consejos que ha escrito el entrenador (ya limpios) y su nombre de pila. */
  consejos?: Consejo[]; trainerName?: string
  fotosConsent: boolean; onConsentChange: (salud: boolean, fotos: boolean) => Promise<boolean>
}) {
  const trainerPhone = localStorage.getItem(`pf_trainer_phone_${client.trainerId}`) || ''
  const waUrl = trainerPhone
    ? `https://wa.me/${trainerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, soy ${client.name}. Te escribo desde mi panel de PanelFit.`)}`
    : `https://wa.me/?text=${encodeURIComponent(`Hola, soy ${client.name}. Te escribo desde mi panel de PanelFit.`)}`

  return (
    <div className="px-4 py-6 space-y-4 max-w-xl mx-auto pb-24">
      <h3 className="font-serif font-bold text-xl">Más opciones</h3>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu entrenador</p>
        </div>
        <div className="p-4">
          <a href={waUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl"
            style={{ minHeight: '56px' }}>
            <MessageSquare className="w-5 h-5 text-[#25D366] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Contactar por WhatsApp</p>
              <p className="text-xs text-muted">Abre WhatsApp con mensaje preparado</p>
            </div>
          </a>
        </div>
      </div>

      {plan && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu programa</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Tipo</span><span className="font-semibold capitalize">{plan.type}</span></div>
            <div className="flex justify-between"><span className="text-muted">Semanas</span><span className="font-semibold">{plan.weeks?.length || 0}</span></div>
          </div>
        </div>
      )}

      {consejos.length > 0 && (
        <section aria-label="Consejos de tu entrenador" className="bg-card border border-border rounded-2xl overflow-hidden">
          <p className="px-5 py-3 border-b border-border text-xs font-bold uppercase tracking-wider text-muted">{trainerName ? `Consejos de ${trainerName}` : 'Consejos de tu entrenador'}</p>
          <div className="divide-y divide-border/60">
            {consejos.map(c => (
              <details key={c.id} className="group">
                <summary className="flex items-center justify-between gap-3 px-5 py-3.5 cursor-pointer list-none text-sm font-semibold" style={{ minHeight: '48px' }}>
                  {c.titulo}
                  <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">›</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-muted leading-relaxed whitespace-pre-line">{c.texto}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu cuenta</p>
        <p className="text-sm"><span className="text-muted">Nombre:</span> <span className="font-semibold">{client.name} {client.surname}</span></p>
      </div>

      {/* Tema */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Modo oscuro</p>
          <p className="text-xs text-muted">Cambia la apariencia de tu panel</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Notificaciones push */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Notificaciones</p>
          <p className="text-xs text-muted">Avisos de tu entrenador en este dispositivo</p>
        </div>
        <PushToggle clientId={client.id} />
      </div>
      <RecordatorioDiario client={client} />

      {/* Fechas clave y cuándo no puede entrenar: lo ve su entrenador */}
      <Suspense fallback={null}><BonosCliente clientId={client.id} quien="cliente" /></Suspense>
      <Suspense fallback={null}><AusenciasEventos clientId={client.id} quien="cliente" /></Suspense>

      {/* Sus entrenos, sesiones y fechas en Google / Apple / Outlook */}
      <Suspense fallback={null}><CalendarioSuscripcion clientId={client.id} /></Suspense>

      {/* Ciclo menstrual (opcional) */}
      <CicloWidget clientId={client.id} trainerId={client.trainerId} />

      {/* Programa de referidos */}
      <ReferralWidget trainerId={client.trainerId} token={client.token} />

      <MisDatosCard client={client} fotosConsent={fotosConsent} onConsentChange={onConsentChange} />
      <DevicePrivacyCard client={client} />

      {/* Cerrar sesión */}
      <button onClick={onLogout}
        className="w-full py-3 border border-border rounded-2xl text-sm font-medium text-muted hover:bg-bg-alt transition-colors">
        Cerrar sesión
      </button>
    </div>
  )
}

// Qué se guarda en este dispositivo y cómo quitarlo: para móviles compartidos o
// prestados, donde no se quiere dejar el plan ni los entrenos tras usarlo.
function DevicePrivacyCard({ client }: { client: ClienteRow }) {
  const isDemo = client.id.startsWith('demo-client-')
  const [enabled, setEnabled] = useState(isDeviceCacheEnabled())
  const [msg, setMsg] = useState('')

  const toggle = () => {
    const next = !enabled
    if (!next && hasPendingLogs(client.id) &&
      !window.confirm('Tienes entrenos que todavía no se han subido. Si dejas de guardar datos en este dispositivo se borrarán. ¿Continuar?')) return
    setDeviceCacheEnabled(next)
    if (!next) clearClientDeviceData(client.id, client.token)
    setEnabled(next)
    setMsg(next ? '' : 'Dejamos de guardar tu plan y tus entrenos en este dispositivo.')
  }

  const clearNow = () => {
    if (hasPendingLogs(client.id) &&
      !window.confirm('Tienes entrenos que todavía no se han subido. Si borras los datos de este dispositivo se perderán. ¿Borrar de todos modos?')) return
    clearClientDeviceData(client.id, client.token)
    forgetClientLink(client.token) // la app instalada ya no abrirá tu panel sola en este dispositivo
    setMsg('Datos borrados de este dispositivo.')
  }

  if (isDemo) return null

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Privacidad en este dispositivo</p>
          <p className="text-xs text-muted mt-0.5">
            Para que puedas entrenar sin conexión, guardamos una copia de tu plan y tus entrenos en este dispositivo.
            Caduca a los 30 días y se borra al cerrar sesión.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Guardar datos en este dispositivo</p>
          {!enabled && <p className="text-xs text-warn">Sin esta copia no podrás entrenar sin conexión.</p>}
        </div>
        <button type="button" role="switch" aria-checked={enabled} aria-label="Guardar datos en este dispositivo" onClick={toggle}
          className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${enabled ? 'bg-ink' : 'bg-border'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      <button type="button" onClick={clearNow}
        className="w-full py-2.5 border border-border rounded-xl text-sm font-medium text-muted hover:bg-bg-alt transition-colors">
        Borrar los datos de este dispositivo ahora
      </button>
      {msg && <p role="status" className="text-xs text-ok font-medium">{msg}</p>}
    </div>
  )
}
