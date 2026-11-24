// Runner local de la prueba de migrations/20261124000010_cuestionario_molestias_condicional.sql (la pregunta de seguimiento de las molestias pasa a ser condicional
// en las plantillas que ya existen), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-cuestionario-condicional.mjs
//
// Siembra plantillas de todo tipo, ejecuta la migración y comprueba cada una contra un cálculo INDEPENDIENTE hecho aquí en JavaScript: solo cambian las que tienen una pregunta
// `molestias` Sí/No y una `molestias_detalle` sin condición (y solo esa pregunta); el resto queda idéntico, y ejecutarla otra vez no cambia nada. Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
const migracion = read('migrations/20261124000010_cuestionario_molestias_condicional.sql')

const COND = { id: 'molestias', es: true }
// La plantilla tal como sale del modelo «Programación inicial: general» (recortada) y variantes
const modelo = () => [
  { id: 'objetivo', type: 'choice', label: '¿Cuál es tu objetivo principal?', required: true, options: ['Ganar músculo', 'Perder grasa'] },
  { id: 'molestias', type: 'yesno', label: '¿Tienes ahora alguna molestia o dolor?', required: true },
  { id: 'molestias_detalle', type: 'text', label: 'Si has contestado que sí: ¿dónde, desde cuándo, qué la empeora y qué movimientos evitas?', required: false },
  { id: 'condiciones', type: 'text', label: '¿Alguna condición médica?', required: false },
  { id: 'sueno', type: 'number', label: '¿Cuántas horas duermes de media?', required: false, unit: 'h' },
]
const plantillas = {
  tA: { trainer: 't1', name: 'Programación inicial: general', q: modelo() },
  tA2: { trainer: 't2', name: 'Programación inicial: general', q: modelo() },
  // El entrenador la editó: etiqueta propia, obligatoria, una propiedad que no conocemos, y las preguntas en otro orden
  tB: { trainer: 't1', name: 'Mi cuestionario', q: [
    { id: 'molestias_detalle', type: 'text', label: 'Cuéntame más', required: true, nota: 'edición del entrenador' },
    { id: 'extra', type: 'scale', label: 'Del 1 al 10' },
    { id: 'molestias', type: 'yesno', label: '¿Algo te duele?', required: true },
  ] },
  tC: { trainer: 't1', name: 'Sin la pregunta Sí/No', q: [{ id: 'molestias_detalle', type: 'text', label: 'Detalle' }, { id: 'otra', type: 'short', label: 'Otra' }] },
  tD: { trainer: 't1', name: 'molestias no es Sí/No', q: [{ id: 'molestias', type: 'scale', label: 'Del 1 al 10' }, { id: 'molestias_detalle', type: 'text', label: 'Detalle' }] },
  tE: { trainer: 't1', name: 'Ya tiene otra condición', q: [
    { id: 'molestias', type: 'yesno', label: '¿Molestias?' }, { id: 'otra', type: 'yesno', label: 'Otra' },
    { id: 'molestias_detalle', type: 'text', label: 'Detalle', mostrarSi: { id: 'otra', es: false } },
  ] },
  tF: { trainer: 't1', name: 'Nada que ver', q: [{ id: 'a', type: 'short', label: 'A' }, { id: 'b', type: 'yesno', label: 'B' }] },
  tG: { trainer: 't1', name: 'Vacía', q: [] },
  tH: { trainer: 't1', name: 'Mal formada (no es una lista)', q: { id: 'molestias', type: 'yesno' } },
  tI: { trainer: 't1', name: 'Sin la de detalle', q: [{ id: 'molestias', type: 'yesno', label: '¿Molestias?' }] },
}
for (const [id, p] of Object.entries(plantillas)) {
  await db.query('insert into public.survey_templates (id, trainer_id, name, questions, created_at) values ($1, $2, $3, $4::jsonb, 1)', [id, p.trainer, p.name, JSON.stringify(p.q)])
}

