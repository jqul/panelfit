// Runner local de la prueba de migrations/20261124000020_cuestionario_franja_dias.sql (los días por semana pasan de una cifra a una franja mínimo/máximo en las plantillas
// que ya existen), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-cuestionario-franja-dias.mjs
//
// Siembra plantillas de todo tipo, ejecuta la migración y comprueba cada una contra un cálculo INDEPENDIENTE hecho aquí en JavaScript: solo cambian las que tienen la pregunta
// `dias` sin editar y sin `dias_min`/`dias_max` (y solo esa pregunta, que se sustituye en su sitio por las dos nuevas); el resto queda idéntico, y ejecutarla otra vez no cambia nada.
// Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const db = await crearBase()
const migracion = read('migrations/20261124000020_cuestionario_franja_dias.sql')

const DIAS_ANTIGUO = () => ({ id: 'dias', type: 'choice', label: '¿Cuántos días por semana puedes entrenar de verdad?', required: true, options: ['2', '3', '4', '5', '6'] })
const NUEVAS = () => [
  { id: 'dias_min', type: 'choice', required: true, label: '¿Cuántos días por semana puedes entrenar como MÍNIMO, aunque sea una semana complicada?', options: ['1', '2', '3', '4', '5', '6', '7'] },
  { id: 'dias_max', type: 'choice', required: true, label: '¿Y cuántos como MÁXIMO, en una semana buena?', options: ['1', '2', '3', '4', '5', '6', '7'],
    noMenorQue: { id: 'dias_min', mensaje: 'El máximo no puede ser menor que el mínimo. Cambia uno de los dos.' } },
]
const modelo = () => [
  { id: 'objetivo', type: 'choice', label: '¿Cuál es tu objetivo principal?', required: true, options: ['Ganar músculo', 'Perder grasa'] },
  { id: 'molestias', type: 'yesno', label: '¿Tienes ahora alguna molestia o dolor?', required: true },
  { id: 'molestias_detalle', type: 'text', label: 'Detalle', required: false, mostrarSi: { id: 'molestias', es: true } },
  DIAS_ANTIGUO(),
  { id: 'dias_concretos', type: 'multi', label: '¿Qué días te vienen mejor?', options: ['Lunes', 'Martes'] },
  { id: 'duracion', type: 'choice', label: '¿Cuánto tiempo tienes por sesión?', required: true, options: ['45-60 min'] },
]
const plantillas = {
  tA: { trainer: 't1', name: 'Programación inicial: general', q: modelo() },
  tA2: { trainer: 't2', name: 'Programación inicial: general', q: modelo() },
  // `dias` es la primera y la última de la lista: la sustitución respeta la posición
  tPrimera: { trainer: 't1', name: 'dias primera', q: [DIAS_ANTIGUO(), { id: 'x', type: 'short', label: 'X' }] },
  tUltima: { trainer: 't1', name: 'dias última', q: [{ id: 'x', type: 'short', label: 'X' }, DIAS_ANTIGUO()] },
  tSola: { trainer: 't1', name: 'solo dias', q: [DIAS_ANTIGUO()] },
  // Una propiedad que no conocemos en OTRA pregunta y el orden propio del entrenador: no se toca
  tEditadaOtra: { trainer: 't1', name: 'Otras ediciones', q: [{ id: 'z', type: 'text', label: 'Z', required: true, nota: 'edición del entrenador' }, DIAS_ANTIGUO(), { id: 'a', type: 'scale', label: 'A' }] },
  // `dias` editada por el entrenador: es suya, no se toca
  tEnunciado: { trainer: 't1', name: 'Enunciado propio', q: [{ ...DIAS_ANTIGUO(), label: 'Días que entrenas' }, { id: 'x', type: 'short', label: 'X' }] },
  tOpciones: { trainer: 't1', name: 'Opciones propias', q: [{ ...DIAS_ANTIGUO(), options: ['3', '4', '5'] }] },
  tOpcional: { trainer: 't1', name: 'No obligatoria', q: [{ ...DIAS_ANTIGUO(), required: false }] },
  tOtroTipo: { trainer: 't1', name: 'Otro tipo', q: [{ ...DIAS_ANTIGUO(), type: 'number' }] },
  // Ya tiene la franja (o parte de ella): no se toca ni se duplica
  tYaFranja: { trainer: 't1', name: 'Ya con franja', q: NUEVAS() },
  tFranjaYDias: { trainer: 't1', name: 'Franja y dias', q: [DIAS_ANTIGUO(), ...NUEVAS()] },
  tSoloMin: { trainer: 't1', name: 'Solo el mínimo', q: [DIAS_ANTIGUO(), NUEVAS()[0]] },
  tNada: { trainer: 't1', name: 'Nada que ver', q: [{ id: 'a', type: 'short', label: 'A' }, { id: 'b', type: 'yesno', label: 'B' }] },
  tVacia: { trainer: 't1', name: 'Vacía', q: [] },
  tMala: { trainer: 't1', name: 'Mal formada (no es una lista)', q: { id: 'dias', type: 'choice' } },
  // Dos preguntas con id `dias` (raro, pero no debe romper nada): se sustituyen las dos
  tDuplicada: { trainer: 't1', name: 'dias dos veces', q: [DIAS_ANTIGUO(), { id: 'x', type: 'short', label: 'X' }, DIAS_ANTIGUO()] },
}
for (const [id, p] of Object.entries(plantillas)) {
  await db.query('insert into public.survey_templates (id, trainer_id, name, questions, created_at) values ($1, $2, $3, $4::jsonb, 1)', [id, p.trainer, p.name, JSON.stringify(p.q)])
}

