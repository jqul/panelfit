// Mini pictograma tipo "muñeco haciendo el ejercicio" (estilo Hevy) para
// distinguir de un vistazo variaciones del mismo grupo muscular (p.ej.
// sentadilla vs zancada vs peso muerto). Si el nombre no encaja con
// ningún patrón de movimiento conocido, se cae a una silueta genérica
// con la zona muscular resaltada.
type PatternKey =
  | 'squat' | 'hinge' | 'lunge' | 'press_horizontal' | 'press_overhead'
  | 'row' | 'pull_up' | 'curl' | 'triceps_ext' | 'lateral_raise'
  | 'plank' | 'hip_thrust' | 'run'

interface Pose { head: [number, number]; lines: [number, number, number, number][]; bar?: [number, number, number, number] }

const POSES: Record<PatternKey, Pose> = {
  squat: {
    head: [50, 19],
    lines: [
      [49, 25, 53, 53],          // torso
      [53, 53, 35, 67], [35, 67, 47, 89],   // pierna (muslo + espinilla)
      [49, 27, 26, 47],          // brazo extendido al frente
    ],
  },
  hinge: {
    head: [62, 27],
    lines: [
      [59, 33, 50, 55],          // torso inclinado (bisagra de cadera)
      [50, 55, 48, 72], [48, 72, 46, 90],   // pierna
      [59, 33, 45, 75],          // brazo hacia la barra
    ],
  },
  lunge: {
    head: [50, 19],
    lines: [
      [50, 26, 50, 52],          // torso
      [50, 52, 38, 68], [38, 68, 40, 88],   // pierna delantera (flexionada)
      [50, 52, 65, 74], [65, 74, 72, 89],   // pierna trasera (extendida)
      [50, 28, 48, 45],          // brazo
    ],
  },
  press_horizontal: {
    head: [18, 70],
    lines: [
      [26, 70, 60, 70],          // torso tumbado
      [60, 70, 75, 70], [75, 70, 80, 86],   // pierna flexionada
      [28, 70, 28, 50], [28, 50, 28, 33],   // brazo empujando hacia arriba
    ],
  },
  press_overhead: {
    head: [50, 19],
    lines: [
      [50, 26, 50, 55],          // torso
      [48, 55, 45, 88], [52, 55, 56, 88],   // piernas
      [50, 27, 50, 6],           // brazo extendido arriba
    ],
  },
  row: {
    head: [60, 29],
    lines: [
      [58, 35, 52, 57],          // torso inclinado
      [52, 57, 50, 88],          // pierna
      [58, 35, 75, 44], [75, 44, 60, 50],   // brazo tirando (codo atrás)
    ],
  },
  pull_up: {
    head: [50, 39],
    lines: [
      [50, 47, 35, 14], [50, 47, 65, 14],   // brazos en V hasta la barra
      [50, 47, 50, 73],          // torso colgando
      [50, 73, 45, 97], [50, 73, 55, 97],   // piernas
    ],
    bar: [28, 13, 72, 13],
  },
  curl: {
    head: [50, 19],
    lines: [
      [50, 26, 50, 55],          // torso
      [48, 55, 45, 88], [52, 55, 56, 88],   // piernas
      [55, 29, 58, 51], [58, 51, 51, 32],   // brazo curl (codo bajo, mano sube)
    ],
  },
  triceps_ext: {
    head: [50, 19],
    lines: [
      [50, 26, 50, 55],          // torso
      [48, 55, 45, 88], [52, 55, 56, 88],   // piernas
      [50, 27, 60, 17], [60, 17, 62, 34],   // brazo arriba doblado tras la cabeza
    ],
  },
  lateral_raise: {
    head: [50, 17],
    lines: [
      [50, 25, 50, 54],          // torso
      [50, 54, 42, 88], [50, 54, 58, 88],   // piernas
      [50, 26, 20, 26], [50, 26, 80, 26],   // brazos en cruz
    ],
  },
  plank: {
    head: [14, 54],
    lines: [
      [21, 54, 84, 60],          // cuerpo horizontal (tabla)
      [21, 54, 21, 76],          // brazo de apoyo
    ],
  },
  hip_thrust: {
    head: [18, 75],
    lines: [
      [26, 75, 54, 56],          // torso (cadera elevada)
      [54, 56, 69, 75], [69, 75, 77, 91],   // pierna flexionada
      [26, 75, 14, 78],          // brazo apoyado
    ],
  },
  run: {
    head: [44, 19],
    lines: [
      [47, 27, 52, 51],          // torso inclinado
      [52, 51, 45, 67], [45, 67, 35, 71],   // pierna delantera
      [52, 51, 65, 64], [65, 64, 75, 54],   // pierna trasera
      [47, 28, 33, 36], [33, 36, 29, 47],   // brazo atrás
    ],
  },
}

