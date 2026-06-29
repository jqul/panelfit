// Silueta corporal simplificada que resalta la zona muscular trabajada,
// para identificar de un vistazo qué grupo entrena cada ejercicio
// (front = vista de frente, back = vista de espalda).
interface Region { view: 'front' | 'back'; cx: number; cy: number; rx: number; ry: number }

const REGIONS: Record<string, Region> = {
  'Pecho':                 { view: 'front', cx: 50, cy: 38, rx: 17, ry: 12 },
  'Espalda':               { view: 'back',  cx: 50, cy: 45, rx: 18, ry: 28 },
  'Hombro':                { view: 'front', cx: 50, cy: 26, rx: 22, ry: 8 },
  'Hombros':               { view: 'front', cx: 50, cy: 26, rx: 22, ry: 8 },
  'Bíceps':                { view: 'front', cx: 50, cy: 50, rx: 20, ry: 10 },
  'Tríceps':               { view: 'back',  cx: 50, cy: 50, rx: 20, ry: 10 },
  'Antebrazo':             { view: 'front', cx: 50, cy: 68, rx: 22, ry: 9 },
  'Piernas':               { view: 'front', cx: 50, cy: 88, rx: 17, ry: 28 },
  'Glúteo':                { view: 'back',  cx: 50, cy: 64, rx: 16, ry: 9 },
  'Glúteos':               { view: 'back',  cx: 50, cy: 64, rx: 16, ry: 9 },
  'Core':                  { view: 'front', cx: 50, cy: 58, rx: 13, ry: 14 },
  'Cardio':                { view: 'front', cx: 50, cy: 38, rx: 17, ry: 12 },
  'Funcional/Olímpico':    { view: 'front', cx: 50, cy: 55, rx: 26, ry: 30 },
}

function BodyOutline() {
  return (
    <>
      <circle cx="50" cy="10" r="8" fill="none" />
      <path d="M50 18 C30 18 22 28 22 42 L22 70 C22 78 26 84 32 88 L32 120 L42 120 L44 92 L56 92 L58 120 L68 120 L68 88 C74 84 78 78 78 70 L78 42 C78 28 70 18 50 18 Z" fill="none" />
    </>
  )
}

export function MuscleDiagram({ category, size = 30 }: { category?: string; size?: number }) {
  const region = category ? REGIONS[category] : undefined
  if (!region) return null

  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 100 130" className="flex-shrink-0">
      <g stroke="currentColor" strokeWidth="2.5" className="text-border" opacity="0.6">
        <BodyOutline />
      </g>
      <ellipse cx={region.cx} cy={region.cy} rx={region.rx} ry={region.ry} className="fill-accent" opacity="0.55" />
      <text x="50" y="128" textAnchor="middle" fontSize="9" className="fill-muted">
        {region.view === 'front' ? 'frontal' : 'espalda'}
      </text>
    </svg>
  )
}
