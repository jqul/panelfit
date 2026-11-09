import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from '../shared/Toast'
import { logError } from '../../lib/errors'
import { ClientData } from '../../types'
import {
  Plus, X, Trash2, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Users, Repeat, Ban, CalendarClock, UserX
} from 'lucide-react'
import { DEMO_TRAINER_ID, DEMO_CITAS } from '../../lib/demo-data'
import { Modal } from '../shared/Modal'
import { localDateKey } from '../../lib/dates'
import { limpiarTipos, type TipoCita } from '../../lib/tiposCita'
import { limpiarEnlace } from '../../lib/sesionOnline'
import { CampoEnlaceOnline, EtiquetaOnline } from '../shared/EnlaceOnline'
import { citasDeProfesional, semanasDelMes } from '../../lib/agendaMes'
import { useProfesionalesEquipo } from '../../hooks/useProfesionalesEquipo'
import { cumpleanosEnRango } from '../../lib/cumpleanos'
import { useScheduledMessages } from '../../lib/scheduledMessages'
import { CumplesDia } from './CumplesDia'
import { EVENTOS, ORDEN_EVENTOS, finEvento, type EventoAgenda } from '../../lib/eventosAgenda'
// Solo se abre de vez en cuando: se descarga al abrirlo.
const HorarioCitasEditor = lazy(() => import('./HorarioCitasEditor').then(m => ({ default: m.HorarioCitasEditor })))
const CifrasAgenda = lazy(() => import('./CifrasAgenda').then(m => ({ default: m.CifrasAgenda })))
const ClasesGrupo = lazy(() => import('./ClasesGrupo').then(m => ({ default: m.ClasesGrupo })))
const TiposCitaEditor = lazy(() => import('./TiposCitaEditor').then(m => ({ default: m.TiposCitaEditor })))

// Tipos de cita del entrenador (en su perfil). En la demo, en memoria.
let tiposDemo: TipoCita[] = [{ id: 't_personal', nombre: 'Entreno personal', color: '#2f6f4f', duracion: 60 }, { id: 't_valoracion', nombre: 'Valoración', color: '#3b5b92', duracion: 45 }]
function useTiposCita(trainerId: string) {
  const demo = trainerId === DEMO_TRAINER_ID
  const [tipos, setTipos] = useState<TipoCita[]>([])
  useEffect(() => {
    if (demo) { setTipos(tiposDemo); return }
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
      .then(({ data }) => setTipos(limpiarTipos((data?.profile as { tiposCita?: unknown } | null)?.tiposCita)))
  }, [trainerId, demo])
  const guardar = async (nuevos: TipoCita[]) => {
    const limpios = limpiarTipos(nuevos)
    if (demo) { tiposDemo = limpios; setTipos(limpios); return true }
    const { data } = await supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
    const { error } = await supabase.from('entrenadores').update({ profile: { ...(data?.profile || {}), tiposCita: limpios } }).eq('uid', trainerId)
    if (error) { toast('No se pudieron guardar los tipos', 'warn'); return false }
    setTipos(limpios); toast('Tipos de cita guardados ✓', 'ok'); return true
  }
  return { tipos, guardar }
}

interface Props {
  trainerId: string
  clients: ClientData[]
}

interface Cita {
  id: string
  trainer_id: string
  client_id: string | null
  title: string
  start_at: string
  end_at: string
  status: 'pendiente' | 'confirmada' | 'cancelada' | 'completada' | 'ausente'
  notes: string
  recurring: 'weekly' | null
  recurring_until: string | null
  tipo_id?: string | null
  enlace?: string | null
  evento?: EventoAgenda | null  // reunión, personal o recordatorio: sin cliente (lib/eventosAgenda)
}

