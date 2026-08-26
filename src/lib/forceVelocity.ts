// Perfil Fuerza-Velocidad (Samozino / Morin) — método simplificado de campo
// (Samozino et al. 2008 "A simple method for measuring force, velocity and
// power output during squat jump", J Biomech; Jiménez-Reyes et al. 2017).
// No requiere plataforma de fuerza: a partir de la altura de un salto y la
// distancia de empuje (extensión de piernas durante el impulso), se estima
// la fuerza y velocidad medias de ese salto. Repitiendo el salto con varias
// cargas externas (peso corporal, +20%, +40%...) se obtiene un perfil
// completo por regresión lineal — mismo principio que el perfil
// carga-velocidad de VBT en strength.ts, aplicado al salto en vez de a la
// barra.
//
// Derivación de las fórmulas (por si hace falta auditarlas):
// En el impulso, suponiendo aceleración media constante desde el reposo a
// lo largo de la distancia de empuje Dpo hasta alcanzar la velocidad de
// despegue v_to:
//   v_to² = 2·a_media·Dpo  →  a_media = v_to²/(2·Dpo)
//   F_media = M·(g + a_media) = M·g·(1 + h/Dpo)     [usando v_to²=2·g·h]
// La velocidad MEDIA durante el impulso (no la de despegue) para una
// aceleración constante desde el reposo es la media de la inicial (0) y la
// final (v_to): v_media = v_to/2 = √(2·g·h)/2 = √(g·h/2) (álgebra idéntica).
export const G = 9.81 // m/s²

export interface FVTrialInput {
  totalMassKg: number      // peso corporal + carga externa en el momento del salto
  jumpHeightM: number      // altura del salto (m) — por vuelo o vídeo
  pushoffDistanceM: number // distancia de extensión de piernas durante el impulso (m)
}

export interface FVPoint { force: number; velocity: number; power: number }

/** Fuerza y velocidad medias durante el impulso de UN salto, por el método
 * simplificado de Samozino. Ninguna de las tres medidas puede ser 0 o
 * negativa — sin altura o sin distancia de empuje no hay nada que calcular. */
export function computeTrialFV({ totalMassKg, jumpHeightM, pushoffDistanceM }: FVTrialInput): FVPoint | null {
  if (!totalMassKg || totalMassKg <= 0 || !jumpHeightM || jumpHeightM <= 0 || !pushoffDistanceM || pushoffDistanceM <= 0) return null
  const velocity = Math.sqrt(G * jumpHeightM / 2)
  const force = totalMassKg * G * (jumpHeightM / pushoffDistanceM + 1)
  return {
    force: Math.round(force * 10) / 10,
    velocity: Math.round(velocity * 100) / 100,
    power: Math.round(force * velocity * 10) / 10,
  }
}

export interface FVRawTrial extends FVTrialInput { loadKg: number }

export interface FVProfile {
  F0: number | null   // fuerza máxima teórica (N), extrapolada a velocidad 0
  V0: number | null   // velocidad máxima teórica (m/s), extrapolada a fuerza 0
  Sfv: number | null  // pendiente F-V (N por m/s) — negativa; cuanto más pronunciada, perfil más "orientado a fuerza"
  Pmax: number | null // potencia máxima teórica (W) = F0·V0/4
  loads: number        // nº de cargas externas distintas usadas para el ajuste
}

const emptyProfile = (loads: number): FVProfile => ({ F0: null, V0: null, Sfv: null, Pmax: null, loads })

/**
 * Ajusta la recta F = F0 + Sfv·v por mínimos cuadrados sobre un conjunto de
 * puntos (fuerza, velocidad) ya calculados, y extrapola F0, V0 y Pmax.
 * Separada de fitForceVelocityProfile para poder testear la regresión con
 * números limpios, sin pasar por la física del salto.
 */
export function fitFVProfileFromPoints(points: { force: number; velocity: number }[]): FVProfile {
  if (points.length < 2) return emptyProfile(points.length)
  const n = points.length
  const sumV = points.reduce((a, p) => a + p.velocity, 0)
  const sumF = points.reduce((a, p) => a + p.force, 0)
  const sumVV = points.reduce((a, p) => a + p.velocity * p.velocity, 0)
  const sumVF = points.reduce((a, p) => a + p.velocity * p.force, 0)
  const denom = n * sumVV - sumV * sumV
  if (denom === 0) return emptyProfile(n)

  const Sfv = (n * sumVF - sumV * sumF) / denom
  const F0 = (sumF - Sfv * sumV) / n
  // Una pendiente positiva o una F0 negativa no tienen sentido fisiológico —
  // señal de datos insuficientes/ruidosos, mejor no dar un perfil a inventar uno.
  if (F0 <= 0 || Sfv >= 0) return emptyProfile(n)

  const V0 = -F0 / Sfv
  const Pmax = (F0 * V0) / 4
  return {
    F0: Math.round(F0 * 10) / 10,
    V0: Math.round(V0 * 100) / 100,
    Sfv: Math.round(Sfv * 10) / 10,
    Pmax: Math.round(Pmax),
    loads: n,
  }
}

/**
 * Perfil Fuerza-Velocidad completo a partir de varios saltos (posiblemente
 * repetidos) a distintas cargas externas. Si hay varios saltos a la misma
 * carga, se promedian (cada carga cuenta una vez en el ajuste — igual que en
 * el perfil carga-velocidad de VBT). Requiere al menos 2 cargas distintas.
 */
export function fitForceVelocityProfile(trials: FVRawTrial[]): FVProfile {
  const byLoad = new Map<number, FVPoint[]>()
  trials.forEach(t => {
    const p = computeTrialFV(t)
    if (!p) return
    const arr = byLoad.get(t.loadKg) || []
    arr.push(p)
    byLoad.set(t.loadKg, arr)
  })
  const points = [...byLoad.values()].map(pts => ({
    force: pts.reduce((a, p) => a + p.force, 0) / pts.length,
    velocity: pts.reduce((a, p) => a + p.velocity, 0) / pts.length,
  }))
  return fitFVProfileFromPoints(points)
}

/** Potencia máxima relativa al peso corporal (W/kg) — más comparable entre
 * atletas de distinta masa que la potencia absoluta. */
export function relativePower(pmaxW: number | null, bodyMassKg: number): number | null {
  if (pmaxW === null || !bodyMassKg) return null
  return Math.round((pmaxW / bodyMassKg) * 10) / 10
}
