import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { ClientData, UserProfile } from '../../types'
import { toast } from '../shared/Toast'
import { Send, MessageCircle, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  userProfile: UserProfile
  clients: ClientData[]
}

interface SurveySchedule {
  id: string
  template_id: string
  client_id: string | null
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'once'
  day_of_week: number
  active: boolean
  last_sent_at: number | null
}

interface SurveyTemplate {
  id: string
  name: string
  questions: any[]
}

const DAY_LABELS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const FREQ_LABELS = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', once: 'Una vez' }

function formatPhone(phone: string) {
  return phone.replace(/\s+/g, '').replace(/^\+/, '')
}

function buildWAUrl(phone: string, text: string) {
  return `https://wa.me/${formatPhone(phone)}?text=${encodeURIComponent(text)}`
}

// Determina si una programación toca esta semana
function schedulesDueThisWeek(sched: SurveySchedule): boolean {
  if (!sched.active) return false
  const today = new Date()
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay() // 1=lun...7=dom

  if (sched.frequency === 'weekly') return sched.day_of_week === dayOfWeek
  if (sched.frequency === 'biweekly') {
    if (sched.day_of_week !== dayOfWeek) return false
    // Comprobar si toca esta semana (cada 2 semanas desde la creación)
    if (!sched.last_sent_at) return true
    const daysSince = Math.floor((Date.now() - sched.last_sent_at) / 86400000)
    return daysSince >= 14
  }
  if (sched.frequency === 'once') return !sched.last_sent_at
  return false
}

