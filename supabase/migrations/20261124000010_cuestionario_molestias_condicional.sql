-- La pregunta de seguimiento de las molestias pasa a ser condicional en las plantillas que ya existen (2026-11-24).
--
-- Qué cambia en la aplicación: los cuestionarios admiten preguntas de seguimiento (`mostrarSi: { id, es }`): «¿Tienes ahora alguna molestia o dolor…?» (Sí/No) abre, solo si se
-- contesta que Sí, «¿dónde, desde cuándo, qué la empeora y qué movimientos evitas?». Con «No» no se enseña ni cuenta (lib/cuestionarios.ts).
--
-- Por qué hace falta esta migración: cuando se crea un cliente, su cuestionario de programación se copia del modelo a una plantilla del entrenador (survey_templates) y de ahí en
-- adelante se usa esa copia tal cual (el entrenador puede haberla editado). Cambiar el modelo no la toca, así que la copia que ya existe no tiene la condición. Aquí se le añade.
--
-- Qué hace, y nada más:
--   · Solo toca plantillas que tienen una pregunta `molestias` de tipo Sí/No Y una pregunta `molestias_detalle` SIN condición. A esta última le añade
--     `mostrarSi: { id: 'molestias', es: true }`.
--   · El resto de la plantilla queda exactamente igual: mismas preguntas, mismo orden, mismas opciones y cualquier edición del entrenador.
--   · Idempotente: si la pregunta ya tiene condición (o no existe una de las dos), no hace nada. Volver a ejecutarla no cambia nada.
--   · No toca respuestas (survey_responses), clientes, envíos ni otras plantillas. Las respuestas ya enviadas conservan lo que contestaron.
-- Prueba: hardening/tests/run-pglite-cuestionario-condicional.mjs (siembra plantillas de todo tipo y compara con un cálculo independiente).

update public.survey_templates t
   set questions = (
     select jsonb_agg(
              case when e ->> 'id' = 'molestias_detalle' and not (e ? 'mostrarSi')
                   then e || jsonb_build_object('mostrarSi', jsonb_build_object('id', 'molestias', 'es', true))
                   else e end
              order by x.ord)
       from jsonb_array_elements(t.questions) with ordinality as x(e, ord)
   )
 where jsonb_typeof(t.questions) = 'array'
   and exists (select 1 from jsonb_array_elements(t.questions) e where e ->> 'id' = 'molestias' and e ->> 'type' = 'yesno')
   and exists (select 1 from jsonb_array_elements(t.questions) e where e ->> 'id' = 'molestias_detalle' and not (e ? 'mostrarSi'));