// El resultado que esperamos, calculado aparte
const esAntigua = e => e.id === 'dias' && e.type === 'choice' && e.required === true && e.label === '¿Cuántos días por semana puedes entrenar de verdad?' && JSON.stringify(e.options) === JSON.stringify(['2', '3', '4', '5', '6'])
function esperado(q) {
  if (!Array.isArray(q)) return q
  if (q.some(e => e.id === 'dias_min' || e.id === 'dias_max')) return q
  if (!q.some(esAntigua)) return q
  return q.flatMap(e => esAntigua(e) ? NUEVAS() : [e])
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
  comprobar(`${id} ${p.name} (${p.trainer})`, iguales(despues[id], esperado(p.q)), (despues[id] || []).map?.(e => e.id).join(','))
}
// Lo que se pide explícitamente
const ids = id => despues[id].map(e => e.id).join()
comprobar('1 la del modelo: dias se sustituye en su sitio por dias_min y dias_max', ids('tA') === 'objetivo,molestias,molestias_detalle,dias_min,dias_max,dias_concretos,duracion')
comprobar('2 el resto de preguntas de la del modelo, idénticas (mismas propiedades y orden)', iguales(despues.tA.filter(e => !/^dias_m/.test(e.id)), antes.tA.filter(e => e.id !== 'dias')))
comprobar('3 la condición de molestias_detalle sigue ahí', iguales(despues.tA.find(e => e.id === 'molestias_detalle').mostrarSi, { id: 'molestias', es: true }))
comprobar('4 dias_min y dias_max: obligatorias, de 1 a 7, y el máximo lleva la regla', (() => {
  const mn = despues.tA.find(e => e.id === 'dias_min'), mx = despues.tA.find(e => e.id === 'dias_max')
  return mn.required === true && mx.required === true && mn.type === 'choice' && mx.type === 'choice' && mn.options.join() === '1,2,3,4,5,6,7' && mx.options.join() === '1,2,3,4,5,6,7' && mx.noMenorQue.id === 'dias_min' && mx.noMenorQue.mensaje.length > 10 && !('noMenorQue' in mn)
})())
comprobar('5 en primera y última posición, y sola, se respeta el sitio', ids('tPrimera') === 'dias_min,dias_max,x' && ids('tUltima') === 'x,dias_min,dias_max' && ids('tSola') === 'dias_min,dias_max')
comprobar('6 otras ediciones del entrenador se conservan', (() => { const z = despues.tEditadaOtra.find(e => e.id === 'z'); return z.nota === 'edición del entrenador' && z.required === true && ids('tEditadaOtra') === 'z,dias_min,dias_max,a' })())
comprobar('7 una dias EDITADA (enunciado, opciones, obligatoriedad o tipo) no se toca', ['tEnunciado', 'tOpciones', 'tOpcional', 'tOtroTipo'].every(id => iguales(despues[id], antes[id])))
comprobar('8 si ya tiene la franja (o parte), no se toca ni se duplica', ['tYaFranja', 'tFranjaYDias', 'tSoloMin'].every(id => iguales(despues[id], antes[id])))
comprobar('9 plantillas ajenas, vacías o mal formadas, idénticas y sin error', ['tNada', 'tVacia', 'tMala'].every(id => iguales(despues[id], antes[id])))
const cambiadas = Object.keys(plantillas).filter(id => !iguales(despues[id], antes[id]))
comprobar('10 solo cambian las que cumplen', iguales(cambiadas.sort(), ['tA', 'tA2', 'tDuplicada', 'tEditadaOtra', 'tPrimera', 'tSola', 'tUltima']), cambiadas.join(', '))
comprobar('11 el nombre y el entrenador de cada plantilla no cambian', (await db.query('select id, trainer_id, name from public.survey_templates order by id')).rows.every(r => plantillas[r.id].trainer === r.trainer_id && plantillas[r.id].name === r.name))
comprobar('12 ninguna plantilla queda sin lista ni con ids repetidos por culpa de la migración', Object.entries(despues).every(([id, q]) => !Array.isArray(plantillas[id].q) ? iguales(q, plantillas[id].q) : Array.isArray(q) && (id === 'tDuplicada' || new Set(q.map(e => e.id)).size === q.length)))

// Idempotente: una segunda vez no cambia nada
await db.exec(migracion)
const tras2 = await leer()
comprobar('13 ejecutarla otra vez no cambia nada (idempotente)', iguales(tras2, despues))

console.table(filas)
const ok = filas.every(x => x.resultado === 'OK')
console.log(ok ? `todo OK (${filas.length} casos)` : `HAY FALLOS: ${filas.filter(x => x.resultado !== 'OK').length} de ${filas.length}`)
await db.close()
process.exitCode = ok ? 0 : 1
