// Qué mensajes programados se envían como push. Lógica pura (sin red ni Deno) para poder probarla con vitest
// (src/lib/mensajesProgramadosEnvio.test.ts); la función de borde la importa desde aquí.

export interface MensajePendiente { id: string; clientId: string; mensaje: string; fechaEnvio: string }

/** Un mensaje más atrasado que esto no se manda: llegaría fuera de contexto ("hoy AMRAP" una semana después). */
export const DIAS_MAX_ATRASO = 3
/** Tope por cliente y ejecución, para no inundar si se acumularon varios. */
export const MAX_POR_CLIENTE = 3

/** Suma días a una fecha 'YYYY-MM-DD' sin pasar por la zona horaria. */
export function sumarDias(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export interface Seleccion {
  enviar: MensajePendiente[]
  /** Tocaban pero el cliente no tiene ninguna suscripción push: se quedan pendientes, no se pierden. */
  sinSuscripcion: number
  /** Demasiado atrasados: se quedan como están (el entrenador los ve en su pestaña Mensajes). */
  atrasados: number
}

export function mensajesAEnviar(msgs: MensajePendiente[], clientesConPush: Set<string>, hoy: string): Seleccion {
  const limite = sumarDias(hoy, -DIAS_MAX_ATRASO)
  let sinSuscripcion = 0
  let atrasados = 0
  const porCliente = new Map<string, MensajePendiente[]>()
  for (const m of [...msgs].sort((a, b) => a.fechaEnvio.localeCompare(b.fechaEnvio))) {
    if (m.fechaEnvio > hoy) continue
    if (m.fechaEnvio < limite) { atrasados++; continue }
    if (!clientesConPush.has(m.clientId)) { sinSuscripcion++; continue }
    const lista = porCliente.get(m.clientId) ?? []
    lista.push(m)
    porCliente.set(m.clientId, lista)
  }
  // Si hay más del tope, se manda lo más reciente: lo atrasado ya no importa.
  const enviar = [...porCliente.values()].flatMap(l => l.slice(-MAX_POR_CLIENTE))
  return { enviar, sinSuscripcion, atrasados }
}
