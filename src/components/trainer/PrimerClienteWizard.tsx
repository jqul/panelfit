import { useEffect, useState } from 'react'
import { Check, Copy, ArrowRight } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { toast } from '../shared/Toast'
import { supabase } from '../../lib/supabase'
import { track } from '../../lib/analytics'
import { localDateKey } from '../../lib/dates'
import { CADUCIDADES, caducaEn } from '../../lib/enlaceCliente'
import { STARTER_TEMPLATES, starterToTemplate, buildPlanFromTemplate } from '../../lib/starterTemplates'
import type { OnboardingStepId } from '../../lib/onboardingProgress'
import type { ClientWithStats } from '../../hooks/useTrainerClients'
import type { TrainingTemplate } from '../../types'

type NewClient = { name: string; surname: string; phone: string; objetivo: string; altura: string; peso: string; genero: string; fechanacimiento: string }

interface Props {
  trainerId: string
  clients: ClientWithStats[]
  /** Por dónde se entra: desde cero, o con un cliente ya creado (la tarjeta de Hoy o "Nuevo cliente"). */
  start: { step: 'cliente' } | { step: Exclude<OnboardingStepId, 'cliente'>; clientId: string }
  addClient: (c: NewClient, labelIds?: string[]) => Promise<string | false>
  refresh: () => Promise<void>
  onSent: (clientId: string) => void
  onClose: () => void
}

interface OwnTemplate { id: string; name: string; tmpl: TrainingTemplate }
type Choice = { kind: 'own'; id: string } | { kind: 'starter'; key: string }

const ORDEN: OnboardingStepId[] = ['cliente', 'plan', 'acceso']
const TITULOS: Record<OnboardingStepId, string> = {
  cliente: '¿Cómo se llama tu cliente?', plan: 'Elige su primer workout', acceso: 'Mándale el acceso',
}

/**
 * Asistente de tres pasos: cliente → workout → acceso. Una sola acción principal por pantalla, y se puede
 * abandonar en cualquier momento (lo hecho se queda hecho). También sirve tras "Nuevo cliente".
 */
