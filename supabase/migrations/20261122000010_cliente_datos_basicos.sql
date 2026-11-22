-- Datos básicos del cliente en su registro (2026-11-22): género, fecha de nacimiento, altura y peso.
--
-- El flujo: el entrenador crea al cliente solo con nombre y teléfono, le manda su enlace y, al registrarse, el cliente rellena quién es. Estos cuatro datos van a SU
-- FICHA (clientes.genero, fechanacimiento, altura y weight) y el peso, además, es su primer pesaje (registros_peso) para que su evolución empiece ese día.
--
-- El cliente solo puede LEER su ficha (política client_reads_own_cliente) y no debe escribir en ella a su antojo (ahí hay cosas del entrenador): por eso entra por esta
-- función mínima, que escribe SOLO esas cuatro columnas de SU fila (la del auth.uid()) y valida lo que recibe. Reglas:
--   · Solo rellena lo que está vacío: lo que el entrenador ya hubiera puesto a mano NO se pisa.
--   · Valores con sentido: género h|m o vacío, nacimiento de entre 10 y 100 años, altura 100-250 cm, peso 20-400 kg (mismos límites que la solicitud pública).
--   · Idempotente: llamarla otra vez no duplica el pesaje del día (clave única cliente+fecha).
--   · Un cliente archivado, sin sesión o `anon` no pueden usarla.
-- Prueba: hardening/tests/bloque45_datos_basicos.sql (run-pglite-datos-basicos.mjs).

create or replace function public.cliente_guardar_datos_basicos(p_genero text, p_nacimiento date, p_altura numeric, p_peso numeric)
 returns jsonb language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  c public.clientes;
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
begin
  if v_uid is null then raise exception 'No autorizado' using errcode = '42501'; end if;
  select * into c from public.clientes where auth_user_id = v_uid and archived_at is null limit 1;
  if not found then raise exception 'No autorizado' using errcode = '42501'; end if;

  if p_genero is not null and p_genero not in ('h', 'm') then raise exception 'El género no es válido'; end if;
  if p_nacimiento is null or p_nacimiento > v_hoy - interval '10 years' or p_nacimiento < v_hoy - interval '100 years' then
    raise exception 'La fecha de nacimiento no es válida';
  end if;
  if p_altura is null or p_altura < 100 or p_altura > 250 then raise exception 'La altura no es válida'; end if;
  if p_peso is null or p_peso < 20 or p_peso > 400 then raise exception 'El peso no es válido'; end if;

  update public.clientes
     set genero = coalesce(nullif(btrim(genero), ''), p_genero),
         fechanacimiento = coalesce(nullif(btrim(fechanacimiento), ''), to_char(p_nacimiento, 'YYYY-MM-DD')),
         altura = case when coalesce(altura, 0) = 0 then round(p_altura, 1) else altura end,
         weight = case when coalesce(weight, 0) = 0 then round(p_peso, 1) else weight end
   where id = c.id
   returning * into c;

  -- Su primer pesaje: lo que dice que pesa hoy (si ya hay uno de hoy, se respeta)
  insert into public.registros_peso ("clientId", weight, date) values (c.id, round(p_peso, 1), to_char(v_hoy, 'YYYY-MM-DD'))
  on conflict ("clientId", date) do nothing;

  return jsonb_build_object('genero', c.genero, 'fechanacimiento', c.fechanacimiento, 'altura', c.altura, 'peso', c.weight);
end;
$$;
revoke execute on function public.cliente_guardar_datos_basicos(text, date, numeric, numeric) from public, anon;
grant execute on function public.cliente_guardar_datos_basicos(text, date, numeric, numeric) to authenticated;
