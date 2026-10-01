import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_TRAINER_ID, DEMO_READINESS_FLAT, DEMO_DOLOR_FLAT, DEMO_VIDEO_FEEDBACK_MAP } from '../lib/demo-data'
import { PainEntry } from '../lib/clientPain'
import { ClientWithStats } from './useTrainerClients'

interface ReadinessRow { clientId: string; date: string; sleep: number; soreness: number; stress: number; motivation: number }
interface VideoRow { id: string; client_id: string; exercise_name: string; status: 'pendiente' | 'comentado'; created_at: number }
interface BorradorRow { clientId: string; borrador_activo: boolean; borrador_started_at: string | null }
interface ReviewRow { clientId: string; week_start: string }

export type InboxKind = 'sesion' | 'readiness' | 'dolor' | 'video' | 'borrador' | 'riesgo' | 'revision'

export interface InboxItem {
  key: string
  clientId: string
  clientName: string
  date: string
  kind: InboxKind
  detail: string
  warn?: boolean
}

// Umbral para que una molestia articular aparezca — por debajo de esto es
// más ruido que señal (ver DolorChart: >=7 alto, >=4 moderado).
const DOLOR_ALERTA_MIN = 4
const DAYS_BACK = 14

// Un cliente puede cumplir varios criterios de riesgo a la vez (sin plan Y
// con ACWR alto, por ejemplo) — se muestra solo el más urgente de todos, en
// este orden, en vez de generar un ítem por cada uno (serían 4-5 líneas
// repetidas del mismo cliente en la bandeja).
function riskDetail(c: ClientWithStats): string | null {
  if (!c.hasPlan) return 'Sin plan asignado'
  if (c.highAcwr) return `⚡ Carga alta (ACWR ${c.acwrRatio})`
  if (c.highJumpDrop) return `🦵 Caída de salto (${c.jumpDropPct}%)`
  if (c.atRisk) return '🚩 Riesgo de abandono'
  if (c.planEndingSoon) return `Plan termina el ${c.planEndDate ? new Date(c.planEndDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'pronto'}`
  return null
}

/**
 * Todo lo que un entrenador podría necesitar revisar hoy, en un único sitio:
 * sesiones completadas, check-ins, dolor, vídeos sin responder, borradores
 * sin publicar y clientes en riesgo (sin plan / carga alta / caída de
 * salto / abandono / plan por acabar) — antes repartido entre BandejaTab,
 * AlertasWidget "Requieren atención" y "Tareas de hoy" en el dashboard,
 * cada uno con su propia carga de datos y su propio criterio de orden.
 *
 * Mismo modelo de siempre (lista derivada, nada de tabla/cola nueva): se
 * calcula a partir de datos que ya existen, no se persiste nada aquí salvo
 * qué ítems ha marcado como revisados el propio entrenador (localStorage,
 * igual que ya hacía BandejaTab).
 */
