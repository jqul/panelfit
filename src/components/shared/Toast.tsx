import { useState, useCallback, useEffect } from 'react'

interface Toast {
  id: number
  message: string
  type?: 'ok' | 'warn' | 'info'
}

let toastFn: ((msg: string, type?: Toast['type']) => void) | null = null

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  let nextId = 0

  const show = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  useEffect(() => { toastFn = show }, [show])

  return { toasts, show }
}

export function toast(message: string, type?: 'ok' | 'warn' | 'info') {
  toastFn?.(message, type)
}

export function ToastContainer({ toasts }: { toasts: ReturnType<typeof useToast>['toasts'] }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`animate-slide-up px-4 py-3 rounded-xl text-sm font-medium shadow-lg border
            ${t.type === 'ok'   ? 'bg-ok text-white border-ok/20' :
              t.type === 'warn' ? 'bg-warn text-white border-warn/20' :
                                  'bg-ink text-card border-ink/20'}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
