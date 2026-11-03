// El aviso (push) que recibe el entrenador cuando su cliente termina una sesión. Si ha batido récords, el aviso es de
// récord (es lo que merece una felicitación); si no, el de siempre de sesión completada. Uno solo, para no duplicar.

export interface AvisoPush { titulo: string; cuerpo: string }

const kg = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })

export function avisoFinSesion(o: { nombre?: string; dia: string; completa: boolean; records: { name: string; best: number }[] }): AvisoPush | null {
  const quien = o.nombre?.trim() || 'Tu cliente'
  if (o.records.length) {
    const n = o.records.length
    return {
      titulo: `🏆 ${quien} ha batido ${n === 1 ? 'un récord' : `${n} récords`}`,
      cuerpo: o.records.slice(0, 3).map(r => `${r.name} ${kg(r.best)} kg`).join(' · ') + (n > 3 ? ` y ${n - 3} más` : ''),
    }
  }
  if (!o.completa) return null
  return { titulo: 'Sesión completada 💪', cuerpo: `${quien}: ${o.dia} terminado` }
}
