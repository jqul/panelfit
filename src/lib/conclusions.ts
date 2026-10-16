// Convierte los números de cada cliente en frases que se pueden leer en tres
// segundos ("3 clientes llevan más de 7 días sin entrenar") y con los nombres
// de los afectados. Lo comparten Insights y Adherencia.

export interface ConclusionRow {
  id: string
  name: string
  adherencia7: number      // % de días entrenados en los últimos 7
  diasSinEntrenar: number  // 999 = nunca ha entrenado
  racha: number
  mejora: number           // días entrenados esta semana menos la anterior
  esNuevo: boolean         // dado de alta hace pocos días: no cuenta como "inactivo"
}

export interface Conclusion {
  tone: 'bad' | 'warn' | 'ok'
  text: string
  names: string[]
  extra: number            // afectados que no caben en `names`
}

const MAX_NAMES = 4

function pick(rows: ConclusionRow[]): Pick<Conclusion, 'names' | 'extra'> {
  return { names: rows.slice(0, MAX_NAMES).map(r => r.name), extra: Math.max(0, rows.length - MAX_NAMES) }
}

function plural(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios
}

export function buildConclusions(rows: ConclusionRow[]): Conclusion[] {
  const out: Conclusion[] = []
  const activos = rows.filter(r => !r.esNuevo)

  const criticos = activos.filter(r => r.diasSinEntrenar >= 7).sort((a, b) => b.diasSinEntrenar - a.diasSinEntrenar)
  if (criticos.length) {
    out.push({
      tone: 'bad', ...pick(criticos),
      text: `${criticos.length} ${plural(criticos.length, 'cliente lleva', 'clientes llevan')} más de 7 días sin entrenar`,
    })
  }

  const ids = new Set(criticos.map(r => r.id))
  const riesgo = activos.filter(r => !ids.has(r.id) && r.diasSinEntrenar >= 3).sort((a, b) => b.diasSinEntrenar - a.diasSinEntrenar)
  if (riesgo.length) {
    out.push({
      tone: 'warn', ...pick(riesgo),
      text: `${riesgo.length} ${plural(riesgo.length, 'cliente lleva', 'clientes llevan')} entre 3 y 6 días sin entrenar`,
    })
  }

  const enRiesgoIds = new Set([...criticos, ...riesgo].map(r => r.id))
  const caida = activos.filter(r => !enRiesgoIds.has(r.id) && r.mejora <= -2).sort((a, b) => a.mejora - b.mejora)
  if (caida.length) {
    out.push({
      tone: 'warn', ...pick(caida),
      text: `${caida.length} ${plural(caida.length, 'cliente ha entrenado', 'clientes han entrenado')} bastante menos que la semana pasada`,
    })
  }

  const racha = rows.filter(r => r.racha >= 3).sort((a, b) => b.racha - a.racha)
  if (racha.length) {
    out.push({
      tone: 'ok', ...pick(racha),
      text: `${racha.length} ${plural(racha.length, 'cliente está', 'clientes están')} en racha de 3 días o más`,
    })
  }

  const mejoran = rows.filter(r => r.mejora >= 1).sort((a, b) => b.mejora - a.mejora)
  if (mejoran.length) {
    out.push({
      tone: 'ok', ...pick(mejoran),
      text: `${mejoran.length} ${plural(mejoran.length, 'cliente entrena', 'clientes entrenan')} más que la semana pasada`,
    })
  }

  if (!out.some(c => c.tone !== 'ok') && activos.length) {
    out.unshift({ tone: 'ok', names: [], extra: 0, text: 'Todos tus clientes van al día' })
  }
  return out
}

// Rankings para Adherencia: quiénes lo hacen mejor y quiénes necesitan que
// les escribas hoy. Los clientes nuevos no entran en "atención" (aún no han
// tenido tiempo de empezar).
export function rankAdherence<T extends ConclusionRow>(rows: T[], limit = 3): { mejores: T[]; atencion: T[]; media: number } {
  const media = rows.length ? Math.round(rows.reduce((a, r) => a + r.adherencia7, 0) / rows.length) : 0
  const necesitanAtencion = rows
    .filter(r => !r.esNuevo && (r.diasSinEntrenar >= 3 || r.mejora <= -2))
    .sort((a, b) => b.diasSinEntrenar - a.diasSinEntrenar || a.adherencia7 - b.adherencia7)
  const atencion = necesitanAtencion.slice(0, limit)
  // Quien cumple el criterio de atención no puede salir entre los mejores,
  // aunque no quepa en el top de atención: sería un mensaje contradictorio.
  const enAtencion = new Set(necesitanAtencion.map(r => r.id))
  const mejores = rows
    .filter(r => !enAtencion.has(r.id) && r.adherencia7 > 0)
    .sort((a, b) => b.adherencia7 - a.adherencia7 || b.racha - a.racha)
    .slice(0, limit)
  return { mejores, atencion, media }
}
