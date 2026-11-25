-- Los días por semana pasan de una cifra a una franja (mínimo y máximo) en las plantillas que ya existen (2026-11-24).
--
-- Qué cambia en la aplicación: el cuestionario de programación ya no pregunta «¿cuántos días por semana puedes entrenar de verdad?» (una cifra de 2 a 6), sino dos preguntas
-- obligatorias, `dias_min` («como MÍNIMO, aunque sea una semana complicada») y `dias_max` («como MÁXIMO, en una semana buena»), de 1 a 7. El máximo no puede ser menor que el mínimo
-- (regla `noMenorQue`, comprobada al enviar en lib/cuestionarios.ts).
--
-- Por qué hace falta esta migración: la plantilla de cada entrenador es una COPIA del modelo (survey_templates); cambiar el modelo no la toca. Aquí se sustituye la pregunta
-- antigua por las dos nuevas, en el mismo sitio de la lista, en las copias que todavía la tienen tal cual salió del modelo.
--
-- Qué hace, y nada más:
--   · Solo toca plantillas con una pregunta `dias` SIN editar (tipo choice, obligatoria, con el enunciado y las opciones 2-6 del modelo anterior) que NO tengan ya `dias_min` ni `dias_max`.
--     Esa pregunta se sustituye, en su misma posición, por `dias_min` y `dias_max` (el JSON es el del modelo: una prueba de vitest comprueba que no se desvía de él).
--   · Si el entrenador editó la pregunta `dias` (otro enunciado, otras opciones, no obligatoria…), no se toca: es suya.
--   · El resto de la plantilla queda exactamente igual: mismas preguntas, mismo orden, mismas ediciones.
--   · Idempotente: tras ejecutarla ya no hay `dias`, así que volver a ejecutarla no cambia nada.
--   · No toca respuestas (survey_responses), clientes ni envíos. Las respuestas ya enviadas conservan su `dias`; la aplicación las sigue enseñando con su enunciado de entonces
--     aunque la plantilla ya no tenga esa pregunta (lib/cuestionarios.ts: respuestasSinPregunta). Los cuestionarios ya enviados pero sin contestar pasan a mostrar las dos nuevas.
-- Prueba: hardening/tests/run-pglite-cuestionario-franja-dias.mjs (siembra plantillas de todo tipo y compara con un cálculo independiente).

update public.survey_templates t
   set questions = (
     select jsonb_agg(y.el order by x.ord, y.sub)
       from jsonb_array_elements(t.questions) with ordinality as x(e, ord)
       cross join lateral (
         select case
                  when x.e ->> 'id' = 'dias'
                   and x.e ->> 'type' = 'choice'
                   and x.e -> 'required' = 'true'::jsonb
                   and x.e ->> 'label' = '¿Cuántos días por semana puedes entrenar de verdad?'
                   and x.e -> 'options' = '["2","3","4","5","6"]'::jsonb
                  then jsonb_build_array(
                         jsonb_build_object('id', 'dias_min', 'type', 'choice', 'required', true,
                                            'label', '¿Cuántos días por semana puedes entrenar como MÍNIMO, aunque sea una semana complicada?',
                                            'options', '["1","2","3","4","5","6","7"]'::jsonb),
                         jsonb_build_object('id', 'dias_max', 'type', 'choice', 'required', true,
                                            'label', '¿Y cuántos como MÁXIMO, en una semana buena?',
                                            'options', '["1","2","3","4","5","6","7"]'::jsonb,
                                            'noMenorQue', jsonb_build_object('id', 'dias_min', 'mensaje', 'El máximo no puede ser menor que el mínimo. Cambia uno de los dos.')))
                  else jsonb_build_array(x.e)
                end as arr
       ) z
       cross join lateral jsonb_array_elements(z.arr) with ordinality as y(el, sub)
   )
 where jsonb_typeof(t.questions) = 'array'
   and not exists (select 1 from jsonb_array_elements(t.questions) e where e ->> 'id' in ('dias_min', 'dias_max'))
   and exists (
     select 1 from jsonb_array_elements(t.questions) e
      where e ->> 'id' = 'dias' and e ->> 'type' = 'choice' and e -> 'required' = 'true'::jsonb
        and e ->> 'label' = '¿Cuántos días por semana puedes entrenar de verdad?'
        and e -> 'options' = '["2","3","4","5","6"]'::jsonb);
