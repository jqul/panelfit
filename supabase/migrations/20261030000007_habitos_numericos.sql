-- Hábitos con meta numérica (2026-10-30).
--
-- Un hábito era solo una casilla sí/no. Los hay que son un número: 10.000 pasos, 7 horas de sueño, 155 g de proteína.
-- Ahora un hábito puede llevar `meta` y `unidad`; el cliente escribe el valor del día y el hábito se marca solo al
-- llegar a la meta (la app añade su id a completedHabitIds, así que lo que ya leía esa columna sigue funcionando).
--   - habitos.meta / habitos.unidad: opcionales; sin meta, el hábito sigue siendo una casilla sí/no;
--   - registros_habitos.valores: {"<id del hábito>": número} del día; por defecto {}.
-- Solo se añaden columnas: las políticas RLS no cambian y las filas existentes quedan igual.
-- Prueba: hardening/tests/bloque30_habitos_numericos.sql (run-pglite-habitos-numericos.mjs).

alter table public.habitos
  add column if not exists meta numeric,
  add column if not exists unidad text;
alter table public.habitos drop constraint if exists habitos_meta_positiva;
alter table public.habitos add constraint habitos_meta_positiva check (meta is null or (meta > 0 and meta <= 1000000));
alter table public.habitos drop constraint if exists habitos_unidad_corta;
alter table public.habitos add constraint habitos_unidad_corta check (unidad is null or char_length(unidad) <= 20);

alter table public.registros_habitos
  add column if not exists valores jsonb not null default '{}'::jsonb;
alter table public.registros_habitos drop constraint if exists registros_habitos_valores_objeto;
alter table public.registros_habitos add constraint registros_habitos_valores_objeto check (jsonb_typeof(valores) = 'object');