export function PrimerClienteWizard({ trainerId, clients, start, addClient, refresh, onSent, onClose }: Props) {
  const [step, setStep] = useState<OnboardingStepId>(start.step)
  const [clientId, setClientId] = useState<string | null>('clientId' in start ? start.clientId : null)
  const client = clients.find(c => c.id === clientId) ?? null
  const [busy, setBusy] = useState(false)

  // Paso 1
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [phone, setPhone] = useState('')

  // Paso 2
  const [own, setOwn] = useState<OwnTemplate[] | null>(null)
  const [showStarters, setShowStarters] = useState(false)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [alreadyHasPlan, setAlreadyHasPlan] = useState(false)

  // Paso 3
  const [expiry, setExpiry] = useState('nunca')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (step !== 'plan' || !clientId) return
    let cancelled = false
    ;(async () => {
      const [{ data: tpls }, { data: planRow }] = await Promise.all([
        supabase.from('plan_templates').select('id, name, plan').eq('trainer_id', trainerId).order('created_at', { ascending: false }).limit(6),
        supabase.from('planes').select('plan').eq('clientId', clientId).maybeSingle(),
      ])
      if (cancelled) return
      setOwn((tpls || []).map((r: any) => ({ id: r.id, name: r.name, tmpl: { ...r.plan, id: r.id, name: r.name } })))
      setAlreadyHasPlan(!!(planRow as any)?.plan?.P?.weeks?.length)
    })()
    return () => { cancelled = true }
  }, [step, clientId, trainerId])

  const stepIdx = ORDEN.indexOf(step)

  const crearCliente = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    const id = await addClient({ name, surname, phone, objetivo: 'general', altura: '', peso: '', genero: '', fechanacimiento: '' })
    setBusy(false)
    if (!id) return // addClient ya avisó del motivo (límite del plan, error del servidor)
    if (clients.length === 0) track('first_client_created')
    setClientId(id)
    setStep('plan')
  }

  const asignar = async () => {
    if (!clientId || !choice || busy) return
    setBusy(true)
    try {
      let tmpl: TrainingTemplate
      if (choice.kind === 'own') {
        tmpl = own!.find(o => o.id === choice.id)!.tmpl
      } else {
        // Se guarda en la librería del entrenador: a partir de ahora es suya, editable y reutilizable.
        tmpl = starterToTemplate(STARTER_TEMPLATES.find(s => s.key === choice.key)!, trainerId)
        const { error } = await supabase.from('plan_templates').insert({
          id: tmpl.id, trainer_id: trainerId, name: tmpl.name, description: tmpl.description, plan: tmpl,
          created_at: tmpl.createdAt, updated_at: tmpl.updatedAt, label_ids: [], is_public: false,
        })
        if (error) { toast('No se pudo guardar la plantilla', 'warn'); return }
      }
      // Nunca se pisa un plan que ya exista (p. ej. el de un programa asignado solo al crear el cliente).
      const { data: existing } = await supabase.from('planes').select('plan').eq('clientId', clientId).maybeSingle()
      if (!(existing as any)?.plan?.P?.weeks?.length) {
        const plan = buildPlanFromTemplate(tmpl, clientId, localDateKey())
        const { error } = await supabase.from('planes').upsert({ clientId, plan: { P: plan }, updatedAt: Date.now() }, { onConflict: 'clientId' })
        if (error) { toast('No se pudo asignar el workout', 'warn'); return }
      }
      await refresh()
      setStep('acceso')
    } finally { setBusy(false) }
  }

  const url = client ? `${window.location.origin}?c=${client.token}` : ''

  const cambiarCaducidad = async (id: string) => {
    if (!client) return
    const previa = expiry
    setExpiry(id)
    const { error } = await supabase.from('clientes').update({ token_expires_at: caducaEn(CADUCIDADES.find(c => c.id === id)?.dias ?? null) }).eq('id', client.id)
    if (error) { toast('No se pudo cambiar la caducidad', 'warn'); setExpiry(previa) }
  }

  const enviar = () => {
    if (!client) return
    window.open(`https://wa.me/?text=${encodeURIComponent(`Hola ${client.name} 👋\n\nTe comparto el enlace a tu panel:\n\n${url}\n\n💪`)}`, '_blank')
    onSent(client.id)
    setSent(true)
  }

  const primario = 'w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-ink text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed'
  const secundario = 'w-full py-2.5 text-sm font-semibold text-muted hover:text-ink'

  const tarjeta = (selected: boolean) =>
    `w-full text-left rounded-xl border px-4 py-3 transition-colors ${selected ? 'border-ink bg-bg-alt/60' : 'border-border hover:border-accent'}`

  return (
    <Modal open onClose={onClose} plain ariaLabel="Primer cliente" maxWidth="max-w-md">
      <div className="p-6 sm:p-7 space-y-5 overflow-y-auto">
        <div>
          <div className="flex gap-1.5 mb-3" aria-hidden>
            {ORDEN.map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full ${i <= stepIdx ? 'bg-accent' : 'bg-border'}`} />)}
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Paso {stepIdx + 1} de {ORDEN.length}</p>
          <h2 className="font-serif text-2xl font-bold mt-1" aria-live="polite">{TITULOS[step]}</h2>
        </div>

        {step === 'cliente' && (
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); crearCliente() }}>
            <div>
              <label htmlFor="onb-nombre" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Nombre</label>
              <input id="onb-nombre" autoFocus value={name} onChange={e => setName(e.target.value)} autoComplete="off"
                className="w-full px-4 py-3 bg-bg border border-border rounded-xl text-base outline-none focus:border-accent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="onb-apellido" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">Apellido <span className="normal-case font-normal">(opcional)</span></label>
                <input id="onb-apellido" value={surname} onChange={e => setSurname(e.target.value)} autoComplete="off"
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:border-accent" />
              </div>
              <div>
                <label htmlFor="onb-telefono" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">WhatsApp <span className="normal-case font-normal">(opcional)</span></label>
                <input id="onb-telefono" type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="off"
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:border-accent" />
              </div>
            </div>
            <button type="submit" disabled={!name.trim() || busy} className={primario}>{busy ? 'Creando…' : 'Crear y continuar'} <ArrowRight className="w-4 h-4" /></button>
            <button type="button" onClick={onClose} className={secundario}>Ahora no</button>
          </form>
        )}

        {step === 'plan' && (
          <div className="space-y-4">
            {!client || own === null ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-bg border border-border rounded-xl animate-pulse" />)}</div>
            ) : alreadyHasPlan ? (
              <>
                <p className="text-sm text-muted">{client.name} ya tiene un plan asignado: no se toca. Pasamos al acceso.</p>
                <button onClick={() => setStep('acceso')} className={primario}>Continuar <ArrowRight className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">Para <strong className="text-ink">{client.name}</strong>. Después lo puedes ajustar ejercicio a ejercicio.</p>
                <div role="radiogroup" aria-label="Workout" className="space-y-2">
                  {own.map(o => (
                    <button key={o.id} type="button" role="radio" aria-checked={choice?.kind === 'own' && choice.id === o.id} onClick={() => setChoice({ kind: 'own', id: o.id })}
                      className={tarjeta(choice?.kind === 'own' && choice.id === o.id)}>
                      <span className="block text-sm font-semibold">{o.name}</span>
                      <span className="block text-xs text-muted">Tuyo · {o.tmpl.weeks?.[0]?.days?.length ?? 0} días</span>
                    </button>
                  ))}
                  {(own.length === 0 || showStarters) && STARTER_TEMPLATES.map(s => (
                    <button key={s.key} type="button" role="radio" aria-checked={choice?.kind === 'starter' && choice.key === s.key} onClick={() => setChoice({ kind: 'starter', key: s.key })}
                      className={tarjeta(choice?.kind === 'starter' && choice.key === s.key)}>
                      <span className="block text-sm font-semibold">{s.name}</span>
                      <span className="block text-xs text-muted">Plantilla de arranque · {s.resumen}</span>
                    </button>
                  ))}
                </div>
                {own.length > 0 && !showStarters && (
                  <button type="button" onClick={() => setShowStarters(true)} className="text-xs font-semibold text-accent hover:underline">Ver plantillas de arranque</button>
                )}
                <button onClick={asignar} disabled={!choice || busy} className={primario}>{busy ? 'Asignando…' : 'Asignar y continuar'} <ArrowRight className="w-4 h-4" /></button>
                <button onClick={() => setStep('acceso')} className={secundario}>Lo hago después</button>
              </>
            )}
          </div>
        )}

        {step === 'acceso' && (
          <div className="space-y-4">
            {!client ? (
              <div className="h-24 bg-bg border border-border rounded-xl animate-pulse" />
            ) : (
              <>
                <p className="text-sm text-muted">{client.name} abre este enlace en su móvil y ya ve su plan. No instala nada.</p>
                <div className="flex gap-2">
                  <input readOnly aria-label="Enlace del cliente" value={url} className="flex-1 min-w-0 px-3 py-2.5 bg-bg border border-border rounded-xl text-xs text-muted font-mono outline-none" />
                  <button onClick={() => { navigator.clipboard?.writeText(url); toast('Enlace copiado ✓', 'ok') }} aria-label="Copiar enlace"
                    className="px-3 border border-border rounded-xl text-muted hover:bg-bg-alt"><Copy className="w-4 h-4" /></button>
                </div>
                <div>
                  <label htmlFor="onb-caducidad" className="block text-xs font-semibold text-muted mb-1.5">Caducidad del enlace</label>
                  <select id="onb-caducidad" value={expiry} onChange={e => cambiarCaducidad(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none">
                    {CADUCIDADES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                {sent && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-ok"><Check className="w-4 h-4" /> Enviado. En cuanto lo abra, lo verás en Hoy.</p>}
                {sent ? (
                  <button onClick={onClose} className={primario}>Terminar</button>
                ) : (
                  <>
                    <button onClick={enviar} className={`${primario} !bg-[#25D366]`}>Enviar por WhatsApp</button>
                    <button onClick={onClose} className={secundario}>Terminar sin enviar</button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
