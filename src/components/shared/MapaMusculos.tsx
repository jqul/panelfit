// Mapa de músculos: una figura sencilla de frente y de espaldas (dibujo propio, formas básicas) donde se iluminan los
// grupos musculares de PanelFit (los de getMuscleGroup). `intensidad` va de 0 a 1 por grupo: 1 es el color lleno.
// Lo usan la ficha del ejercicio (el grupo que trabaja) y Músculos del entrenador (series de las últimas semanas).

export type GrupoMuscular = 'Pecho' | 'Espalda' | 'Hombros' | 'Bíceps' | 'Tríceps' | 'Core' | 'Glúteos' | 'Piernas'

type Forma = { g: GrupoMuscular } & ({ t: 'r'; x: number; y: number; w: number; h: number; r?: number } | { t: 'e'; cx: number; cy: number; rx: number; ry: number })

// Coordenadas en una caja de 100 × 200 por figura
const FRENTE: Forma[] = [
  { g: 'Hombros', t: 'e', cx: 29, cy: 46, rx: 7, ry: 6 }, { g: 'Hombros', t: 'e', cx: 71, cy: 46, rx: 7, ry: 6 },
  { g: 'Pecho', t: 'r', x: 34, y: 44, w: 15, h: 16, r: 5 }, { g: 'Pecho', t: 'r', x: 51, y: 44, w: 15, h: 16, r: 5 },
  { g: 'Bíceps', t: 'r', x: 21, y: 54, w: 9, h: 22, r: 4.5 }, { g: 'Bíceps', t: 'r', x: 70, y: 54, w: 9, h: 22, r: 4.5 },
  { g: 'Core', t: 'r', x: 39, y: 62, w: 22, h: 30, r: 5 },
  { g: 'Piernas', t: 'r', x: 34, y: 102, w: 14, h: 42, r: 7 }, { g: 'Piernas', t: 'r', x: 52, y: 102, w: 14, h: 42, r: 7 },
  { g: 'Piernas', t: 'r', x: 36, y: 150, w: 10, h: 30, r: 5 }, { g: 'Piernas', t: 'r', x: 54, y: 150, w: 10, h: 30, r: 5 },
]
const ESPALDA: Forma[] = [
  { g: 'Hombros', t: 'e', cx: 29, cy: 46, rx: 7, ry: 6 }, { g: 'Hombros', t: 'e', cx: 71, cy: 46, rx: 7, ry: 6 },
  { g: 'Espalda', t: 'r', x: 35, y: 42, w: 30, h: 36, r: 7 },
  { g: 'Tríceps', t: 'r', x: 21, y: 54, w: 9, h: 22, r: 4.5 }, { g: 'Tríceps', t: 'r', x: 70, y: 54, w: 9, h: 22, r: 4.5 },
  { g: 'Core', t: 'r', x: 40, y: 80, w: 20, h: 10, r: 4 },
  { g: 'Glúteos', t: 'e', cx: 42, cy: 100, rx: 8, ry: 8 }, { g: 'Glúteos', t: 'e', cx: 58, cy: 100, rx: 8, ry: 8 },
  { g: 'Piernas', t: 'r', x: 34, y: 110, w: 14, h: 34, r: 7 }, { g: 'Piernas', t: 'r', x: 52, y: 110, w: 14, h: 34, r: 7 },
  { g: 'Piernas', t: 'r', x: 36, y: 150, w: 10, h: 30, r: 5 }, { g: 'Piernas', t: 'r', x: 54, y: 150, w: 10, h: 30, r: 5 },
]

// La silueta: cabeza, tronco, brazos y piernas
function Silueta() {
  return (
    <g fill="var(--color-bg-alt)" stroke="var(--color-border)" strokeWidth="1">
      <circle cx="50" cy="22" r="11" />
      <rect x="31" y="38" width="38" height="58" rx="12" />
      <rect x="19" y="42" width="13" height="56" rx="6.5" /><rect x="68" y="42" width="13" height="56" rx="6.5" />
      <rect x="32" y="92" width="17" height="94" rx="8" /><rect x="51" y="92" width="17" height="94" rx="8" />
    </g>
  )
}

function Figura({ formas, intensidad, titulo, dx }: { formas: Forma[]; intensidad: Partial<Record<GrupoMuscular, number>>; titulo: string; dx: number }) {
  return (
    <g transform={`translate(${dx} 0)`}>
      <Silueta />
      {formas.map((f, i) => {
        const v = Math.max(0, Math.min(1, intensidad[f.g] ?? 0))
        if (!v) return null
        const p = { key: i, fill: 'var(--color-accent)', fillOpacity: 0.25 + v * 0.75, 'data-grupo': f.g }
        return f.t === 'r'
          ? <rect {...p} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.r ?? 3} />
          : <ellipse {...p} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} />
      })}
      <text x="50" y="198" textAnchor="middle" fontSize="9" fill="var(--color-muted)">{titulo}</text>
    </g>
  )
}

export function MapaMusculos({ intensidad, className = 'w-40' }: { intensidad: Partial<Record<GrupoMuscular, number>>; className?: string }) {
  const activos = (Object.entries(intensidad) as [GrupoMuscular, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([g]) => g)
  return (
    <svg viewBox="0 0 210 202" className={className} role="img"
      aria-label={activos.length ? `Músculos trabajados: ${activos.join(', ')}` : 'Mapa de músculos sin ningún grupo trabajado'}>
      <Figura formas={FRENTE} intensidad={intensidad} titulo="Frente" dx={0} />
      <Figura formas={ESPALDA} intensidad={intensidad} titulo="Espalda" dx={110} />
    </svg>
  )
}

/** Normaliza unas cantidades por grupo (series, por ejemplo) a 0-1, con el mayor en 1. Ignora los que no tienen dibujo. */
export function intensidadPorGrupo(cantidades: Record<string, number>): Partial<Record<GrupoMuscular, number>> {
  const validos: GrupoMuscular[] = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Core', 'Glúteos', 'Piernas']
  const max = Math.max(0, ...validos.map(g => cantidades[g] || 0))
  if (!max) return {}
  return Object.fromEntries(validos.filter(g => cantidades[g] > 0).map(g => [g, Math.round((cantidades[g] / max) * 100) / 100]))
}