export function useInboxItems(trainerId: string, clients: ClientWithStats[], logsMap: Record<string, any>) {
  const [readiness, setReadiness] = useState<ReadinessRow[]>([])
  const [dolor, setDolor] = useState<({ clientId: string } & PainEntry)[]>([])
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [borradores, setBorradores] = useState<BorradorRow[]>([])
  const [lastReviews, setLastReviews] = useState<Record<string, string>>({}) // clientId -> week_start más reciente
  const [loading, setLoading] = useState(true)
  const [reviewed, setReviewed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`pf_bandeja_revisados_${trainerId}`) || '[]')) } catch { return new Set() }
  })

  useEffect(() => {
    const clientIds = clients.map(c => c.id)
    if (clientIds.length === 0) { setLoading(false); return }
    if (trainerId === DEMO_TRAINER_ID) {
      setReadiness(DEMO_READINESS_FLAT)
      setDolor(DEMO_DOLOR_FLAT)
      setVideos(Object.values(DEMO_VIDEO_FEEDBACK_MAP).flat() as VideoRow[])
      setBorradores([])
      setLastReviews({})
      setLoading(false)
      return
    }
    const since = new Date(); since.setDate(since.getDate() - DAYS_BACK)
    const sinceKey = since.toISOString().split('T')[0]
    const goalClientIds = clients.filter(c => c.main_goal).map(c => c.id)
    Promise.all([
      supabase.from('readiness_checkins').select('clientId, date, sleep, soreness, stress, motivation')
        .in('clientId', clientIds).gte('date', sinceKey).order('date', { ascending: false }),
      supabase.from('registros_dolor').select('id, clientId, date, zona, intensidad, nota, tipo')
        .in('clientId', clientIds).gte('date', sinceKey).order('date', { ascending: false }),
      supabase.from('video_feedback').select('id, client_id, exercise_name, status, created_at')
        .eq('trainer_id', trainerId).eq('status', 'pendiente'),
      supabase.from('planes').select('clientId, borrador_activo, borrador_started_at')
        .in('clientId', clientIds).eq('borrador_activo', true),
      goalClientIds.length
        ? supabase.from('weekly_reviews').select('clientId, week_start').in('clientId', goalClientIds).order('week_start', { ascending: false })
        : Promise.resolve({ data: [] as ReviewRow[] }),
    ]).then(([readinessRes, dolorRes, videoRes, borradorRes, reviewRes]) => {
      setReadiness((readinessRes.data || []) as ReadinessRow[])
      setDolor((dolorRes.data || []) as ({ clientId: string } & PainEntry)[])
      setVideos((videoRes.data || []) as VideoRow[])
      setBorradores((borradorRes.data || []) as BorradorRow[])
      const latest: Record<string, string> = {}
      ;((reviewRes.data || []) as ReviewRow[]).forEach(r => { if (!latest[r.clientId]) latest[r.clientId] = r.week_start })
      setLastReviews(latest)
      setLoading(false)
    })
  }, [clients, trainerId])

  const items = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - DAYS_BACK)
    const sinceKey = since.toISOString().split('T')[0]
    const hoy = new Date().toISOString().split('T')[0]
    const list: InboxItem[] = []
    const nameOf = (id: string) => { const c = clients.find(cl => cl.id === id); return c ? `${c.name} ${c.surname}` : '' }

    clients.forEach(c => {
      const logs = logsMap[c.id] || {}
      const dateCounts: Record<string, number> = {}
      Object.values(logs).forEach((l: any) => {
        if (l.dateDone && l.dateDone >= sinceKey) dateCounts[l.dateDone] = (dateCounts[l.dateDone] || 0) + 1
      })
      Object.entries(dateCounts).forEach(([date, count]) => {
        list.push({ key: `sesion:${c.id}:${date}`, clientId: c.id, clientName: `${c.name} ${c.surname}`, date, kind: 'sesion',
          detail: `Completó una sesión (${count} ejercicio${count !== 1 ? 's' : ''})` })
      })
    })

    readiness.forEach(r => {
      const name = nameOf(r.clientId); if (!name) return
      const warn = r.sleep <= 2 || r.soreness <= 2 || r.motivation <= 2
      list.push({ key: `readiness:${r.clientId}:${r.date}`, clientId: r.clientId, clientName: name, date: r.date, kind: 'readiness',
        detail: `Check-in de forma — sueño ${r.sleep}/5, dolor ${r.soreness}/5, motivación ${r.motivation}/5`, warn })
    })

    dolor.forEach(d => {
      const name = nameOf(d.clientId); if (!name || d.intensidad < DOLOR_ALERTA_MIN) return
      const esArticular = d.tipo === 'articular'
      list.push({ key: `dolor:${d.id}`, clientId: d.clientId, clientName: name, date: d.date, kind: 'dolor',
        detail: `${esArticular ? 'Molestia articular' : 'Dolor'} en ${d.zona} (${d.intensidad}/10)${d.nota ? ` — "${d.nota}"` : ''}`,
        warn: esArticular || d.intensidad >= 7 })
    })

    videos.forEach(v => {
      const name = nameOf(v.client_id); if (!name) return
      list.push({ key: `video:${v.id}`, clientId: v.client_id, clientName: name, date: new Date(v.created_at).toISOString().split('T')[0], kind: 'video',
        detail: `🎥 Pide feedback de "${v.exercise_name}"`, warn: true })
    })

    borradores.forEach(b => {
      const name = nameOf(b.clientId); if (!name) return
      const date = b.borrador_started_at ? b.borrador_started_at.split('T')[0] : hoy
      list.push({ key: `borrador:${b.clientId}`, clientId: b.clientId, clientName: name, date, kind: 'borrador',
        detail: '📝 Borrador del plan sin publicar', warn: true })
    })

    clients.forEach(c => {
      const detail = riskDetail(c)
      if (!detail) return
      list.push({ key: `riesgo:${c.id}`, clientId: c.id, clientName: `${c.name} ${c.surname}`, date: hoy, kind: 'riesgo', detail, warn: true })
    })

    // Solo para clientes con objetivo principal puesto (el entrenador optó
    // por usar esto) y sin ninguna revisión en los últimos 7 días. Clave por
    // semana (no por día): si se marca como revisado, no reaparece hasta la
    // semana que viene — lo que de verdad lo quita de la lista es añadir una
    // revisión real, que actualiza lastReviews en el siguiente fetch.
    const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7)
    const hace7Key = hace7.toISOString().split('T')[0]
    const now = new Date()
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1))
    const weekKey = monday.toISOString().split('T')[0]
    clients.forEach(c => {
      if (!c.main_goal) return
      const last = lastReviews[c.id]
      if (last && last >= hace7Key) return
      list.push({ key: `revision:${c.id}:${weekKey}`, clientId: c.id, clientName: `${c.name} ${c.surname}`, date: hoy, kind: 'revision',
        detail: '🎯 Toca revisión semanal del objetivo', warn: true })
    })

    // Lo urgente (warn) siempre arriba; dentro de cada bloque, lo más reciente primero.
    return list.sort((a, b) => (Number(!!b.warn) - Number(!!a.warn)) || b.date.localeCompare(a.date))
  }, [clients, logsMap, readiness, dolor, videos, borradores, lastReviews])

  const visibleItems = (onlyPending: boolean) => onlyPending ? items.filter(i => !reviewed.has(i.key)) : items
  const pendingCount = items.filter(i => !reviewed.has(i.key)).length

  const toggleReviewed = (key: string) => {
    setReviewed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      try { localStorage.setItem(`pf_bandeja_revisados_${trainerId}`, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  return { items, visibleItems, pendingCount, reviewed, toggleReviewed, loading }
}
