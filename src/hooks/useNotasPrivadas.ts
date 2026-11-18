import { useCallback, useEffect, useRef, useState } from 'react'
import { cargarNotas, guardarNotas } from '../lib/notasPrivadasCliente'

export type EstadoNotas = 'idle' | 'pendiente' | 'guardando' | 'guardado' | 'error'

// Las notas privadas de un cliente, con guardado automático (como el plan: se espera un momento tras dejar de escribir) y
// guardado al cerrar la sección si quedaba algo sin enviar. (lib/notasPrivadas: la lógica; lib/notasPrivadasCliente: Supabase.)
export function useNotasPrivadas(clientId: string, trainerId?: string) {
  const [notas, setNotas] = useState('')
  const [cargando, setCargando] = useState(true)
  const [estado, setEstado] = useState<EstadoNotas>('idle')
  const pendiente = useRef<string | null>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout>>()
  const ids = useRef({ clientId, trainerId })
  ids.current = { clientId, trainerId }

  useEffect(() => {
    let vivo = true
    setCargando(true); setNotas(''); setEstado('idle'); pendiente.current = null
    cargarNotas(clientId).then(n => { if (vivo) { setNotas(n); setCargando(false) } })
    return () => { vivo = false }
  }, [clientId])

  const volcar = useCallback(async () => {
    clearTimeout(temporizador.current)
    const texto = pendiente.current
    const { clientId: cid, trainerId: tid } = ids.current
    if (texto === null || !tid) return
    pendiente.current = null
    setEstado('guardando')
    const ok = await guardarNotas(tid, cid, texto)
    if (!ok && pendiente.current === null) pendiente.current = texto
    setEstado(ok ? 'guardado' : 'error')
  }, [])

  const cambiar = useCallback((texto: string) => {
    setNotas(texto)
    pendiente.current = texto
    setEstado('pendiente')
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(volcar, 1200)
  }, [volcar])

  // Al desmontar (cerrar la sección o la ficha) no se pierde lo último escrito
  useEffect(() => () => { void volcar() }, [volcar])

  return { notas, cargando, estado, cambiar, volcar }
}
