import { ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Ancho máximo del cuadro (dialog) o del panel (drawer), p. ej. 'max-w-2xl'. */
  maxWidth?: string
  /**
   * dialog: cuadro centrado para acciones rápidas (en móvil sube desde abajo).
   * drawer: panel lateral a pantalla completa en altura, para formularios y
   * listas largas (en móvil ocupa toda la pantalla).
   */
  variant?: 'dialog' | 'drawer'
  /** Sin relleno en el cuerpo, para contenido que ya trae sus propios márgenes. */
  bare?: boolean
  /** Pie fijo (botón de confirmar) que no se va con el scroll. */
  footer?: ReactNode
  /** Nombre accesible cuando no hay title (el contenido trae su propia cabecera). */
  ariaLabel?: string
  /**
   * Solo el marco (portal, Esc, foco, aria, radio y altura máxima): sin cabecera, cuerpo ni pie.
   * El contenido trae los suyos; sirve para diálogos que ya tenían su cabecera propia.
   */
  plain?: boolean
}

// Los max-w de Tailwind que se usan; como estilo en línea para el panel lateral
// no hace falta que Tailwind vea la clase.
const WIDTHS: Record<string, string> = {
  'max-w-sm': '24rem', 'max-w-md': '28rem', 'max-w-lg': '32rem', 'max-w-xl': '36rem', 'max-w-2xl': '42rem', 'max-w-3xl': '48rem',
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md', variant = 'dialog', bare = false, footer, ariaLabel, plain = false }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // onClose suele llegar como función nueva en cada render; si el efecto dependiera
  // de ella, se reejecutaría en cada tecla y le quitaría el foco al campo.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const previouslyFocused = document.activeElement as HTMLElement | null
    // El foco entra en el panel: Esc funciona y los lectores de pantalla lo anuncian.
    // Si hay un campo con autoFocus, se respeta.
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current() } }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  // Se pinta en el body: dentro de un contenedor con animación (transform) un elemento
  // fixed se coloca respecto a él y no a la pantalla, y el panel no la cubría. Los
  // eventos de React suben por el portal hasta los padres, así que se cortan aquí.
  const overlayClick = (e: React.MouseEvent) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose() }

  const header = title && (
    <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border flex-shrink-0"
      style={variant === 'drawer' ? { paddingTop: 'max(1rem, env(safe-area-inset-top))' } : undefined}>
      <h3 id={titleId} className="text-lg font-serif font-bold">{title}</h3>
      <button onClick={onClose} aria-label="Cerrar" className="p-2 -mr-2 rounded-lg hover:bg-bg-alt text-muted hover:text-ink transition-colors"><X className="w-4 h-4" /></button>
    </div>
  )
  const body = <div className={`${bare ? '' : 'p-5 sm:p-6'} overflow-y-auto flex-1 min-h-0`}>{children}</div>
  const foot = footer && (
    <div className="px-5 sm:px-6 py-4 border-t border-border flex-shrink-0 bg-card" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>{footer}</div>
  )
  const aria = { role: 'dialog', 'aria-modal': true, 'aria-labelledby': title ? titleId : undefined, 'aria-label': title ? undefined : ariaLabel, tabIndex: -1 } as const

  if (variant === 'drawer') {
    return createPortal(
      <div className="fixed inset-0 z-50 flex justify-end bg-ink/60 backdrop-blur-sm animate-fade-in"
        onClick={overlayClick}>
        <div ref={panelRef} {...aria}
          className="bg-card w-full h-[100dvh] sm:border-l border-border shadow-2xl animate-slide-in-right flex flex-col overflow-hidden outline-none"
          style={{ maxWidth: WIDTHS[maxWidth] || '28rem' }}>
          {plain ? children : <>{header}{body}{foot}</>}
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-ink/60 backdrop-blur-sm animate-fade-in"
      onClick={overlayClick}>
      <div ref={panelRef} {...aria}
        className={`bg-card w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl animate-slide-up flex flex-col overflow-hidden outline-none`}
        style={{ maxHeight: '88dvh' }}>
        {plain ? children : <>{header}{body}{foot}</>}
      </div>
    </div>,
    document.body
  )
}
