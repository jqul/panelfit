import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { DEMO_TRAINER_ID, DEMO_TEST_CATALOG, DEMO_TEST_RESULTS_MAP } from './demo-data'

export interface FitnessTest {
  id: string
  trainer_id: string
  nombre: string
  categoria: string
  unidad: string
  descripcion: string
  es_default: boolean
  created_at: number
}

export interface TestResultado {
  id: string
  trainer_id: string
  client_id: string
  test_id: string
  valor: number
  fecha: string
  notas: string | null
  created_at: number
}

export const CATEGORIAS = ['Fuerza', 'Resistencia', 'Potencia', 'Flexibilidad', 'Equilibrio'] as const

const DEFAULTS: { nombre: string; categoria: string; unidad: string; descripcion: string }[] = [
  { nombre: 'Salto vertical (CMJ)', categoria: 'Potencia', unidad: 'cm', descripcion: 'Salto máximo con contramovimiento y sin carrera previa (test de Sargent / CMJ).' },
  { nombre: 'Drop Jump (RSI)', categoria: 'Potencia', unidad: 'índice', descripcion: 'Caída desde un cajón seguida de salto máximo — mide el Índice de Fuerza Reactiva (RSI = tiempo de vuelo ÷ tiempo de contacto), un indicador de fatiga del sistema nervioso central.' },
  { nombre: 'Test de Cooper', categoria: 'Resistencia', unidad: 'm', descripcion: 'Metros recorridos corriendo en 12 minutos.' },
  { nombre: 'Velocidad Aeróbica Máxima (VAM/MAS)', categoria: 'Resistencia', unidad: 'km/h', descripcion: 'Velocidad de referencia para prescribir series por %VAM. Regístrala en km/h sea cual sea el protocolo: 30-15 IFT (da la velocidad directamente), Course Navette/beep test (palier → km/h, aprox. 8 + 0,5×palier) o 1000m lanzado (velocidad media = distancia/tiempo).' },
  { nombre: 'Flexiones en 1 min', categoria: 'Fuerza', unidad: 'reps', descripcion: 'Máximo de flexiones de brazo en 60 segundos.' },
  { nombre: 'Plancha (plank)', categoria: 'Fuerza', unidad: 'segundos', descripcion: 'Tiempo máximo sosteniendo la posición de plancha.' },
  { nombre: 'Sit and reach', categoria: 'Flexibilidad', unidad: 'cm', descripcion: 'Distancia alcanzada en el test de flexibilidad isquiotibial.' },
  { nombre: 'Equilibrio a la pata coja', categoria: 'Equilibrio', unidad: 'segundos', descripcion: 'Tiempo en equilibrio sobre una pierna, ojos cerrados.' },
]

export function useTestCatalog(trainerId?: string) {
  const [tests, setTests] = useState<FitnessTest[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!trainerId) { setLoading(false); return }
    if (trainerId === DEMO_TRAINER_ID) { setTests(DEMO_TEST_CATALOG as FitnessTest[]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('test_catalogo').select('*').eq('trainer_id', trainerId).order('created_at')
    let rows = data || []
    if (rows.length === 0) {
      const seeded = DEFAULTS.map(d => ({
        id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        trainer_id: trainerId, nombre: d.nombre, categoria: d.categoria, unidad: d.unidad, descripcion: d.descripcion,
        es_default: true, created_at: Date.now(),
      }))
      const { error } = await supabase.from('test_catalogo').insert(seeded)
      if (!error) rows = seeded
    }
    setTests(rows as FitnessTest[])
    setLoading(false)
  }, [trainerId])

  useEffect(() => { load() }, [load])

  const addTest = useCallback(async (nombre: string, categoria: string, unidad: string, descripcion: string) => {
    if (!trainerId) return
    const t: FitnessTest = { id: `test_${Date.now()}`, trainer_id: trainerId, nombre, categoria, unidad, descripcion, es_default: false, created_at: Date.now() }
    setTests(prev => [...prev, t])
    if (trainerId === DEMO_TRAINER_ID) return
    await supabase.from('test_catalogo').insert(t)
  }, [trainerId])

  const deleteTest = useCallback(async (id: string) => {
    setTests(prev => prev.filter(t => t.id !== id))
    if (trainerId === DEMO_TRAINER_ID) return
    await supabase.from('test_catalogo').delete().eq('id', id)
  }, [trainerId])

  return { tests, loading, addTest, deleteTest, reload: load }
}

export function useTestResultados(clientId?: string) {
  const [resultados, setResultados] = useState<TestResultado[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return }
    if (clientId.startsWith('demo-client-')) { setResultados((DEMO_TEST_RESULTS_MAP[clientId] || []) as TestResultado[]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('test_resultados').select('*').eq('client_id', clientId).order('fecha', { ascending: false })
    setResultados((data || []) as TestResultado[])
    setLoading(false)
  }, [clientId])

  useEffect(() => { load() }, [load])

  const addResultado = useCallback(async (trainerId: string, testId: string, valor: number, fecha: string, notas: string) => {
    if (!clientId) return
    const r: TestResultado = { id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, trainer_id: trainerId, client_id: clientId, test_id: testId, valor, fecha, notas, created_at: Date.now() }
    setResultados(prev => [r, ...prev])
    if (clientId.startsWith('demo-client-')) return
    await supabase.from('test_resultados').insert(r)
  }, [clientId])

  const deleteResultado = useCallback(async (id: string) => {
    setResultados(prev => prev.filter(r => r.id !== id))
    if (clientId?.startsWith('demo-client-')) return
    await supabase.from('test_resultados').delete().eq('id', id)
  }, [clientId])

  return { resultados, loading, addResultado, deleteResultado, reload: load }
}
