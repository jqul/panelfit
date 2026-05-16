import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { Check, X, Users, LogOut, RefreshCw, Shield, Mail, Clock, Zap } from 'lucide-react'

interface Entrenador {
  uid: string
  displayName: string
  email: string
  approved: boolean
  rol: string
  createdAt?: string
  profile?: { planName?: 'free' | 'starter' | 'trial' | 'pro' | 'studio'; clientLimit?: number; trialEndsAt?: number }
  clientsCount?: number
}

interface Props { onLogout: () => void }

const PLANES = [
  { plan: 'free'    as const, limit: 3,    days: 0,  label: 'Free',    title: 'Máximo 3 clientes',              active: 'bg-gray-200 text-gray-700 border-gray-300',         inactive: 'border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300' },
  { plan: 'starter' as const, limit: 15,   days: 0,  label: 'Starter', title: 'Máximo 15 clientes',             active: 'bg-accent text-white border-accent',                  inactive: 'border-accent/30 text-accent hover:bg-accent hover:text-white' },
  { plan: 'trial'   as const, limit: 9999, days: 15, label: 'Demo',    title: 'Ilimitado 15 días',              active: 'bg-warn text-white border-warn',                      inactive: 'border-warn/30 text-warn hover:bg-warn hover:text-white' },
  { plan: 'pro'     as const, limit: 9999, days: 0,  label: 'Pro',     title: 'Clientes ilimitados',            active: 'bg-ok text-white border-ok',                          inactive: 'border-ok/30 text-ok hover:bg-ok hover:text-white' },
  { plan: 'studio'  as const, limit: 9999, days: 0,  label: 'Studio',  title: 'Ilimitado + todas las features', active: 'bg-purple-500 text-white border-purple-500',          inactive: 'border-purple-200 text-purple-500 hover:bg-purple-500 hover:text-white' },
]