function emptyForm(dateISO: string) {
  return {
    title: 'Sesión', clientId: '', date: dateISO, time: '09:00', durationMin: 60,
    recurring: false, recurringUntil: '', tipoId: '' as string,
    evento: '' as '' | EventoAgenda,  // '' = sesión
    enlace: null as string | null,  // null = presencial
  }
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
// Fecha LOCAL (YYYY-MM-DD). Con toISOString() un día a medianoche local salía como el día anterior en UTC+1/+2:
// la fila del lunes se llamaba domingo, 'Hoy' caía en el día siguiente y las citas se agrupaban por su fecha UTC.
function toISODate(d: Date) { return localDateKey(d) }
function weekDays(anchor: Date) {
  const monday = addDays(anchor, -((anchor.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

const STATUS_META = {
  // Con los tokens del tema (antes colores fijos: ~2,2:1 de contraste y ilegibles en oscuro)
  pendiente: { label: 'Solicitada', cls: 'text-accent bg-accent/10' },
  confirmada: { label: 'Confirmada', cls: 'text-ok bg-ok/10' },
  completada: { label: 'Completada', cls: 'text-ink bg-bg-alt' },
  cancelada: { label: 'Cancelada', cls: 'text-warn bg-warn/10' },
  ausente: { label: 'No vino', cls: 'text-warn bg-warn/10' },
}

export function CalendarTab({ trainerId, clients }: Props) {
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  // Semana (lista por días) o mes (cuadrícula); y, con equipo, de qué profesional (lib/agendaMes)
  const [vista, setVista] = useState<'semana' | 'mes'>('semana')
  const [profesional, setProfesional] = useState('')
  const profesionales = useProfesionalesEquipo(trainerId)
  const [showForm, setShowForm] = useState<{ dateISO: string } | null>(null)
  const [verHorario, setVerHorario] = useState(false)
  const [verTipos, setVerTipos] = useState(false)
  const [verClases, setVerClases] = useState(false)
  const { tipos, guardar: guardarTipos } = useTiposCita(trainerId)
  const tipoDe = (id?: string | null) => (id ? tipos.find(t => t.id === id) : undefined)
  const [form, setForm] = useState(emptyForm(toISODate(new Date())))
  const [saving, setSaving] = useState(false)
  // Cumpleaños de los clientes en lo que se ve (lib/cumpleanos) y las felicitaciones ya programadas
  const { messages: programados, schedule } = useScheduledMessages(trainerId)

  useEffect(() => { loadCitas() }, [trainerId])

  const loadCitas = async () => {
    setLoading(true)
    if (trainerId === DEMO_TRAINER_ID) {
      setCitas(DEMO_CITAS as Cita[])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('citas').select('*').eq('trainer_id', trainerId).order('start_at')
    if (error) { logError('CalendarTab:load', error); toast('Error al cargar el calendario', 'warn') }
    else setCitas((data || []) as Cita[])
    setLoading(false)
  }

  const days = useMemo(() => weekDays(anchor), [anchor])
  const cumplesPorDia = useMemo(() => {
    const sems = vista === 'mes' ? semanasDelMes(anchor) : null
    const desde = sems ? sems[0][0].fecha : toISODate(days[0])
    const hasta = sems ? sems[sems.length - 1][6].fecha : toISODate(days[6])
    return cumpleanosEnRango(clients, desde, hasta)
  }, [clients, vista, anchor, days])
  const hoyISO = toISODate(new Date())
  const programadosDe = (fecha: string) => new Set(programados.filter(m => m.tipo === 'cumpleanos' && m.fechaEnvio === fecha).map(m => m.clientId))
  const programarFelicitacion = async (c: ClientData, texto: string, fecha: string) => {
    const ok = await schedule(c.id, 'cumpleanos', texto, fecha)
    toast(ok ? `Felicitación programada para ${c.name} ✓` : 'No se pudo programar', ok ? 'ok' : 'warn')
  }
  const citasVisibles = useMemo(() => citasDeProfesional(citas, clients, profesional, trainerId), [citas, clients, profesional, trainerId])
  const citasByDay = useMemo(() => {
    const map: Record<string, Cita[]> = {}
    citasVisibles.forEach(c => {
      const key = localDateKey(new Date(c.start_at))
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    Object.values(map).forEach(list => list.sort((a, b) => a.start_at.localeCompare(b.start_at)))
    return map
  }, [citasVisibles])

  const openNew = (dateISO: string) => { setForm(emptyForm(dateISO)); setShowForm({ dateISO }) }

  const saveCita = async () => {
    if (!form.clientId && form.title === 'Sesión') {
      // permitir bloqueos sin cliente (ej. "Reservado") igualmente
    }
    setSaving(true)
    const start = new Date(`${form.date}T${form.time}:00`)
    const evento = form.evento || null
    const end = finEvento(start, form.durationMin, evento)
    const base = {
      trainer_id: trainerId,
      client_id: evento ? null : form.clientId || null,
      title: form.title.trim() || (evento ? EVENTOS[evento].label : 'Sesión'),
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: 'confirmada' as const,
      notes: '',
      tipo_id: evento ? null : form.tipoId || null,
      enlace: form.enlace === null || (evento && !EVENTOS[evento].conEnlace) ? null : limpiarEnlace(form.enlace),
      evento,
    }

    let newRows: Cita[]
    if (form.recurring && form.recurringUntil) {
      const until = new Date(form.recurringUntil + 'T23:59:59')
      const rows = []
      let cursor = start
      while (cursor <= until) {
        const cEnd = finEvento(cursor, form.durationMin, evento)
        rows.push({ ...base, start_at: cursor.toISOString(), end_at: cEnd.toISOString(), recurring: 'weekly' as const, recurring_until: form.recurringUntil })
        cursor = addDays(cursor, 7)
      }
      if (trainerId !== DEMO_TRAINER_ID) {
        const { error } = await supabase.from('citas').insert(rows)
        if (error) { logError('CalendarTab:saveRecurring', error); toast('Error al crear las sesiones', 'warn'); setSaving(false); return }
      }
      newRows = rows.map((r, i) => ({ ...r, id: `demo-cita-new-${Date.now()}-${i}` }))
      toast(`${rows.length} sesiones creadas ✓`, 'ok')
    } else {
      if (trainerId !== DEMO_TRAINER_ID) {
        const { error } = await supabase.from('citas').insert(base)
        if (error) { logError('CalendarTab:save', error); toast('Error al crear la sesión', 'warn'); setSaving(false); return }
      }
      newRows = [{ ...base, id: `demo-cita-new-${Date.now()}`, recurring: null, recurring_until: null }]
      toast('Sesión creada ✓', 'ok')
    }

    setSaving(false)
    setShowForm(null)
    if (trainerId === DEMO_TRAINER_ID) setCitas(prev => [...prev, ...newRows]); else loadCitas()
  }

  const updateStatus = async (cita: Cita, status: Cita['status']) => {
    if (trainerId !== DEMO_TRAINER_ID) {
      const { error } = await supabase.from('citas').update({ status }).eq('id', cita.id)
      if (error) { logError('CalendarTab:status', error); toast('Error al actualizar', 'warn'); return }
    }
    setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, status } : c))
  }

  const deleteCita = async (cita: Cita) => {
    if (trainerId === DEMO_TRAINER_ID) { setCitas(prev => prev.filter(c => c.id !== cita.id)); toast('Sesión eliminada', 'ok'); return }
    const { error } = await supabase.from('citas').delete().eq('id', cita.id)
    if (error) { logError('CalendarTab:delete', error); toast('Error al borrar', 'warn'); return }
    setCitas(prev => prev.filter(c => c.id !== cita.id))
    toast('Sesión eliminada', 'ok')
  }

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.name || null
  const pendientes = citas.filter(c => c.status === 'pendiente')

  if (loading) return (
    <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
  )

  return (
    <div className="max-w-3xl space-y-4 animate-fade-in">
      {pendientes.length > 0 && (
        <div className="bg-warn/8 border border-warn/20 rounded-2xl px-4 py-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-warn flex-shrink-0" />
          <p className="text-xs font-semibold text-warn">
            {pendientes.length} cita{pendientes.length !== 1 ? 's' : ''} solicitada{pendientes.length !== 1 ? 's' : ''} por clientes, esperando tu confirmación
          </p>
        </div>
      )}
      <button onClick={() => setVerHorario(true)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-2xl text-sm font-semibold text-left hover:border-accent transition-colors">
        <CalendarClock className="w-4 h-4 text-accent flex-shrink-0" />
        <span className="flex-1">Horario para reservas<span className="block text-xs text-muted font-normal">Cuándo pueden reservarte cita tus clientes desde su app</span></span>
      </button>
      <button onClick={() => setVerClases(true)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-2xl text-sm font-semibold text-left hover:border-accent transition-colors">
        <Users className="w-4 h-4 text-accent flex-shrink-0" />
        <span className="flex-1">Clases de grupo<span className="block text-xs text-muted font-normal">Sesiones con plazas y lista de espera</span></span>
      </button>
      {verClases && <Suspense fallback={null}><ClasesGrupo trainerId={trainerId} clients={clients} onClose={() => setVerClases(false)} /></Suspense>}
      <button onClick={() => setVerTipos(true)} className="text-xs font-semibold text-accent -mt-2">
        {tipos.length ? `Tipos de cita (${tipos.length})` : '+ Tipos de cita con color'}
      </button>
      {verTipos && <Suspense fallback={null}><TiposCitaEditor tipos={tipos} onGuardar={guardarTipos} onClose={() => setVerTipos(false)} /></Suspense>}
      {verHorario && <Suspense fallback={null}><HorarioCitasEditor trainerId={trainerId} demo={trainerId === DEMO_TRAINER_ID} onClose={() => setVerHorario(false)} /></Suspense>}
      {/* Se vuelve a montar al cerrar Clases de grupo: así recoge la lista que se acaba de pasar */}
      <Suspense fallback={null}><CifrasAgenda key={verClases ? 'clases-abiertas' : 'clases-cerradas'} trainerId={trainerId} citas={citas} /></Suspense>
      {/* Semana o mes, y de qué profesional (solo con equipo) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1" role="radiogroup" aria-label="Vista de la agenda">
          {([['semana', 'Semana'], ['mes', 'Mes']] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={vista === v} onClick={() => setVista(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${vista === v ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:text-ink'}`}>{l}</button>
          ))}
        </div>
        {profesionales.length > 1 && (
          <select value={profesional} onChange={e => setProfesional(e.target.value)} aria-label="Profesional"
            className="ml-auto text-xs bg-card border border-border rounded-xl px-2.5 py-1.5">
            <option value="">Todo el equipo</option>
            {profesionales.map(p => <option key={p.uid} value={p.uid}>{p.uid === trainerId ? `${p.nombre} (tú)` : p.nombre}</option>)}
          </select>
        )}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button onClick={() => setAnchor(vista === 'mes' ? new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1) : addDays(anchor, -7))}
          aria-label={vista === 'mes' ? 'Mes anterior' : 'Semana anterior'} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ChevronLeft className="w-4 h-4" /></button>
        <p className="text-sm font-semibold capitalize" data-testid="periodo-agenda">
          {vista === 'mes'
            ? anchor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
            : <>{days[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</>}
        </p>
        <button onClick={() => setAnchor(vista === 'mes' ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1) : addDays(anchor, 7))}
          aria-label={vista === 'mes' ? 'Mes siguiente' : 'Semana siguiente'} className="p-2 rounded-xl hover:bg-bg-alt text-muted"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Mes: cada día con sus citas; al pulsar uno se abre su semana */}
      {vista === 'mes' && (
        <div className="bg-card border border-border rounded-2xl p-2" role="grid" aria-label="Mes">
          <div className="grid grid-cols-7 gap-1 mb-1" role="row">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d} role="columnheader" className="text-[11px] font-bold text-muted text-center">{d}</span>)}
          </div>
          {semanasDelMes(anchor).map(sem => (
            <div key={sem[0].fecha} className="grid grid-cols-7 gap-1" role="row">
              {sem.map(d => {
                const delDia = (citasByDay[d.fecha] || []).filter(c => c.status !== 'cancelada')
                const cumples = cumplesPorDia[d.fecha] || []
                return (
                  <button key={d.fecha} type="button" role="gridcell" onClick={() => { setAnchor(new Date(d.fecha + 'T12:00:00')); setVista('semana') }}
                    aria-label={`${new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}: ${delDia.length} cita${delDia.length === 1 ? '' : 's'}${cumples.length ? `, cumpleaños de ${cumples.map(x => x.cliente.name).join(' y ')}` : ''}`}
                    className={`min-h-[56px] rounded-lg p-1 text-left flex flex-col gap-0.5 hover:bg-bg-alt ${d.delMes ? '' : 'opacity-40'} ${d.hoy ? 'ring-2 ring-accent' : ''}`}>
                    <span className="text-xs font-semibold">{d.dia}{cumples.length > 0 && <span aria-hidden> 🎂</span>}</span>
                    {delDia.slice(0, 2).map(c => (
                      <span key={c.id} className="text-[11px] leading-tight truncate px-1 rounded bg-bg-alt" style={tipoDe(c.tipo_id) ? { borderLeft: `3px solid ${tipoDe(c.tipo_id)!.color}` } : undefined}>
                        {new Date(c.start_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} {c.evento ? `${EVENTOS[c.evento].emoji} ` : ''}{clientName(c.client_id) || c.title}
                      </span>
                    ))}
                    {delDia.length > 2 && <span className="text-[11px] text-muted">+{delDia.length - 2} más</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Días de la semana */}
      {vista === 'semana' && <div className="space-y-3">
        {days.map(day => {
          const key = toISODate(day)
          const dayCitas = citasByDay[key] || []
          const isToday = key === toISODate(new Date())
          return (
            <div key={key} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className={`px-4 py-2.5 flex items-center justify-between ${isToday ? 'bg-accent/8' : 'bg-bg-alt/40'}`}>
                <p className="text-sm font-bold capitalize">
                  {day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                  {isToday && <span className="ml-2 text-[11px] font-bold text-accent uppercase">Hoy</span>}
                </p>
                <button onClick={() => openNew(key)} aria-label={`Añadir sesión el ${new Date(key + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                  className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {cumplesPorDia[key] && <CumplesDia fecha={key} cumples={cumplesPorDia[key]} hoy={hoyISO} programados={programadosDe(key)} onProgramar={(c, t) => programarFelicitacion(c, t, key)} />}
              {dayCitas.length === 0 ? (
                <p className="px-4 py-3 text-xs text-muted">Sin sesiones</p>
              ) : (
                <div className="divide-y divide-border">
                  {dayCitas.map(cita => {
                    const meta = STATUS_META[cita.status]
                    const time = new Date(cita.start_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    const name = clientName(cita.client_id)
                    return (
                      <div key={cita.id} className="px-4 py-3 flex items-center gap-3 relative">
                        {tipoDe(cita.tipo_id) && <span className="absolute left-0 inset-y-2 w-1 rounded-r" style={{ backgroundColor: tipoDe(cita.tipo_id)!.color }} aria-hidden />}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted w-14 flex-shrink-0">
                          <Clock className="w-3 h-3" />{time}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                            {cita.evento && <span aria-hidden>{EVENTOS[cita.evento].emoji}</span>}
                            {cita.title}
                            {cita.recurring && <Repeat className="w-3 h-3 text-muted" />}
                          </p>
                          {name && <p className="text-xs text-muted flex items-center gap-1"><Users className="w-3 h-3" />{name}</p>}
                          {tipoDe(cita.tipo_id) && <p className="text-[11px] text-muted">{tipoDe(cita.tipo_id)!.nombre}</p>}
                          {cita.enlace && <a href={cita.enlace} target="_blank" rel="noopener noreferrer" className="inline-block mt-0.5"><EtiquetaOnline enlace={cita.enlace} /></a>}
                        </div>
                        {cita.evento
                          ? <span className="text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 text-muted bg-bg-alt">{EVENTOS[cita.evento].label}</span>
                          : <span className={`text-[11px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${meta.cls}`}>
                          {meta.label}
                        </span>}
                        {!cita.evento && cita.status === 'pendiente' && (
                          <>
                            <button onClick={() => updateStatus(cita, 'confirmada')}
                              className="px-2.5 py-1.5 bg-ok text-white rounded-lg text-[11px] font-bold flex-shrink-0">Confirmar</button>
                            <button onClick={() => updateStatus(cita, 'cancelada')} title="Rechazar"
                              className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0"><Ban className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        {!cita.evento && cita.status === 'confirmada' && (
                          <>
                            <button onClick={() => updateStatus(cita, 'completada')} title="Vino (completada)" aria-label={`Vino a ${cita.title}`}
                              className="p-1.5 text-muted hover:text-ok rounded-lg flex-shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                            {cita.client_id && new Date(cita.start_at).getTime() <= Date.now() && (
                              <button onClick={() => updateStatus(cita, 'ausente')} title="No vino (sin avisar)" aria-label={`No vino a ${cita.title}`}
                                className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0"><UserX className="w-3.5 h-3.5" /></button>
                            )}
                            <button onClick={() => updateStatus(cita, 'cancelada')} title="Cancelar"
                              className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0"><Ban className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        <button onClick={() => deleteCita(cita)} title="Eliminar"
                          className="p-1.5 text-muted hover:text-warn rounded-lg flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>}

      {/* Modal nueva sesión */}
      {showForm && (
        <Modal open plain onClose={() => setShowForm(null)} ariaLabel="Nueva sesión" maxWidth="max-w-md">
          <div className="max-h-[85dvh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg">Nueva sesión</h3>
              <button onClick={() => setShowForm(null)} className="p-1.5 text-muted hover:text-ink"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <p className="block text-xs font-semibold text-muted mb-1.5">Qué es</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Qué es">
                {([['', '🏋️', 'Sesión'], ...ORDEN_EVENTOS.map(e => [e, EVENTOS[e].emoji, EVENTOS[e].label])] as ['' | EventoAgenda, string, string][]).map(([v, emoji, label]) => (
                  <button key={label} type="button" role="radio" aria-checked={form.evento === v}
                    onClick={() => setForm(f => ({ ...f, evento: v, title: v ? EVENTOS[v].label : 'Sesión', clientId: v ? '' : f.clientId, tipoId: v ? '' : f.tipoId }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${form.evento === v ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>
                    <span aria-hidden>{emoji}</span> {label}
                  </button>
                ))}
              </div>
              {form.evento && <p className="text-[11px] text-muted mt-1">{EVENTOS[form.evento].ayuda}</p>}
            </div>

            {tipos.length > 0 && !form.evento && (
              <div>
                <p className="block text-xs font-semibold text-muted mb-1.5">Tipo</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de cita">
                  {tipos.map(t => (
                    <button key={t.id} type="button" role="radio" aria-checked={form.tipoId === t.id}
                      onClick={() => setForm(f => f.tipoId === t.id ? { ...f, tipoId: '' } : { ...f, tipoId: t.id, title: t.nombre, durationMin: t.duracion })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${form.tipoId === t.id ? 'bg-ink text-white border-ink' : 'border-border text-muted'}`}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />{t.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Título</label>
              <input aria-label="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
            </div>

            {!form.evento && <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Cliente (opcional)</label>
              <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none">
                <option value="">Sin asignar (bloqueo de agenda)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.surname}</option>)}
              </select>
            </div>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Fecha</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Hora</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
              </div>
            </div>

            {form.evento !== 'recordatorio' && <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Duración (min)</label>
              <input type="number" min={15} step={15} value={form.durationMin}
                onChange={e => setForm(f => ({ ...f, durationMin: parseInt(e.target.value) || 60 }))}
                className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
            </div>}

            {(!form.evento || EVENTOS[form.evento].conEnlace) && <CampoEnlaceOnline value={form.enlace} onChange={v => setForm(f => ({ ...f, enlace: v }))} />}

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} />
              Repetir cada semana
            </label>
            {form.recurring && (
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Repetir hasta</label>
                <input type="date" value={form.recurringUntil} onChange={e => setForm(f => ({ ...f, recurringUntil: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none" />
              </div>
            )}

            <button onClick={saveCita} disabled={saving || (form.recurring && !form.recurringUntil) || ((!form.evento || EVENTOS[form.evento].conEnlace) && form.enlace !== null && !limpiarEnlace(form.enlace))}
              className="w-full py-3.5 bg-ink text-white rounded-2xl font-bold text-sm disabled:opacity-50">
              {saving ? 'Guardando...' : form.evento ? `Crear ${EVENTOS[form.evento].label.toLowerCase()}` : 'Crear sesión'}
            </button>
          </div>
</Modal>
      )}
    </div>
  )
}
