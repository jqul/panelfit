// Datos básicos del cliente en su registro: género, fecha de nacimiento, altura y peso. Sin React ni red: valida lo que escribe antes de enviarlo.
// La base de datos vuelve a validarlo con los mismos límites (migración 20261122000010, `cliente_guardar_datos_basicos`) y es quien manda; aquí solo se evita
// mandar algo que se sabe que va a rechazar y se explica qué falla. El género es opcional («prefiero no decirlo»); lo demás es obligatorio.

export type Genero = '' | 'h' | 'm'
export interface DatosBasicos { genero: Genero; nacimiento: string; altura: string; peso: string }
export const DATOS_BASICOS_VACIOS: DatosBasicos = { genero: '', nacimiento: '', altura: '', peso: '' }

/** Mismos límites que la base de datos. */
export const LIMITES_BASICOS = { alturaMin: 100, alturaMax: 250, pesoMin: 20, pesoMax: 400, edadMin: 10, edadMax: 100 } as const

export const OPCIONES_GENERO: { v: Genero; label: string }[] = [
  { v: '', label: 'Prefiero no decirlo' }, { v: 'h', label: 'Hombre' }, { v: 'm', label: 'Mujer' },
]

export type CampoBasico = 'nacimiento' | 'altura' | 'peso'
export interface ResultadoBasicos {
  ok: boolean
  errores: Partial<Record<CampoBasico, string>>
  /** Solo si ok: lo que se envía. */
  valores?: { genero: 'h' | 'm' | null; nacimiento: string; altura: number; peso: number }
}

const numero = (t: string): number | null => {
  const s = t.trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** «YYYY-MM-DD» → fecha local (sin zona: un día es un día), o null si no existe (31 de febrero…). */
function fechaDe(t: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null
}

/** Años cumplidos a `hoy`. */
export function edadEn(nacimiento: Date, hoy: Date): number {
  let e = hoy.getFullYear() - nacimiento.getFullYear()
  if (hoy.getMonth() < nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())) e--
  return e
}

export function validarDatosBasicos(d: DatosBasicos, hoy: Date = new Date()): ResultadoBasicos {
  const errores: ResultadoBasicos['errores'] = {}
  const L = LIMITES_BASICOS

  const nac = d.nacimiento.trim() === '' ? null : fechaDe(d.nacimiento)
  if (d.nacimiento.trim() === '') errores.nacimiento = 'Indica tu fecha de nacimiento'
  else if (!nac) errores.nacimiento = 'La fecha de nacimiento no es válida'
  else {
    // Igual que la base de datos: ni más reciente que hoy menos 10 años ni anterior a hoy menos 100 años (a ese mismo día)
    const max = new Date(hoy.getFullYear() - L.edadMin, hoy.getMonth(), hoy.getDate())
    const min = new Date(hoy.getFullYear() - L.edadMax, hoy.getMonth(), hoy.getDate())
    if (nac > max || nac < min) errores.nacimiento = 'La fecha de nacimiento no es válida'
  }

  const altura = numero(d.altura)
  if (d.altura.trim() === '') errores.altura = 'Indica tu altura'
  else if (altura === null || altura < L.alturaMin || altura > L.alturaMax) errores.altura = `La altura debe estar entre ${L.alturaMin} y ${L.alturaMax} cm`

  const peso = numero(d.peso)
  if (d.peso.trim() === '') errores.peso = 'Indica tu peso'
  else if (peso === null || peso < L.pesoMin || peso > L.pesoMax) errores.peso = `El peso debe estar entre ${L.pesoMin} y ${L.pesoMax} kg`

  if (Object.keys(errores).length) return { ok: false, errores }
  return { ok: true, errores, valores: { genero: d.genero === '' ? null : d.genero, nacimiento: d.nacimiento.trim(), altura: altura as number, peso: peso as number } }
}
