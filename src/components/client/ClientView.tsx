import { useState, useEffect } from 'react'
import { Home, Dumbbell, BarChart2, Utensils, MoreHorizontal, MessageSquare, Phone } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TrainingPlan, TrainingLogs, WeightEntry } from '../../types'
import { ClientDashboard } from './ClientDashboard'
import { TrainingPlanView } from './TrainingPlanView'
import { ProgresoClienteTab } from './ProgresoClienteTab'
import { DietEditor } from '../shared/DietEditor'
import { PlanRow, RegistroRow, ClienteRow } from '../../lib/supabase-types'
import { logError } from '../../lib/errors'

interface ClientViewProps { token: string }
type Tab = 'hoy' | 'entreno' | 'progreso' | 'dieta' | 'mas'

export function ClientView({ token }: ClientViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [client, setClient] = useState<ClienteRow | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pinVerified, setPinVerified] = useState(false)
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [logs, setLogs] = useState<TrainingLogs>({})
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('hoy')

  useEffect(() => { loadData() }, [token])

  const loadData = async () => {
    setLoading(true)
    const { data: clientData, error: cErr } = await supabase
      .from('clientes').select('*').eq('token', token).maybeSingle()
    if (cErr) { logError('ClientView:loadClient', cErr) }
    if (!clientData) { setError('Enlace no válido o expirado.'); setLoading(false); return }
    setClient(clientData)

    const { data: planData, error: planErr } = await supabase
      .from('planes').select('plan').eq('clientId', clientData.id).maybeSingle()
    if (planErr) logError('ClientView:loadPlan', planErr)
    const planRow = planData as PlanRow | null
    if (planRow?.plan?.P) setPlan(planRow.plan.P as TrainingPlan)

    const { data: regData, error: regErr } = await supabase
      .from('registros').select('logs').eq('clientId', clientData.id).maybeSingle()
    if (regErr) logError('ClientView:loadRegistros', regErr)
    const regRow = regData as RegistroRow | null
    if (regRow?.logs) setLogs(regRow.logs as TrainingLogs)

    setLoading(false)
  }

  const handleLogsChange = async (newLogs: TrainingLogs) => {
    setLogs(newLogs)
    // Guardar en localStorage primero (offline-first)
    if (client?.id) {
      localStorage.setItem(`pf_logs_${client.id}`, JSON.stringify(newLogs))
    }
    // Luego sincronizar con Supabase
    if (navigator.onLine && client?.id) {
      const { error: updateErr } = await supabase.from('registros')
        .update({ logs: newLogs, updatedAt: Date.now() })
        .eq('clientId', client.id)
      if (updateErr) {
        const { error: insertErr } = await supabase.from('registros')
          .insert({ clientId: client.id, logs: newLogs, updatedAt: Date.now() })
        if (insertErr) logError('ClientView:saveLogs', insertErr)
      }
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
        <div className="flex gap-1 justify-center">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-serif font-bold mb-6">Panel<span className="text-accent italic">Fit</span></h1>
        <div className="bg-card border border-border rounded-2xl p-6">
          <p className="text-warn font-semibold mb-2">Enlace no válido</p>
          <p className="text-muted text-sm">{error}</p>
          <p className="text-muted text-sm mt-2">Pide a tu entrenador que te envíe el enlace correcto.</p>
        </div>
      </div>
    </div>
  )

  // Verificar PIN si el plan lo requiere
  const planPin = (plan as unknown as { pin?: string })?.pin
  if (!client) return null
  if (!loading && !error && planPin && !pinVerified) {
    const checkPin = () => {
      if (pinInput === planPin) { setPinVerified(true); setPinError(false) }
      else { setPinError(true); setPinInput('') }
    }
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-xs text-center space-y-6">
          <div>
            <h1 className="text-3xl font-serif font-bold">Panel<span className="text-accent italic">Fit</span></h1>
            <p className="text-muted text-sm mt-2">Introduce tu PIN para acceder</p>
          </div>
          <div className="space-y-3">
            <input type="number" value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError(false) }}
              onKeyDown={e => e.key === 'Enter' && checkPin()}
              placeholder="PIN de acceso"
              className={`w-full px-4 py-4 bg-card border rounded-2xl text-center text-2xl font-serif outline-none tracking-widest ${pinError ? 'border-warn' : 'border-border focus:border-accent'}`}
              style={{ fontSize: '24px' }}
              autoFocus
            />
            {pinError && <p className="text-sm text-warn">PIN incorrecto. Inténtalo de nuevo.</p>}
            <button onClick={checkPin}
              className="w-full py-4 bg-ink text-white rounded-2xl font-bold text-base hover:opacity-90"
              style={{ minHeight: '52px' }}>
              Entrar
            </button>
          </div>
          <p className="text-xs text-muted">Si no recuerdas tu PIN, contacta con tu entrenador.</p>
        </div>
      </div>
    )
  }

  const clientName = `${client?.name || ''} ${client?.surname || ''}`.trim()
  const brandName = plan?.brandName || 'PanelFit'
  const brandLogo = plan?.brandLogo

  const TABS = [
    { id: 'hoy' as Tab,      icon: Home,           label: 'Hoy' },
    { id: 'entreno' as Tab,  icon: Dumbbell,       label: 'Entreno' },
    { id: 'progreso' as Tab, icon: BarChart2,      label: 'Progreso' },
    { id: 'dieta' as Tab,    icon: Utensils,       label: 'Dieta' },
    { id: 'mas' as Tab,      icon: MoreHorizontal, label: 'Más' },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            {brandLogo && (
              <img src={brandLogo} className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0" alt="Logo entrenador" />
            )}
            <span className="font-serif font-bold text-base">{brandName}</span>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold">{clientName}</p>
            {plan?.type && <p className="text-[10px] text-muted capitalize">{plan.type}</p>}
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 pb-20 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {activeTab === 'hoy' && (
              plan
                ? <ClientDashboard plan={plan} logs={logs} onLogsChange={handleLogsChange}
                    weightHistory={weightHistory} clientName={clientName} clientId={client.id} />
                : <NoPlanView />
            )}
            {activeTab === 'entreno' && (
              plan
                ? <TrainingPlanView plan={plan} logs={logs} onLogsChange={handleLogsChange} />
                : <NoPlanView />
            )}
            {activeTab === 'progreso' && <ProgresoClienteTab clientId={client.id} logs={logs} />}
            {activeTab === 'dieta' && <DietEditor clientId={client.id} isTrainer={false} />}
            {activeTab === 'mas' && <MasTab client={client} plan={plan} />}
          </>
        )}
      </main>

      {/* Tab bar inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10 safe-area-pb">
        <div className="flex max-w-2xl mx-auto">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors`}
              style={{ minHeight: '56px' }}
              aria-label={label}
              aria-current={activeTab === id ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 transition-colors ${activeTab === id ? 'text-ink' : 'text-muted'}`} />
              <span className={`text-[10px] font-medium transition-colors ${activeTab === id ? 'text-ink font-bold' : 'text-muted'}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function NoPlanView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center text-muted">
      <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-20" />
      <p className="font-serif text-xl font-bold mb-2">Sin plan asignado</p>
      <p className="text-sm">Tu entrenador aún no ha creado tu programa. ¡Pronto lo tendrás!</p>
    </div>
  )
}

function MasTab({ client, plan }: { client: ClienteRow; plan: TrainingPlan | null }) {
  return (
    <div className="px-4 py-6 space-y-4 max-w-xl mx-auto">
      <h3 className="font-serif font-bold text-xl">Más opciones</h3>

      {/* Contactar entrenador */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu entrenador</p>
        </div>
        <div className="p-4 space-y-3">
          <a href={`https://wa.me/?text=${encodeURIComponent('Hola, soy ' + client.name + '. Te escribo desde mi panel de PanelFit.')}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl hover:bg-[#25D366]/20 transition-colors"
            style={{ minHeight: '56px' }}>
            <MessageSquare className="w-5 h-5 text-[#25D366] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Contactar con mi entrenador</p>
              <p className="text-xs text-muted">Abre WhatsApp con mensaje preparado</p>
            </div>
          </a>
        </div>
      </div>

      {/* Info del plan */}
      {plan && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu programa</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Tipo</span>
              <span className="font-semibold capitalize">{plan.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Semanas</span>
              <span className="font-semibold">{plan.weeks?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Descanso principal</span>
              <span className="font-semibold">{plan.restMain}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Info cliente */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Tu cuenta</p>
        <p className="text-sm"><span className="text-muted">Nombre:</span> <span className="font-semibold">{client.name} {client.surname}</span></p>
      </div>
    </div>
  )
}