export function MensajesTab({ userProfile, clients }: Props) {
  const [schedules, setSchedules] = useState<SurveySchedule[]>([])
  const [templates, setTemplates] = useState<SurveyTemplate[]>([])
  const [trainerProfile, setTrainerProfile] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [showInactivos, setShowInactivos] = useState(false)
  const [showAlerts, setShowAlerts] = useState(true)

  const origin = window.location.origin

  useEffect(() => {
    loadData()
    // Cargar perfil del entrenador para teléfono y mensajes
    try {
      const p = JSON.parse(localStorage.getItem(`pf_trainer_profile_${userProfile.uid}`) || '{}')
      setTrainerProfile(p)
    } catch {}
  }, [userProfile.uid])

  const loadData = async () => {
    setLoading(true)
    const [schedRes, tmplRes] = await Promise.all([
      supabase.from('survey_schedules').select('*').eq('trainer_id', userProfile.uid),
      supabase.from('survey_templates').select('*').eq('trainer_id', userProfile.uid),
    ])
    if (schedRes.data) setSchedules(schedRes.data)
    if (tmplRes.data) setTemplates(tmplRes.data)
    setLoading(false)
  }

  // Clientes sin teléfono registrado
  const clientsSinTelefono = useMemo(() =>
    clients.filter(c => !(c as any).phone),
  [clients])

  // Clientes inactivos (más de 5 días sin entreno)
  const clientesInactivos = useMemo(() =>
    clients.filter(c => {
      const lastActive = (c as any).lastActive
      if (!lastActive) return true
      const days = Math.floor((Date.now() - new Date(lastActive + 'T00:00:00').getTime()) / 86400000)
      return days > 4
    }),
  [clients])

  // Encuestas que tocan esta semana
  const encuestasPendientes = useMemo(() => {
    return schedules
      .filter(schedulesDueThisWeek)
      .map(sched => {
        const tmpl = templates.find(t => t.id === sched.template_id)
        const targetClients = sched.client_id
          ? clients.filter(c => c.id === sched.client_id)
          : clients
        return { sched, tmpl, targetClients }
      })
      .filter(x => x.tmpl)
  }, [schedules, templates, clients])

  const sendEncuesta = async (
    sched: SurveySchedule,
    client: ClientData,
    tmplName: string
  ) => {
    const phone = (client as any).phone
    if (!phone) {
      toast(`${client.name} no tiene teléfono guardado`, 'warn')
      return
    }
    setSending(`${sched.id}_${client.id}`)
    const url = `${origin}?c=${client.token}&encuesta=1`
    const msg = `Hola ${client.name} 👋\n\n📋 *${tmplName}*\n\nTe mando el check-in semanal. Solo te llevará 2 minutos:\n\n${url}\n\n¡Gracias! 🙏`
    window.open(buildWAUrl(phone, msg), '_blank')

    // Marcar como enviado
    await supabase.from('survey_schedules')
      .update({ last_sent_at: Date.now() })
      .eq('id', sched.id)

    setSchedules(prev => prev.map(s => s.id === sched.id ? { ...s, last_sent_at: Date.now() } : s))
    setSending(null)
    toast(`Enviado a ${client.name} ✓`, 'ok')
  }

  const sendAlerta = (client: ClientData, tipo: 'inactividad' | 'panel') => {
    const phone = (client as any).phone
    if (!phone) { toast(`${client.name} no tiene teléfono`, 'warn'); return }

    const url = `${origin}?c=${client.token}`
    const msgs = {
      inactividad: `Hola ${client.name} 👋\n\n¿Todo bien? Llevas unos días sin entrenar 💪\n\nRecuerda que tienes tu plan listo:\n\n${url}\n\n¡Cualquier cosa me dices! 🙌`,
      panel: `Hola ${client.name} 👋\n\nTe comparto el enlace a tu panel de entrenamiento:\n\n${url}\n\n💪`,
    }
    window.open(buildWAUrl(phone, msgs[tipo]), '_blank')
    toast(`WhatsApp abierto con ${client.name}`, 'ok')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="animate-fade-in space-y-5 max-w-2xl">
      <div>
        <h2 className="text-3xl font-serif font-bold">Mensajes</h2>
        <p className="text-muted text-sm mt-1">Gestiona el contacto con tus clientes esta semana</p>
      </div>

      {/* ── AVISO: clientes sin teléfono ── */}
      {clientsSinTelefono.length > 0 && (
        <div className="bg-warn/5 border border-warn/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warn">
                {clientsSinTelefono.length} cliente{clientsSinTelefono.length > 1 ? 's' : ''} sin teléfono WhatsApp
              </p>
              <p className="text-xs text-muted mt-0.5">
                Añade el teléfono en la pestaña <span className="font-semibold">Config</span> de cada cliente para poder enviarles mensajes directamente.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {clientsSinTelefono.map(c => (
                  <span key={c.id} className="text-[10px] bg-warn/10 text-warn px-2 py-0.5 rounded-full font-semibold">
                    {c.name} {c.surname}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ENCUESTAS ESTA SEMANA ── */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm">Encuestas de esta semana</h3>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            encuestasPendientes.length > 0 ? 'bg-accent/10 text-accent' : 'bg-bg-alt text-muted'
          }`}>
            {encuestasPendientes.length} pendiente{encuestasPendientes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {encuestasPendientes.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-ok opacity-60" />
            <p className="text-sm font-semibold">Todo al día</p>
            <p className="text-xs mt-1">No hay encuestas programadas para esta semana</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {encuestasPendientes.map(({ sched, tmpl, targetClients }) => (
              <div key={sched.id} className="px-5 py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold">{tmpl!.name}</p>
                    <p className="text-xs text-muted">
                      {FREQ_LABELS[sched.frequency]} · {sched.client_id ? '1 cliente' : `${targetClients.length} clientes`}
                      {sched.last_sent_at && (
                        <span> · Último envío: {new Date(sched.last_sent_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Un botón por cliente */}
                <div className="space-y-2">
                  {targetClients.map(client => {
                    const hasPhone = !!(client as any).phone
                    const key = `${sched.id}_${client.id}`
                    return (
                      <div key={client.id} className="flex items-center gap-3 bg-bg rounded-xl px-3 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                          {client.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{client.name} {client.surname}</p>
                          <p className="text-xs text-muted">
                            {hasPhone ? (client as any).phone : '⚠️ Sin teléfono'}
                          </p>
                        </div>
                        <button
                          onClick={() => sendEncuesta(sched, client, tmpl!.name)}
                          disabled={!hasPhone || sending === key}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                            hasPhone
                              ? 'bg-[#25D366] text-white hover:opacity-90'
                              : 'bg-bg-alt text-muted cursor-not-allowed'
                          }`}>
                          <MessageCircle className="w-3.5 h-3.5" />
                          {sending === key ? 'Enviando...' : 'Enviar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ALERTAS DE INACTIVIDAD ── */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <button
          className="w-full px-5 py-4 border-b border-border flex items-center justify-between"
          onClick={() => setShowAlerts(!showAlerts)}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warn" />
            <h3 className="font-semibold text-sm">Clientes inactivos</h3>
          </div>
          <div className="flex items-center gap-2">
            {clientesInactivos.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-warn/10 text-warn">
                {clientesInactivos.length}
              </span>
            )}
            {showAlerts ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </div>
        </button>

        {showAlerts && (
          clientesInactivos.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-ok opacity-60" />
              <p className="text-sm font-semibold">Todos activos</p>
              <p className="text-xs mt-1">Ningún cliente lleva más de 4 días sin entrenar</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {clientesInactivos.map(client => {
                const hasPhone = !!(client as any).phone
                const lastActive = (client as any).lastActive
                const days = lastActive
                  ? Math.floor((Date.now() - new Date(lastActive + 'T00:00:00').getTime()) / 86400000)
                  : null

                return (
                  <div key={client.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-9 h-9 rounded-full bg-warn/10 flex items-center justify-center text-sm font-bold text-warn flex-shrink-0">
                      {client.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{client.name} {client.surname}</p>
                      <p className="text-xs text-warn">
                        {days === null ? 'Nunca ha entrenado' : `${days} días sin entrenar`}
                      </p>
                    </div>
                    <button
                      onClick={() => sendAlerta(client, 'inactividad')}
                      disabled={!hasPhone}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                        hasPhone
                          ? 'bg-[#25D366] text-white hover:opacity-90'
                          : 'bg-bg-alt text-muted cursor-not-allowed'
                      }`}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      {hasPhone ? 'WhatsApp' : 'Sin tel.'}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* ── TODOS LOS CLIENTES — envío rápido ── */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <button
          className="w-full px-5 py-4 border-b border-border flex items-center justify-between"
          onClick={() => setShowInactivos(!showInactivos)}>
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm">Envío rápido — todos los clientes</h3>
          </div>
          {showInactivos ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </button>

        {showInactivos && (
          <div className="divide-y divide-border">
            {clients.map(client => {
              const hasPhone = !!(client as any).phone
              return (
                <div key={client.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                    {client.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name} {client.surname}</p>
                    <p className="text-xs text-muted">{hasPhone ? (client as any).phone : '⚠️ Sin teléfono'}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => sendAlerta(client, 'panel')}
                      disabled={!hasPhone}
                      title="Enviar enlace del panel"
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        hasPhone ? 'bg-[#25D366] text-white hover:opacity-90' : 'bg-bg-alt text-muted cursor-not-allowed'
                      }`}>
                      <MessageCircle className="w-3 h-3" /> Panel
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
