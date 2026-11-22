import { supabase } from './supabase'
import type { ValoresBasicos } from './datosBasicosPendientes'

// Manda los datos básicos del cliente a su ficha (función de la base de datos `cliente_guardar_datos_basicos`, migración 20261122000010). Es IDEMPOTENTE: repetirla
// no duplica el primer pesaje ni pisa lo que ya hay, así que reintentar tras un fallo es seguro. Devuelve false si no se pudo (sin red, o la función aún no existe).
export async function guardarDatosBasicos(v: ValoresBasicos): Promise<boolean> {
  const { error } = await supabase.rpc('cliente_guardar_datos_basicos', { p_genero: v.genero, p_nacimiento: v.nacimiento, p_altura: v.altura, p_peso: v.peso })
  return !error
}
