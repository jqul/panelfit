import { useState } from 'react'

// Ejercicios que el cliente sigue (favoritos): salen primero en el historial por ejercicio y con su tendencia en el
// resumen de Progreso. Se guardan en el dispositivo por nombre (como el resto del plan), sin distinguir mayúsculas.

const CLAVE = 'pf_ejercicios_favoritos'

export function leerFavoritos(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

export const esFavorito = (favs: string[], nombre: string) => favs.some(f => f.toLowerCase() === nombre.trim().toLowerCase())

/** Lo marca o lo desmarca y devuelve la lista nueva. */
export function alternarFavorito(favs: string[], nombre: string): string[] {
  const n = nombre.trim()
  const nueva = esFavorito(favs, n) ? favs.filter(f => f.toLowerCase() !== n.toLowerCase()) : [...favs, n]
  try { localStorage.setItem(CLAVE, JSON.stringify(nueva)) } catch { /* sin almacenamiento: dura lo que la pestaña */ }
  return nueva
}

export function useFavoritos() {
  const [favs, setFavs] = useState<string[]>(leerFavoritos)
  return { favs, esFav: (n: string) => esFavorito(favs, n), alternar: (n: string) => setFavs(f => alternarFavorito(f, n)) }
}
