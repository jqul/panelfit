-- find_trainer_by_email solo para entrenadores aprobados y solo devuelve entrenadores aprobados (2026-10-25).
--
-- Devolvía el uid de CUALQUIER fila de `entrenadores` con ese correo, a cualquier usuario con sesión: un cliente podía
-- comprobar si un correo era de un entrenador (o de una cuenta con fila de entrenador pendiente, p. ej. un cliente
-- antiguo) y obtener su uid. Solo la usa el entrenador al invitar a alguien a su equipo (EquipoSection), así que se
-- exige que quien pregunta sea un entrenador aprobado y que lo buscado también lo sea. Prueba:
-- hardening/tests/bloque14_buscar_entrenador.sql (run-pglite-buscar-entrenador.mjs).

create or replace function public.find_trainer_by_email(p_email text)
 returns uuid language sql stable security definer
 set search_path to 'public'
as $$
  select e.uid
  from public.entrenadores e
  where lower(e.email) = lower(p_email)
    and e.approved
    and exists (select 1 from public.entrenadores yo where yo.uid = (select auth.uid()) and yo.approved)
  limit 1;
$$;
