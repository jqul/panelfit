// Fatiga neuromuscular por caída de salto: compara el último resultado de un
// test de salto (CMJ, Drop Jump/RSI...) contra su línea base reciente. Una
// caída real (no el ruido normal de medir día a día) es uno de los
// indicadores más directos de fatiga del sistema nervioso central — a veces
// se nota ahí antes que en el cuestionario de sensaciones subjetivo, porque
// no depende de que el atleta sepa "leerse" a sí mismo.
//
// Umbral del 8%: rango 8-10% habitual en la literatura de monitorización por
// salto para señalar fatiga neuromuscular relevante (Gathercole et al. 2015;
// Claudino et al. 2017, revisión sobre CMJ como marcador de fatiga).

export interface JumpResultado { testId: string; testName: string; valor: number; fecha: string }

export interface JumpFatigueSignal {
  hasData: boolean
  testName: string | null
  latest: number | null
  latestDate: string | null
  baseline: number | null  // media móvil de las mediciones previas (excluyendo la última)
  dropPct: number | null   // % de caída de la última frente a la línea base (positivo = ha bajado)
  isDrop: boolean
}

const DROP_THRESHOLD_PCT = 8
const MIN_BASELINE_SAMPLES = 2 // con menos de esto no hay línea base fiable todavía
const BASELINE_WINDOW = 5       // nº de mediciones previas que forman la línea base móvil

const EMPTY: JumpFatigueSignal = { hasData: false, testName: null, latest: null, latestDate: null, baseline: null, dropPct: null, isDrop: false }

/** Señal de fatiga para UN test de salto concreto (ya filtrado a un test_id). */
export function computeJumpFatigue(resultados: JumpResultado[]): JumpFatigueSignal {
  if (resultados.length < MIN_BASELINE_SAMPLES + 1) return EMPTY
  const sorted = [...resultados].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const latestEntry = sorted[sorted.length - 1]
  const baselineEntries = sorted.slice(0, -1).slice(-BASELINE_WINDOW)
  const baseline = baselineEntries.reduce((a, e) => a + e.valor, 0) / baselineEntries.length
  if (baseline <= 0) return EMPTY
  const dropPct = Math.round(((baseline - latestEntry.valor) / baseline) * 1000) / 10
  return {
    hasData: true,
    testName: latestEntry.testName,
    latest: latestEntry.valor,
    latestDate: latestEntry.fecha,
    baseline: Math.round(baseline * 10) / 10,
    dropPct,
    isDrop: dropPct >= DROP_THRESHOLD_PCT,
  }
}

/**
 * Un cliente puede tener varios tests de salto (CMJ, Drop Jump...) — se
 * calcula cada uno por separado y se queda la señal más alarmante (mayor
 * caída), igual que worseAcwr hace con tonelaje vs sRPE.
 */
export function worstJumpFatigue(resultadosPorTest: JumpResultado[][]): JumpFatigueSignal {
  let worst = EMPTY
  for (const rows of resultadosPorTest) {
    const signal = computeJumpFatigue(rows)
    if (!signal.hasData) continue
    if (!worst.hasData || (signal.dropPct ?? -Infinity) > (worst.dropPct ?? -Infinity)) worst = signal
  }
  return worst
}
