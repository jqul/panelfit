import { PROGRAMAS_PANELFIT, NIVELES_PROGRAMA, OBJETIVOS_PROGRAMA, type StarterTemplate, type NivelPrograma, type ObjetivoPrograma } from './starterTemplates'

// «¿Cuál le va mejor?»: cuatro respuestas (días, nivel, objetivo y dónde entrena) y los programas de PanelFit que mejor
// encajan, cada uno con el porqué. Puntúa cada programa: días (lo que más pesa: no sirve un plan de 5 días a quien
// puede ir 2), objetivo y nivel; sin material de gimnasio, solo vale el de casa.

export type Lugar = 'gimnasio' | 'casa'
export interface Respuestas { dias: number; nivel: NivelPrograma; objetivo: ObjetivoPrograma; lugar: Lugar }
export interface Recomendacion { programa: StarterTemplate; puntos: number; motivos: string[] }

const SIN_MAQUINAS = new Set(['casa-3'])
const ORDEN_NIVEL: NivelPrograma[] = ['principiante', 'intermedio', 'avanzado']
const label = <T extends string>(xs: { id: T; label: string }[], id: T) => xs.find(x => x.id === id)?.label.toLowerCase() ?? id

export function recomendarProgramas(r: Respuestas, lista: StarterTemplate[] = PROGRAMAS_PANELFIT, cuantos = 3): Recomendacion[] {
  const recs: Recomendacion[] = []
  for (const p of lista) {
    if (r.lugar === 'casa' && !SIN_MAQUINAS.has(p.key)) continue
    const motivos: string[] = []
    let puntos = 0
    // Días: igual, lo mejor; uno menos también cabe; más de los que puede, no
    if (p.dias === r.dias) { puntos += 4; motivos.push(`${p.dias} días, los que puede entrenar`) }
    else if (p.dias === r.dias - 1) { puntos += 2; motivos.push(`${p.dias} días: le queda uno libre`) }
    else if (p.dias > r.dias) continue
    else puntos += 0.5
    if (p.objetivo === r.objetivo) { puntos += 3; motivos.push(`pensado para ${label(OBJETIVOS_PROGRAMA, p.objetivo)}`) }
    const dn = Math.abs(ORDEN_NIVEL.indexOf(p.nivel) - ORDEN_NIVEL.indexOf(r.nivel))
    if (dn === 0) { puntos += 2; motivos.push(`nivel ${label(NIVELES_PROGRAMA, p.nivel)}`) }
    else if (dn === 1) puntos += 0.5
    else continue // de principiante a avanzado (o al revés) no
    if (r.lugar === 'casa') motivos.push('sin máquinas, con mancuernas')
    recs.push({ programa: p, puntos, motivos })
  }
  return recs.sort((a, b) => b.puntos - a.puntos || a.programa.dias - b.programa.dias).slice(0, cuantos)
}
