import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

interface ActionMenuProps {
  children: ReactNode
  title?: string
}

// Menú de "..." que se pinta con un portal en <body> en vez de dentro de la
// fila que lo abre — necesario porque las filas suelen llevar overflow-hidden
// (para las esquinas redondeadas), que recorta cualquier hijo posicionado en
// absolute aunque tenga un z-index alto. Se cierra solo al pulsar cualquier
// acción de dentro (el wrapper intercepta el click) o al hacer scroll/resize.
export function ActionMenu({ children, title = 'Más acciones' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={toggle} title={title} className="p-1.5 text-muted hover:text-ink rounded-lg">
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {open && pos && createPortal(
        <>
          <button className="fixed inset-0 z-[100] cursor-default" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="fixed z-[101] w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden py-1"
            style={{ top: pos.top, right: pos.right }}
            onClick={() => setOpen(false)}>
            {children}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
