import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { Check, X, Users, LogOut, RefreshCw, Shield, Mail, Clock } from 'lucide-react'

interface Entrenador {
  uid: string
  displayName: string
  email: string
  approved: boolean
  rol: string
  createdAt?: string
  profile?: { planName?: 'free' | 'trial' | 'pro' | 'studio'; clientLimit?: number; trialEndsAt?: number }
  clientsCount?: number
}

interface Props { onLogout: () => void }

export function SuperAdminPanel({ onLogout }: Props) {
  const [entrenadores, setEntrenadores] = useState<Entrenador[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pendientes' | 'activos' | 'todos'>('pendientes')
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null)

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
      const entrenadoresRaw = (data || []) as Entrenador[]
      const ids = entrenadoresRaw.map(e => e.uid)
      const { data: clientesData } = ids.length
        ? await supabase.from('clientes').select('trainerId').in('trainerId', ids)
        : { data: [] as Array<{ trainerId: string }> }
      const counts: Record<string, number> = {}
      ;(clientesData || []).forEach((c: any) => { counts[c.trainerId] = (counts[c.trainerId] || 0) + 1 })
      setEntrenadores(entrenadoresRaw.map(e => ({ ...e, clientsCount: counts[e.uid] || 0 })))
    }
    setLoading(false)
  }

  const setActivo = async (id: string, activo: boolean) => {
    const { error } = await supabase.from('entrenadores').update({ approved: activo }).eq('uid', id)
    if (error) { toast('Error al actualizar', 'warn'); return }
    setEntrenadores(prev => prev.map(e => e.uid === id ? { ...e, approved: activo } : e))
    toast(activo ? 'Entrenador activado ✓' : 'Entrenador desactivado', 'ok')
  }

  const deleteEntrenador = async (id: string) => {
    if (!confirm('¿Eliminar este entrenador? Esta acción no se puede deshacer.')) return
    const { error } = await supabase.from('entrenadores').delete().eq('uid', id)
    if (error) { toast('Error al eliminar', 'warn'); return }
    setEntrenadores(prev => prev.filter(e => e.uid !== id))
    toast('Entrenador eliminado', 'ok')
  }

  const savePlan = async (
    e: Entrenador,
    planName: 'free' | 'trial' | 'pro' | 'studio',
    clientLimit: number,
    trialDays: number
  ) => {
    setUpdatingPlan(e.uid)
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
    setUpdatingPlan(null)
  }

  const pendientes = entrenadores.filter(e => !e.approved)
  const activos = entrenadores.filter(e => e.approved)
  const filtered = tab === 'pendientes' ? pendientes : tab === 'activos' ? activos : entrenadores

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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
            <button onClick={loadEntrenadores}
              className="p-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted hover:bg-bg-alt transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: entrenadores.length, icon: Users, color: 'text-ink' },
            { label: 'Activos', value: activos.length, icon: Check, color: 'text-ok' },
            { label: 'Pendientes', value: pendientes.length, icon: Clock, color: 'text-warn' },
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-card shadow-sm text-ink' : 'text-muted hover:text-ink'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted border-2 border-dashed border-border rounded-2xl">
            <p className="font-serif text-lg">
              {tab === 'pendientes' ? 'No hay solicitudes pendientes' : 'Sin entrenadores'}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {filtered.map(e => (
              <div key={e.uid} className="flex items-center gap-4 px-5 py-4">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-serif text-sm font-bold flex-shrink-0 ${
                  e.approved ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'
                }`}>
                  {e.displayName?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{e.displayName || 'Sin nombre'}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      e.approved ? 'bg-ok/10 text-ok' : 'bg-warn/10 text-warn'
                    }`}>
                      {e.approved ? 'Activo' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Mail className="w-3 h-3" />{e.email}
                    </p>
                    <p className="text-xs text-muted">👥 {e.clientsCount || 0} clientes</p>
                    <p className="text-xs text-muted">
                      Plan: <span className="font-bold">{(e.profile?.planName || 'free').toUpperCase()}</span>
                      {' · '}Límite {e.profile?.clientLimit ?? 5}
                    </p>
                    {e.createdAt && (
                      <p className="text-xs text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(e.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {/* Botones plan */}
                  {/* Selector de plan */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => savePlan(e, 'free', 5, 0)}
                      disabled={updatingPlan === e.uid}
                      title="Plan gratuito — máximo 5 clientes"
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-40 ${
                        e.profile?.planName === 'free'
                          ? 'bg-border text-ink border-border'
                          : 'border-border text-muted hover:text-ink'
                      }`}>
                      Free·5
                    </button>
                    <button
                      onClick={() => savePlan(e, 'trial', 9999, 15)}
                      disabled={updatingPlan === e.uid}
                      title="Demo 15 días — acceso ilimitado temporal"
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-40 ${
                        e.profile?.planName === 'trial'
                          ? 'bg-accent text-white border-accent'
                          : 'border-accent/30 text-accent hover:bg-accent hover:text-white'
                      }`}>
                      Demo·15d
                    </button>
                    <button
                      onClick={() => savePlan(e, 'pro', 9999, 0)}
                      disabled={updatingPlan === e.uid}
                      title="Pro — sin límite de clientes"
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all disabled:opacity-40 ${
                        e.profile?.planName === 'pro'
                          ? 'bg-ok text-white border-ok'
                          : 'border-ok/30 text-ok hover:bg-ok hover:text-white'
                      }`}>
                      Pro·∞
                    </button>
                  </div>

                  {/* Aprobar / Desactivar */}
                  {!e.approved ? (
                    <button onClick={() => setActivo(e.uid, true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-ok text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                      <Check className="w-3.5 h-3.5" /> Aprobar
                    </button>
                  ) : (
                    <button onClick={() => setActivo(e.uid, false)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-warn/10 text-warn border border-warn/20 rounded-lg text-xs font-bold hover:bg-warn hover:text-white transition-all">
                      <X className="w-3.5 h-3.5" /> Desactivar
                    </button>
                  )}

                  {/* Eliminar */}
                  <button onClick={() => deleteEntrenador(e.uid)}
                    className="p-2 rounded-lg text-muted hover:text-warn hover:bg-warn/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
