// Silueta corporal simplificada que resalta la zona muscular trabajada,
// para identificar de un vistazo qué grupo entrena cada ejercicio
// (front = vista de frente, back = vista de espalda — el dibujo del
// cuerpo es el mismo en ambas, solo cambia dónde se resalta y la etiqueta).
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

export function MuscleDiagram({ category, size = 30 }: { category?: string; size?: number }) {
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
