import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { isDemoClientId } from '../lib/demoIds'
import { localDateKey } from '../lib/dates'
import type { Ausencia, EventoCliente } from '../lib/ausencias'
import { toast } from '../components/shared/Toast'

// En la demo no hay tablas: se trabaja en memoria, con un evento de ejemplo para que se vea la cuenta atrás.
function demoInicial(clientId: string): { ausencias: Ausencia[]; eventos: EventoCliente[] } {
  if (clientId !== 'demo-client-001') return { ausencias: [], eventos: [] }
  const en = (dias: number) => { const d = new Date(); d.setDate(d.getDate() + dias); return localDateKey(d) }
  return {
    ausencias: [{ id: 'demo-aus-1', client_id: clientId, desde: en(18), hasta: en(21), tipo: 'no_puedo', motivo: 'viaje', nota: 'Puente', creado_por: 'cliente' }],
    eventos: [{ id: 'demo-ev-1', client_id: clientId, fecha: en(44), nombre: 'Carrera popular 10K', prioridad: 'A', nota: '' }],
  }
}

/** Ausencias y eventos de un cliente, con alta y baja. Lo usan el cliente (Más, Hoy) y su entrenador (ficha). */
export function useAusenciasEventos(clientId: string, quien: 'cliente' | 'entrenador') {
  const [ausencias, setAusencias] = useState<Ausencia[]>([])
  const [eventos, setEventos] = useState<EventoCliente[]>([])
  const [cargando, setCargando] = useState(true)
  const demo = isDemoClientId(clientId)

  const cargar = useCallback(async () => {
    if (demo) { const d = demoInicial(clientId); setAusencias(d.ausencias); setEventos(d.eventos); setCargando(false); return }
    const desde = localDateKey(new Date(Date.now() - 60 * 86400000))
    const [a, e] = await Promise.all([
      supabase.from('ausencias').select('*').eq('client_id', clientId).gte('hasta', desde).order('desde'),
      supabase.from('eventos_cliente').select('*').eq('client_id', clientId).gte('fecha', desde).order('fecha'),
    ])
    setAusencias((a.data || []) as Ausencia[])
    setEventos((e.data || []) as EventoCliente[])
    setCargando(false)
  }, [clientId, demo])

  useEffect(() => { cargar() }, [cargar])

  const nuevaAusencia = async (a: Pick<Ausencia, 'desde' | 'hasta' | 'motivo' | 'nota'> & { tipo?: Ausencia['tipo'] }) => {
    const fila = { client_id: clientId, tipo: 'no_puedo' as const, creado_por: quien, ...a }
    if (demo) { setAusencias(prev => [...prev, { id: `demo-${Date.now()}`, ...fila }].sort((x, y) => x.desde.localeCompare(y.desde))); return true }
    const { error } = await supabase.from('ausencias').insert(fila)
    if (error) { toast('No se pudo guardar la ausencia', 'warn'); return false }
    await cargar(); return true
  }

  const nuevoEvento = async (e: Pick<EventoCliente, 'fecha' | 'nombre' | 'prioridad' | 'nota'>) => {
    const fila = { client_id: clientId, ...e, nombre: e.nombre.trim() }
    if (demo) { setEventos(prev => [...prev, { id: `demo-${Date.now()}`, ...fila }].sort((x, y) => x.fecha.localeCompare(y.fecha))); return true }
    const { error } = await supabase.from('eventos_cliente').insert(fila)
    if (error) { toast('No se pudo guardar el evento', 'warn'); return false }
    await cargar(); return true
  }

  const borrar = async (tabla: 'ausencias' | 'eventos_cliente', id: string) => {
    if (!demo) {
      const { error } = await supabase.from(tabla).delete().eq('id', id)
      if (error) { toast('No se pudo borrar', 'warn'); return }
    }
    if (tabla === 'ausencias') setAusencias(prev => prev.filter(a => a.id !== id))
    else setEventos(prev => prev.filter(e => e.id !== id))
  }

  return { ausencias, eventos, cargando, nuevaAusencia, nuevoEvento, borrarAusencia: (id: string) => borrar('ausencias', id), borrarEvento: (id: string) => borrar('eventos_cliente', id) }
}
