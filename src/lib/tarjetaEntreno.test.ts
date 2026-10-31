import { describe, it, expect } from 'vitest'
import { lineasTarjeta, textoTarjeta } from './tarjetaEntreno'

describe('lineasTarjeta', () => {
  it('la mejor serie hecha de cada ejercicio; sin peso, cuántas series; sin nada hecho, fuera', () => {
    expect(lineasTarjeta([
      { name: 'Press banca', sets: [{ weight: '80', reps: '5', done: true }, { weight: '82,5', reps: '4', done: true }, { weight: '90', reps: '1', done: false }] },
      { name: 'Dominadas', sets: [{ weight: '', reps: '8', done: true }, { weight: '', reps: '7', done: true }] },
      { name: 'Curl', sets: [{ weight: '12', reps: '10', done: false }] },
    ])).toEqual([
      { name: 'Press banca', detalle: '82,5×4' },
      { name: 'Dominadas', detalle: '2 series' },
    ])
  })
})

describe('textoTarjeta', () => {
  it('acompaña a la imagen al compartir', () => {
    const t = textoTarjeta({ titulo: 'Día A', fecha: new Date(2026, 9, 31), duracion: '52:10', volumen: 4210.4, series: 14, ejercicios: [], records: [{ name: 'Press banca', best: 85 }] })
    expect(t).toContain('Día A')
    expect(t).toContain('4210 kg')
    expect(t).toContain('14 series')
    expect(t).toContain('Press banca (85 kg)')
  })
})
