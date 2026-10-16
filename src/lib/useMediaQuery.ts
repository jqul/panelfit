import { useEffect, useState } from 'react'

// true mientras se cumple la media query (p. ej. '(min-width: 768px)'); se actualiza
// al redimensionar o girar el dispositivo.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}
