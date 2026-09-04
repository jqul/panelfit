import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ClientData } from '../types'
import { mapClientes } from '../lib/mappers'
import { toast } from '../components/shared/Toast'
import { computeACWR, computeSessionLoadACWR, worseAcwr } from '../lib/loadRisk'
import { worstJumpFatigue, JumpResultado } from '../lib/jumpFatigue'
import { DEMO_SESSION_LOAD_MAP, DEMO_TEST_CATALOG, DEMO_TEST_RESULTS_MAP } from '../lib/demo-data'

export interface ClientWithStats extends ClientData {
  lastActive?: string
  doneToday?: boolean
  hasPlan?: boolean
  weeklyDays?: number
  planEndDate?: string
  planEndingSoon?: boolean
  atRisk?: boolean
  highAcwr?: boolean
  acwrRatio?: number | null
  highJumpDrop?: boolean
  jumpDropPct?: number | null
  jumpDropTestName?: string | null
}

const ACWR_HIGH_THRESHOLD = 1.5

// Tests de salto (CMJ, Drop Jump/RSI...) — los únicos donde una caída frente
// a la línea base es señal de fatiga neuromuscular. Se filtra por categoría
// Y por nombre para no arrastrar aquí un test de potencia personalizado que
// no sea en realidad un salto (p.ej. un 1RM de cargada de potencia).
function isJumpTest(categoria: string, nombre: string): boolean {
  if (categoria !== 'Potencia') return false
  const n = nombre.toLowerCase()
  return n.includes('salto') || n.includes('jump') || n.includes('cmj') || n.includes('rsi')
}

// Agrupa resultados de pruebas por cliente y, dentro de cada cliente, por
// test — worstJumpFatigue necesita los resultados de cada test por separado
// para no mezclar la línea base de un CMJ con la de un Drop Jump.
function groupJumpResultsByClient(
  resultados: { client_id: string; test_id: string; valor: number; fecha: string }[],
  jumpTestNames: Record<string, string>
): Record<string, JumpResultado[][]> {
  const byClientTest: Record<string, Record<string, JumpResultado[]>> = {}
  resultados.forEach(r => {
    const testName = jumpTestNames[r.test_id]
    if (!testName) return // no es un test de salto — no aporta a esta señal
    const byTest = (byClientTest[r.client_id] ||= {})
    ;(byTest[r.test_id] ||= []).push({ testId: r.test_id, testName, valor: r.valor, fecha: r.fecha })
  })
  const result: Record<string, JumpResultado[][]> = {}
  Object.entries(byClientTest).forEach(([clientId, byTest]) => { result[clientId] = Object.values(byTest) })
  return result
}

const PLAN_ENDING_SOON_DAYS = 5
const AT_RISK_INACTIVE_DAYS = 10

// Riesgo de abandono: tiene plan asignado (el entrenador ya invirtió tiempo)
// pero lleva demasiados días sin entrenar — señal de que puede estar dejándolo.
// Si aún no ha entrenado nunca, se cuenta desde que se dio de alta (no desde siempre),
// para no marcar como "en riesgo" a un cliente recién creado que no ha tenido tiempo de empezar.
function computeAtRisk(hasPlan: boolean, lastActive?: string, createdAt?: number): boolean {
  if (!hasPlan) return false
  const since = lastActive ? new Date(lastActive + 'T00:00:00').getTime() : createdAt
  if (!since) return false
  const days = Math.round((Date.now() - since) / 86400000)
  return days >= AT_RISK_INACTIVE_DAYS
}

function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computePlanEnd(fechaInicio?: string, weeksLen?: number): { planEndDate?: string; planEndingSoon?: boolean } {
  if (!fechaInicio || !weeksLen) return {}
  const start = new Date(fechaInicio + 'T00:00:00')
  const end = new Date(start); end.setDate(start.getDate() + weeksLen * 7)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000)
  return {
    planEndDate: toLocalISODate(end),
    planEndingSoon: daysLeft >= 0 && daysLeft <= PLAN_ENDING_SOON_DAYS,
  }
}

// Empareja el objetivo del cliente con el "tipo" de programa (vocabularios distintos:
// el objetivo usa claves tipo especialidad, el tipo de programa es texto libre en español).
const OBJETIVO_TO_TIPO: Record<string, string> = {
  hipertrofia: 'Hipertrofia',
  fuerza: 'Fuerza',
  halterofilia: 'Fuerza',
  rehabilitacion: 'Rehabilitación',
  rendimiento: 'Rendimiento',
  perdida_grasa: 'Pérdida de grasa',
  resistencia: 'Resistencia',
  general: 'General',
}

