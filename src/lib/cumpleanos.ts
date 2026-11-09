// Cumpleaños de los clientes (de su fecha de nacimiento, `fechanacimiento` 'YYYY-MM-DD'): en qué día cae cada año,
// cuáles caen en un rango de la agenda y el texto de la felicitación. Puro, para probarlo.

export interface ConNacimiento { id: string; name: string; surname?: string; phone?: string; fechanacimiento?: string | null }
export interface Cumple<C extends ConNacimiento = ConNacimiento> { cliente: C; edad: number | null }

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/
const bisiesto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0

/** El día del cumpleaños en el año dado ('YYYY-MM-DD'); el 29 de febrero, en años no bisiestos, el 28. */
export function cumpleEn(fechanacimiento: string | null | undefined, anio: number): string | null {
  const m = FECHA.exec(fechanacimiento || '')
  if (!m) return null
  const mes = Number(m[2]), dia = Number(m[3])
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  const d = mes === 2 && dia === 29 && !bisiesto(anio) ? 28 : dia
  return `${anio}-${m[2]}-${String(d).padStart(2, '0')}`
}

/** Los años que cumple ese día (null si el año de nacimiento no tiene sentido). */
export function edadQueCumple(fechanacimiento: string | null | undefined, anio: number): number | null {
  const m = FECHA.exec(fechanacimiento || '')
  if (!m) return null
  const edad = anio - Number(m[1])
  return edad > 0 && edad < 120 ? edad : null
}

/** Cumpleaños por día ('YYYY-MM-DD') entre `desde` y `hasta`, ambos incluidos. */
export function cumpleanosEnRango<C extends ConNacimiento>(clientes: C[], desde: string, hasta: string): Record<string, Cumple<C>[]> {
  const out: Record<string, Cumple<C>[]> = {}
  const a0 = Number(desde.slice(0, 4)), a1 = Number(hasta.slice(0, 4))
  for (const c of clientes) {
    for (let anio = a0; anio <= a1; anio++) {
      const dia = cumpleEn(c.fechanacimiento, anio)
      if (dia && dia >= desde && dia <= hasta) (out[dia] ||= []).push({ cliente: c, edad: edadQueCumple(c.fechanacimiento, anio) })
    }
  }
  return out
}

/** ¿Es hoy su cumpleaños? */
export function esSuCumple(fechanacimiento: string | null | undefined, hoy: string): boolean {
  return cumpleEn(fechanacimiento, Number(hoy.slice(0, 4))) === hoy
}

export function textoFelicitacion(nombre: string): string {
  return `¡Feliz cumpleaños, ${nombre.trim() || 'campeón'}! 🎂 Que lo disfrutes mucho. Gracias por confiar en mí: a por un año más de entrenos y de marcas 💪`
}