export function SuperAdminPanel({ onLogout }: Props) {
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendientes' | 'activos' | 'todos'>('pendientes')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  // Plan seleccionado por entrenador pendiente antes de aprobar
  const [selectedPlan, setSelectedPlan] = useState<Record<string, 'free' | 'starter' | 'trial' | 'pro' | 'studio'>>({})

  useEffect(() => { loadEntrenadores() }, [])

  const loadEntrenadores = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('entrenadores')
      .select('*')
      .order('createdAt', { ascending: false })

    if (error) {
      toast('Error al cargar entrenadores', 'warn')
    } else {
      const raw = (data || []) as Entrenador[]
      const ids = raw.map(e => e.uid)
      const { data: clientesData } = ids.length
        ? await supabase.from('clientes').select('trainerId').in('trainerId', ids)
        : { data: [] as Array<{ trainerId: string }> }
      const counts: Record<string, number> = {}
      ;(clientesData || []).forEach((c: any) => { counts[c.trainerId] = (counts[c.trainerId] || 0) + 1 })
      setEntrenadores(raw.map(e => ({ ...e, clientsCount: counts[e.uid] || 0 })))
    }
    setLoading(false)
  }

  /** Aprueba el entrenador y guarda el plan en el mismo update */
  const aprobarConPlan = async (e: Entrenador) => {
    const planKey = selectedPlan[e.uid] || 'free'
    const planData = PLANES.find(p => p.plan === planKey)!
    setUpdatingId(e.uid)
    const now = Date.now()
    const trialEndsAt = planKey === 'trial' ? now + (planData.days * 86400000) : undefined
    const profile = { ...(e.profile || {}), planName: planKey, clientLimit: planData.limit, trialEndsAt, updatedAt: now }
    const { error } = await supabase
      .from('entrenadores')
      .update({ approved: true, profile })
      .eq('uid', e.uid)
    if (error) {
      toast('Error al aprobar', 'warn')
    } else {
      setEntrenadores(prev => prev.map(x => x.uid === e.uid ? { ...x, approved: true, profile } : x))
      toast(`✓ ${e.displayName} activado con plan ${planData.label}`, 'ok')
    }
    setUpdatingId(null)
  }

  const setActivo = async (id: string, activo: boolean) => {
    setUpdatingId(id)
    const { error } = await supabase.from('entrenadores').update({ approved: activo }).eq('uid', id)
    if (error) { toast('Error al actualizar', 'warn'); setUpdatingId(null); return }
    setEntrenadores(prev => prev.map(e => e.uid === id ? { ...e, approved: activo } : e))
    toast(activo ? 'Entrenador activado ✓' : 'Entrenador desactivado', 'ok')
    setUpdatingId(null)
  }

  const deleteEntrenador = async (id: string) => {
    if (!confirm('¿Eliminar este entrenador?')) return
    const { error } = await supabase.from('entrenadores').delete().eq('uid', id)
    if (error) { toast('Error al eliminar', 'warn'); return }
    setEntrenadores(prev => prev.filter(e => e.uid !== id))
    toast('Entrenador eliminado', 'ok')
  }

  const savePlan = async (
    e: Entrenador,
    planName: 'free' | 'starter' | 'trial' | 'pro' | 'studio',
    clientLimit: number,
    trialDays: number
  ) => {
    setUpdatingId(e.uid)
    const now = Date.now()
    const trialEndsAt = planName === 'trial' ? now + (trialDays * 86400000) : undefined
    const profile = { ...(e.profile || {}), planName, clientLimit, trialEndsAt, updatedAt: now }
    const { error } = await supabase.from('entrenadores').update({ profile }).eq('uid', e.uid)
    if (error) {
      toast('No se pudo guardar plan', 'warn')
    } else {
      setEntrenadores(prev => prev.map(x => x.uid === e.uid ? { ...x, profile } : x))
      toast('Plan actualizado ✓', 'ok')
    }
    setUpdatingId(null)
  }

  const pendientes = entrenadores.filter(e => !e.approved)
  const activos    = entrenadores.filter(e => e.approved)
  const filtered   = tab === 'pendientes' ? pendientes : tab === 'activos' ? activos : entrenadores

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-serif font-bold">Panel<span className="text-accent italic">Fit</span> Admin</h1>
              <p className="text-[10px] text-muted">Superadministrador</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadEntrenadores} className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:bg-bg-alt transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',      value: entrenadores.length, icon: Users, color: 'text-ink' },
            { label: 'Activos',    value: activos.length,      icon: Check, color: 'text-ok' },
            { label: 'Pendientes', value: pendientes.length,   icon: Clock, color: 'text-warn' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl bg-bg-alt flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-2xl font-serif font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-bg p-1 rounded-xl border border-border w-fit">
          {([
            { id: 'pendientes', label: `Pendientes (${pendientes.length})` },
            { id: 'activos',    label: `Activos (${activos.length})` },
            { id: 'todos',      label: 'Todos' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-card shadow-sm text-ink' : 'text-muted hover:text-ink'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted border-2 border-dashed border-border rounded-2xl">
            <p className="font-serif text-lg">{tab === 'pendientes' ? 'No hay solicitudes pendientes' : 'Sin entrenadores'}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {filtered.map(e => {
              const currentPlan = e.profile?.planName || 'free'
              const isPending = !e.approved
              const pendingPlanKey = selectedPlan[e.uid] || 'starter' // default starter para nuevos

              return (
                <div key={e.uid} className={`px-5 py-4 space-y-3 ${isPending ? 'bg-warn/5' : ''}`}>
                  {/* Fila superior: avatar + info + acciones */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-sm font-bold flex-shrink-0 ${isPending ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'}`}>
                      {e.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{e.displayName || 'Sin nombre'}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPending ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'}`}>
                          {isPending ? '⏳ En modo demo' : '✓ Activo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted flex items-center gap-1"><Mail className="w-3 h-3" />{e.email}</p>
                        <p className="text-xs text-muted">👥 {e.clientsCount || 0} clientes</p>
                        {e.createdAt && (
                          <p className="text-xs text-muted flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(e.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isPending ? null : (
                        <button onClick={() => setActivo(e.uid, false)}
                          disabled={updatingId === e.uid}
                          className="flex items-center gap-1.5 px-3 py-2 bg-warn/10 text-warn border border-warn/20 rounded-lg text-xs font-bold hover:bg-warn hover:text-white transition-all disabled:opacity-50">
                          <X className="w-3.5 h-3.5" /> Desactivar
                        </button>
                      )}
                      <button onClick={() => deleteEntrenador(e.uid)}
                        disabled={updatingId === e.uid}
                        className="p-2 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors disabled:opacity-50">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Para pendientes: selector de plan + botón aprobar juntos */}
                  {isPending ? (
                    <div className="bg-warn/10 border border-warn/20 rounded-xl px-4 py-3 space-y-3">
                      <p className="text-xs font-semibold text-warn">Selecciona el plan antes de aprobar:</p>
                      <div className="flex flex-wrap gap-2">
                        {PLANES.map(({ plan, label, title }) => (
                          <button
                            key={plan}
                            onClick={() => setSelectedPlan(prev => ({ ...prev, [e.uid]: plan }))}
                            title={title}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                              pendingPlanKey === plan
                                ? 'bg-ink text-white border-ink'
                                : 'border-border text-muted hover:border-ink hover:text-ink'
                            }`}>
                            {pendingPlanKey === plan ? '✓ ' : ''}{label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => aprobarConPlan(e)}
                        disabled={updatingId === e.uid}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-ok text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                        {updatingId === e.uid
                          ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Activando...</>
                          : <><Zap className="w-4 h-4" /> Aprobar y activar con plan {PLANES.find(p => p.plan === pendingPlanKey)?.label}</>
                        }
                      </button>
                    </div>
                  ) : (
                    /* Para activos: selector de plan normal */
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted uppercase tracking-wider font-semibold mr-1">Plan:</span>
                      {PLANES.map(({ plan, limit, days, label, title, active, inactive }) => {
                        const isActive = currentPlan === plan
                        return (
                          <button
                            key={plan}
                            onClick={() => savePlan(e, plan, limit, days)}
                            disabled={updatingId === e.uid || isActive}
                            title={title}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all disabled:cursor-default ${isActive ? active : inactive}`}>
                            {isActive ? '✓ ' : ''}{label}
                          </button>
                        )
                      })}
                      {updatingId === e.uid && (
                        <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