function detectPattern(name: string): PatternKey | null {
  const n = name.toLowerCase()
  if (/sentadilla|squat|sissy/.test(n)) return 'squat'
  if (/peso muerto|deadlift|buenos d[ií]as|good morning/.test(n)) return 'hinge'
  if (/zancada|lunge|step up|step-up|b[uú]lgara/.test(n)) return 'lunge'
  if (/press banca|bench|press declinado|press inclinado|flexion|push-up|push press/.test(n)) return 'press_horizontal'
  if (/press militar|press de hombro|press arnold|press tras nuca|landmine|bradford|press en multipower|press de hombro con kettlebell|cuban press/.test(n)) return 'press_overhead'
  if (/remo|row/.test(n)) return 'row'
  if (/dominada|jal[oó]n|pull-?up|pulldown|chin-up|australian pull/.test(n)) return 'pull_up'
  if (/curl/.test(n) && !/femoral/.test(n)) return 'curl'
  if (/tr[ií]ceps|press franc[eé]s|press jm/.test(n)) return 'triceps_ext'
  if (/elevaci[oó]n lateral|elevaci[oó]n frontal|p[áa]jaros|y-raises/.test(n)) return 'lateral_raise'
  if (/plancha|plank|crunch|russian twist|sit-up|v-ups|ab wheel|rollout|hollow body|dragon flag|pallof/.test(n)) return 'plank'
  if (/hip thrust|puente de gl[uú]teo|glute bridge|frog pump/.test(n)) return 'hip_thrust'
  if (/carrera|sprint|comba|burpee|jumping jack|skipping|bici|cicl|el[ií]ptica|nataci[oó]n|caminata|senderismo/.test(n)) return 'run'
  return null
}

function PoseFigure({ pose }: { pose: Pose }) {
  return (
    <g className="text-accent" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none">
      {pose.bar && <line x1={pose.bar[0]} y1={pose.bar[1]} x2={pose.bar[2]} y2={pose.bar[3]} strokeWidth="4" className="text-border" />}
      {pose.lines.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />)}
      <circle cx={pose.head[0]} cy={pose.head[1]} r="7" fill="currentColor" stroke="none" />
    </g>
  )
}

// ── Silueta genérica con zona resaltada (fallback) ──────────────────
interface Shape { cx: number; cy: number; rx: number; ry: number }
interface Region { view: 'front' | 'back'; shapes: Shape[] }

const REGIONS: Record<string, Region> = {
  'Pecho':              { view: 'front', shapes: [{ cx: 50, cy: 42, rx: 16, ry: 11 }] },
  'Cardio':             { view: 'front', shapes: [{ cx: 50, cy: 42, rx: 16, ry: 11 }] },
  'Espalda':            { view: 'back',  shapes: [{ cx: 50, cy: 47, rx: 17, ry: 21 }] },
  'Hombro':             { view: 'front', shapes: [{ cx: 24, cy: 31, rx: 11, ry: 9 }, { cx: 76, cy: 31, rx: 11, ry: 9 }] },
  'Hombros':            { view: 'front', shapes: [{ cx: 24, cy: 31, rx: 11, ry: 9 }, { cx: 76, cy: 31, rx: 11, ry: 9 }] },
  'Bíceps':             { view: 'front', shapes: [{ cx: 20, cy: 53, rx: 8,  ry: 14 }, { cx: 80, cy: 53, rx: 8,  ry: 14 }] },
  'Tríceps':            { view: 'back',  shapes: [{ cx: 20, cy: 53, rx: 8,  ry: 14 }, { cx: 80, cy: 53, rx: 8,  ry: 14 }] },
  'Antebrazo':          { view: 'front', shapes: [{ cx: 20, cy: 71, rx: 7,  ry: 10 }, { cx: 80, cy: 71, rx: 7,  ry: 10 }] },
  'Core':               { view: 'front', shapes: [{ cx: 50, cy: 59, rx: 13, ry: 13 }] },
  'Piernas':            { view: 'front', shapes: [{ cx: 41, cy: 106, rx: 9, ry: 32 }, { cx: 59, cy: 106, rx: 9, ry: 32 }] },
  'Glúteo':             { view: 'back',  shapes: [{ cx: 50, cy: 69, rx: 18, ry: 9  }] },
  'Glúteos':            { view: 'back',  shapes: [{ cx: 50, cy: 69, rx: 18, ry: 9  }] },
  'Funcional/Olímpico': { view: 'front', shapes: [{ cx: 50, cy: 78, rx: 38, ry: 68 }] },
}

function BodyFigure() {
  return (
    <g className="text-border" fill="currentColor" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
      <circle cx="50" cy="13" r="10" fillOpacity="0.35" />
      <rect x="32" y="26" width="36" height="45" rx="16" fillOpacity="0.3" />
      <rect x="29" y="62" width="42" height="17" rx="12" fillOpacity="0.3" />
      <rect x="14" y="27" width="13" height="51" rx="6.5" fillOpacity="0.3" />
      <rect x="73" y="27" width="13" height="51" rx="6.5" fillOpacity="0.3" />
      <rect x="34" y="73" width="14" height="68" rx="7" fillOpacity="0.3" />
      <rect x="52" y="73" width="14" height="68" rx="7" fillOpacity="0.3" />
    </g>
  )
}

export function MuscleDiagram({ category, name, size = 30 }: { category?: string; name?: string; size?: number }) {
  const pattern = name ? detectPattern(name) : null
  if (pattern) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
        <PoseFigure pose={POSES[pattern]} />
      </svg>
    )
  }

  const region = category ? REGIONS[category] : undefined
  if (!region) return null

  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 100 150" className="flex-shrink-0">
      <BodyFigure />
      {region.shapes.map((s, i) => (
        <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} className="fill-accent" opacity="0.6" />
      ))}
      <text x="50" y="148" textAnchor="middle" fontSize="10" className="fill-muted">
        {region.view === 'front' ? 'frontal' : 'espalda'}
      </text>
    </svg>
  )
}
