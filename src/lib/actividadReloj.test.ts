import { describe, it, expect } from 'vitest'
import { deporteDe, formatoDuracion, parsearGPX, parsearTCX, resumenActividad, ritmoOVelocidad } from './actividadReloj'

const gpx = `<?xml version="1.0"?>
<gpx xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Rodaje suave</name><type>running</type><trkseg>
  <trkpt lat="40.4168" lon="-3.7038"><ele>650</ele><time>2026-11-10T08:00:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>140</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
  <trkpt lat="40.4258" lon="-3.7038"><ele>660</ele><time>2026-11-10T08:05:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>150</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
  <trkpt lat="40.4348" lon="-3.7038"><ele>655</ele><time>2026-11-10T08:10:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>160</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
</trkseg></trk></gpx>`

const tcx = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Biking"><Id>2026-11-10T18:00:00Z</Id>
<Lap StartTime="2026-11-10T18:00:00Z"><TotalTimeSeconds>1800</TotalTimeSeconds><DistanceMeters>12000</DistanceMeters><Calories>300</Calories>
<AverageHeartRateBpm><Value>130</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>160</Value></MaximumHeartRateBpm>
<Track><Trackpoint><AltitudeMeters>100</AltitudeMeters></Trackpoint><Trackpoint><AltitudeMeters>130</AltitudeMeters></Trackpoint></Track></Lap>
<Lap StartTime="2026-11-10T18:30:00Z"><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>3000</DistanceMeters><Calories>100</Calories>
<AverageHeartRateBpm><Value>150</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>170</Value></MaximumHeartRateBpm>
<Track><Trackpoint><AltitudeMeters>120</AltitudeMeters></Trackpoint></Track></Lap>
</Activity></Activities></TrainingCenterDatabase>`

describe('parsearGPX', () => {
  it('suma la distancia punto a punto y saca tiempo, desnivel y pulso', () => {
    const a = parsearGPX(gpx)!
    expect(a.deporte).toBe('correr')
    expect(a.nombre).toBe('Rodaje suave')
    expect(a.inicio).toBe('2026-11-10T08:00:00.000Z')
    expect(a.duracionS).toBe(600)
    expect(a.distanciaM).toBeGreaterThan(1990)   // ~2 km (0,018° de latitud)
    expect(a.distanciaM).toBeLessThan(2010)
    expect(a.desnivelM).toBe(10)
    expect(a).toMatchObject({ fcMedia: 150, fcMax: 160 })
  })
  it('sin puntos, nada', () => {
    expect(parsearGPX('<gpx></gpx>')).toBeNull()
  })
})

describe('parsearTCX', () => {
  it('suma las vueltas y pondera el pulso medio por tiempo', () => {
    const a = parsearTCX(tcx)!
    expect(a).toMatchObject({ deporte: 'bici', duracionS: 2400, distanciaM: 15000, kcal: 400, fcMedia: 135, fcMax: 170, desnivelM: 30 })
    expect(a.inicio).toBe('2026-11-10T18:00:00Z')
  })
})

describe('textos', () => {
  it('deporte por el nombre de cada marca', () => {
    expect(deporteDe('lap_swimming')).toBe('nadar')
    expect(deporteDe('Trail Running')).toBe('correr')
    expect(deporteDe('yoga')).toBe('otro')
  })
  it('duración, ritmo y velocidad', () => {
    expect(formatoDuracion(3150)).toBe('52:30')
    expect(formatoDuracion(3900)).toBe('1 h 05 min')
    expect(ritmoOVelocidad({ deporte: 'correr', duracionS: 3150, distanciaM: 10000 })).toBe('5:15 /km')
    expect(ritmoOVelocidad({ deporte: 'bici', duracionS: 3600, distanciaM: 24300 })).toBe('24,3 km/h')
    expect(ritmoOVelocidad({ deporte: 'correr', duracionS: 600, distanciaM: 2001 })).toBe('5:00 /km') // 299,85 s/km: nunca 4:60
  })
  it('resumen', () => {
    expect(resumenActividad(parsearTCX(tcx)!)).toBe('🚴 Bici · 15 km · 40:00 · 22,5 km/h · ♥ 135')
  })
})

// Un .fit mínimo hecho a mano: cabecera, la definición del mensaje «session» (nº 18) y una sesión de carrera
function fitDeCarrera(): ArrayBuffer {
  const campos: [number, number, number][] = [ // [nº de campo, tamaño, tipo base]
    [2, 4, 0x86],   // start_time (uint32, segundos desde 1989-12-31)
    [7, 4, 0x86],   // total_elapsed_time (ms)
    [8, 4, 0x86],   // total_timer_time (ms)
    [9, 4, 0x86],   // total_distance (cm)
    [11, 2, 0x84],  // total_calories
    [5, 1, 0x00],   // sport (1 = running)
    [16, 1, 0x02],  // avg_heart_rate
    [17, 1, 0x02],  // max_heart_rate
  ]
  const def = [0x40, 0, 0, 18, 0, campos.length, ...campos.flat()]
  const datos: number[] = [0x00]
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]
  const inicio = Math.round((Date.UTC(2026, 10, 10, 7, 0, 0) - Date.UTC(1989, 11, 31)) / 1000)
  datos.push(...u32(inicio), ...u32(3000_000), ...u32(2950_000), ...u32(1_000_000), 600 & 255, 600 >> 8, 1, 148, 171)
  const cuerpo = [...def, ...datos]
  const cab = [14, 0x10, 0x08, 0x08, ...u32(cuerpo.length), 0x2e, 0x46, 0x49, 0x54, 0, 0]
  return new Uint8Array([...cab, ...cuerpo, 0, 0]).buffer
}

describe('parsearFIT', () => {
  it('lee el resumen de la sesión que guarda el reloj', async () => {
    const { parsearFIT } = await import('./actividadReloj')
    const a = (await parsearFIT(fitDeCarrera()))!
    expect(a).toMatchObject({ deporte: 'correr', duracionS: 2950, distanciaM: 10000, fcMedia: 148, fcMax: 171, kcal: 600 })
    expect(a.inicio).toBe('2026-11-10T07:00:00.000Z')
  })
})
