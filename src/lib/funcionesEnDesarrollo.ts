// Funciones que están hechas pero APAGADAS hasta que se puedan sacar completas, para ir desarrollándolas poco a poco sin
// enseñar a medias nada a nadie. El código, las tablas y las funciones de servidor se quedan donde están; solo se esconde
// lo que ve el usuario. Para encenderlas en desarrollo o en las pruebas: `localStorage.setItem('pf_reloj', '1')` o
// `VITE_RELOJ=1` al construir.
//
// RELOJ: importar entrenos del reloj (archivo .gpx/.tcx/.fit y Strava) y enseñarlos. Hoy solo cubre Garmin y no el sueño ni
// los pasos de Huawei Health o Salud de iPhone; se sacará cuando esté completo (ver la nota de conexión con wearables).

function encendida(clave: string, variable: string | undefined): boolean {
  if (variable === '1') return true
  try { return localStorage.getItem(clave) === '1' } catch { return false }
}

export const relojActivo = (): boolean => encendida('pf_reloj', import.meta.env?.VITE_RELOJ as string | undefined)