// El resultado que esperamos, calculado aparte: se añade la condición solo a molestias_detalle sin condición, si hay un molestias Sí/No; todo lo demás igual y en el mismo orden
function esperado(q) {
  if (!Array.isArray(q)) return q
  const hayPregunta = q.some(e => e.id === 'molestias' && e.type === 'yesno')
  const hayDetalleSinCondicion = q.some(e => e.id === 'molestias_detalle' && !('mostrarSi' in e))
  if (!hayPregunta || !hayDetalleSinCondicion) return q
  return q.map(e => e.id === 'molestias_detalle' && !('mostrarSi' in e) ? { ...e, mostrarSi: COND } : e)
}
const leer = async () => Object.fromEntries((await db.query('select id, questions from public.survey_templates order by id')).rows.map(r => [r.id, r.questions]))
// jsonb guarda las claves de cada objeto en su propio orden: se comparan sin tenerlo en cuenta, pero SÍ el orden de las preguntas de la lista
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v
const iguales = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b))

const filas = []
const comprobar = (caso, ok, detalle = '') => filas.push({ caso, resultado: ok ? 'OK' : 'FALLO', detalle: String(detalle).slice(0, 90) })

const antes = await leer()
await db.exec(migracion)
const despues = await leer()

for (const [id, p] of Object.entries(plantillas)) {
  comprobar(`${id} ${p.name} (${p.trainer})`, iguales(despues[id], esperado(p.q)), JSON.stringify(despues[id]).slice(0, 80))
}
// Lo que se pide explícitamente
comprobar('1 la del modelo recibe la condición en molestias_detalle', iguales(despues.tA.find(e => e.id === 'molestias_detalle').mostrarSi, COND))
comprobar('2 el resto de preguntas de la del modelo, idénticas (mismas propiedades y orden)', iguales(despues.tA.filter(e => e.id !== 'molestias_detalle'), antes.tA.filter(e => e.id !== 'molestias_detalle')) && despues.tA.map(e => e.id).join() === antes.tA.map(e => e.id).join())
comprobar('3 la editada por el entrenador conserva su etiqueta, su obligatoriedad, su propiedad propia y su orden', (() => {
  const d = despues.tB.find(e => e.id === 'molestias_detalle')
  return d.label === 'Cuéntame más' && d.required === true && d.nota === 'edición del entrenador' && iguales(d.mostrarSi, COND) && despues.tB.map(e => e.id).join() === 'molestias_detalle,extra,molestias'
})())
comprobar('4 una condición que ya tenía otra NO se pisa', iguales(despues.tE, antes.tE))
comprobar('5 sin la pregunta Sí/No (o con otra de otro tipo), no se toca', iguales(despues.tC, antes.tC) && iguales(despues.tD, antes.tD) && iguales(despues.tI, antes.tI))
comprobar('6 plantillas ajenas, vacías o mal formadas, idénticas y sin error', iguales(despues.tF, antes.tF) && iguales(despues.tG, antes.tG) && iguales(despues.tH, antes.tH))
const cambiadas = Object.keys(plantillas).filter(id => !iguales(despues[id], antes[id]))
comprobar('7 solo cambian las que cumplen (tA, tA2 y tB)', iguales(cambiadas.sort(), ['tA', 'tA2', 'tB']), cambiadas.join(', '))
comprobar('8 el nombre y el entrenador de cada plantilla no cambian', (await db.query('select id, trainer_id, name from public.survey_templates order by id')).rows.every(r => plantillas[r.id].trainer === r.trainer_id && plantillas[r.id].name === r.name))

// Idempotente: una segunda vez no cambia nada
await db.exec(migracion)
const tras2 = await leer()
comprobar('9 ejecutarla otra vez no cambia nada (idempotente)', iguales(tras2, despues))

console.table(filas)
const ok = filas.every(x => x.resultado === 'OK')
console.log(ok ? `todo OK (${filas.length} casos)` : `HAY FALLOS: ${filas.filter(x => x.resultado !== 'OK').length} de ${filas.length}`)
await db.close()
process.exitCode = ok ? 0 : 1
