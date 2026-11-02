// Escala para apuntar el esfuerzo: RIR (repeticiones en reserva, 0-5) o RPE (esfuerzo percibido, 1-10). Se guarda
// siempre como RIR (RPE = 10 − RIR), así que cambiar de escala no toca los datos ni las cuentas: solo cómo se
// pregunta y se enseña. La elige el cliente en Más y se recuerda en el dispositivo.

export type EscalaEsfuerzo = 'rir' | 'rpe'

const CLAVE = 'pf_escala_esfuerzo'

export function escalaEsfuerzo(): EscalaEsfuerzo {
  try { return localStorage.getItem(CLAVE) === 'rpe' ? 'rpe' : 'rir' } catch { return 'rir' }
}
export function guardarEscalaEsfuerzo(e: EscalaEsfuerzo) {
  try { localStorage.setItem(CLAVE, e) } catch { /* sin almacenamiento: no se recuerda */ }
}

const n = (x: number) => (Math.round(x * 10) / 10).toLocaleString('es-ES')

/** El valor de una opción del selector (que es un RIR) en la escala elegida: RIR 2 → «8»; el RIR «5+» → «≤5». */
export function valorEnEscala(rir: number, escala: EscalaEsfuerzo, abierto = false): string {
  if (escala === 'rir') return abierto ? `${n(rir)}+` : n(rir)
  return abierto ? `≤${n(10 - rir)}` : n(10 - rir)
}

/** «RIR 2» o «RPE 8», para enseñar un esfuerzo ya apuntado (o una media). */
export function etiquetaEsfuerzo(rir: number, escala: EscalaEsfuerzo): string {
  return escala === 'rpe' ? `RPE ${n(10 - rir)}` : `RIR ${n(rir)}`
}

export const preguntaEsfuerzo = (escala: EscalaEsfuerzo) =>
  escala === 'rpe' ? '¿Cuánto te ha costado? (RPE 1-10)' : '¿Cuántas te quedaban? (RIR)'