function programWeeksToPlanWeeks(weeks: any[]) {
  const result = (weeks || []).map((w: any) => ({
    label: w.label,
    rpe: '',
    isCurrent: false,
    days: (w.days || []).map((d: any) => ({
      title: d.tasks?.find((t: any) => t.type === 'workout')?.title || 'Día',
      focus: d.tasks?.filter((t: any) => t.type !== 'workout').map((t: any) => t.title).join(', ') || '',
      exercises: [],
    }))
  }))
  if (result.length > 0) result[0].isCurrent = true
  return result
}

interface Options {
  trainerId: string
  demoClients?: ClientData[]
  demoLogsMap?: Record<string, any>
  clientLimit?: number
}

export function useTrainerClients({ trainerId, demoClients, demoLogsMap, clientLimit = 999 }: Options) {
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [logsMap, setLogsMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    if (demoClients) {
      const lm = demoLogsMap || {}
      setLogsMap(lm)
      const hoy = new Date().toISOString().split('T')[0]
      const haceUnaS = new Date(); haceUnaS.setDate(haceUnaS.getDate() - 7)
      const jumpTestNames: Record<string, string> = {}
      DEMO_TEST_CATALOG.forEach(t => { if (isJumpTest(t.categoria, t.nombre)) jumpTestNames[t.id] = t.nombre })
      const allDemoResultados = Object.values(DEMO_TEST_RESULTS_MAP).flat()
      const jumpByClient = groupJumpResultsByClient(allDemoResultados, jumpTestNames)
      setClients(demoClients.map(c => {
        const logs = lm[c.id] || {}
        const dates = [...new Set(
          Object.values(logs)
            .filter((l: any) => l.dateDone)
            .map((l: any) => l.dateDone as string)
        )].sort().reverse() as string[]
        const tonnageAcwr = computeACWR(logs)
        const srpeAcwr = computeSessionLoadACWR(DEMO_SESSION_LOAD_MAP[c.id] || [])
        const acwr = worseAcwr(tonnageAcwr, srpeAcwr)
        const jumpFatigue = worstJumpFatigue(jumpByClient[c.id] || [])
        return {
          ...c,
          lastActive: dates[0],
          doneToday: dates[0] === hoy,
          hasPlan: true,
          weeklyDays: dates.filter(d => new Date(d) >= haceUnaS).length,
          atRisk: computeAtRisk(true, dates[0], c.createdAt),
          highAcwr: acwr.ratio !== null && acwr.ratio > ACWR_HIGH_THRESHOLD,
          acwrRatio: acwr.ratio,
          highJumpDrop: jumpFatigue.isDrop,
          jumpDropPct: jumpFatigue.dropPct,
          jumpDropTestName: jumpFatigue.testName,
        }
      }) as ClientWithStats[])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('clientes').select('*').eq('trainerId', trainerId)
    if (error) { console.error('Error:', error); toast('No se pudieron cargar los clientes', 'warn'); setLoading(false); return }

    const mapped = mapClientes(data || []).map((c, i) => ({
      ...c,
      phone: (data || [])[i]?.phone || '',
      objetivo: (data || [])[i]?.objetivo || 'general',
      altura: (data || [])[i]?.altura || null,
      genero: (data || [])[i]?.genero || null,
      fechanacimiento: (data || [])[i]?.fechanacimiento || null,
      label_ids: (data || [])[i]?.label_ids || [],
    }))

    const hoy = new Date().toISOString().split('T')[0]
    const haceUnaS = new Date()
    haceUnaS.setDate(haceUnaS.getDate() - 7)

    if (mapped.length) {
      const ids = mapped.map(c => c.id)
      const [{ data: regs }, { data: planes }, { data: sessionLoads }, { data: testCatalogo }, { data: testResultados }] = await Promise.all([
        supabase.from('registros').select('clientId,logs').in('clientId', ids),
        supabase.from('planes').select('clientId,plan').in('clientId', ids),
        supabase.from('session_load').select('client_id,date,duration_min,rpe').in('client_id', ids),
        supabase.from('test_catalogo').select('id,categoria,nombre').eq('trainer_id', trainerId),
        supabase.from('test_resultados').select('client_id,test_id,valor,fecha').in('client_id', ids),
      ])
      const loadByClient: Record<string, { date: string; duration_min: number; rpe: number }[]> = {}
      ;(sessionLoads || []).forEach((r: any) => {
        (loadByClient[r.client_id] ||= []).push({ date: r.date, duration_min: r.duration_min, rpe: r.rpe })
      })

      const jumpTestNames: Record<string, string> = {}
      ;(testCatalogo || []).forEach((t: any) => { if (isJumpTest(t.categoria, t.nombre)) jumpTestNames[t.id] = t.nombre })
      const jumpByClient = groupJumpResultsByClient(testResultados || [], jumpTestNames)

      const planMap: Record<string, boolean> = {}
      const planEndMap: Record<string, { planEndDate?: string; planEndingSoon?: boolean }> = {}
      ;(planes || []).forEach((p: any) => {
        planMap[p.clientId] = !!(p.plan?.P?.weeks?.length)
        planEndMap[p.clientId] = computePlanEnd(p.plan?.P?.fechaInicio, p.plan?.P?.weeks?.length)
      })

      const lm: Record<string, any> = {}
      ;(regs || []).forEach((r: any) => { lm[r.clientId] = r.logs || {} })
      setLogsMap(lm)

      setClients(mapped.map(c => {
        const logs = lm[c.id] || {}
        const dates = [...new Set(
          Object.values(logs)
            .filter((l: any) => l.dateDone)
            .map((l: any) => l.dateDone as string)
        )].sort().reverse()
        const hasPlan = planMap[c.id] || false
        const tonnageAcwr = computeACWR(logs)
        const srpeAcwr = computeSessionLoadACWR(loadByClient[c.id] || [])
        const acwr = worseAcwr(tonnageAcwr, srpeAcwr)
        const jumpFatigue = worstJumpFatigue(jumpByClient[c.id] || [])
        return {
          ...c,
          lastActive: dates[0],
          doneToday: dates[0] === hoy,
          hasPlan,
          weeklyDays: dates.filter(d => new Date(d) >= haceUnaS).length,
          atRisk: computeAtRisk(hasPlan, dates[0], c.createdAt),
          highAcwr: acwr.ratio !== null && acwr.ratio > ACWR_HIGH_THRESHOLD,
          acwrRatio: acwr.ratio,
          highJumpDrop: jumpFatigue.isDrop,
          jumpDropPct: jumpFatigue.dropPct,
          jumpDropTestName: jumpFatigue.testName,
          ...planEndMap[c.id],
        }
      }))
    } else {
      setClients([])
    }
    setLoading(false)
  }, [trainerId, demoClients])

  useEffect(() => {
    fetchClients()
    const channel = supabase.channel('clientes-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'clientes',
        filter: `trainerId=eq.${trainerId}`
      }, fetchClients)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [trainerId, fetchClients])

  const addClient = async (newClient: {
    name: string; surname: string; phone: string; objetivo: string
    altura: string; peso: string; genero: string; fechanacimiento: string
  }, labelIds: string[] = []) => {
    if (clients.length >= clientLimit) {
      toast(`Limite alcanzado: tu plan permite ${clientLimit} clientes.`, 'warn')
      return false
    }
    const token = Math.random().toString(36).slice(2, 14)
    const objetivo = newClient.objetivo || 'general'
    const { data: inserted, error } = await supabase.from('clientes').insert({
      trainerId,
      name: newClient.name.trim(),
      surname: newClient.surname.trim(),
      phone: (newClient.phone || '').trim(),
      objetivo,
      token,
      createdAt: Date.now(),
      altura: newClient.altura ? parseFloat(newClient.altura) : null,
      weight: newClient.peso ? parseFloat(newClient.peso) : 0,
      genero: newClient.genero || null,
      fechanacimiento: newClient.fechanacimiento || null,
      fatPercentage: 0, muscleMass: 0, totalLifted: 0, planDescription: '',
      label_ids: labelIds,
    }).select('id').single()
    if (error) { toast('Error: ' + error.message, 'warn'); return false }
    toast('Cliente creado ✓', 'ok')
    if (inserted?.id) await autoAssignProgram(inserted.id, objetivo)
    await fetchClients()
    return true
  }

  // Al dar de alta un cliente, si el entrenador ya tiene un programa que encaja
  // con el objetivo elegido, se lo asigna de inmediato para ahorrar el paso manual.
  const autoAssignProgram = async (clientId: string, objetivo: string) => {
    const tipo = OBJETIVO_TO_TIPO[objetivo]
    if (!tipo) return
    const { data: progs } = await supabase.from('programs').select('*')
      .eq('trainer_id', trainerId).ilike('tipo', tipo).order('created_at', { ascending: false }).limit(1)
    const prog = progs?.[0]
    if (!prog) return
    const weeks = programWeeksToPlanWeeks(prog.weeks)
    const newPlan = {
      clientId, type: prog.tipo, restMain: 180, restAcc: 90, restWarn: 30,
      weeks, programId: prog.id, programName: prog.name,
      fechaInicio: new Date().toISOString().split('T')[0],
    }
    const { error: planError } = await supabase.from('planes')
      .upsert({ clientId, plan: { P: newPlan }, updatedAt: Date.now() }, { onConflict: 'clientId' })
    if (!planError) toast(`Programa "${prog.name}" asignado automáticamente ✓`, 'ok')
  }

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { toast('Error al eliminar el cliente', 'warn'); return false }
    await fetchClients()
    toast('Cliente eliminado', 'ok')
    return true
  }

  const limitReached = !demoClients && clients.length >= clientLimit

  return { clients, logsMap, loading, fetchClients, addClient, deleteClient, limitReached }
}
