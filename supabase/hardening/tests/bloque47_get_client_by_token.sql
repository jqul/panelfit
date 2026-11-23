-- Prueba de migrations/20261123000010_get_client_by_token_archivado_motivo.sql
-- (get_client_by_token devuelve SETOF clientes con la lista de columnas escrita a mano: debe resolver un token válido, no dar ninguna ficha con uno que no lo es, no filtrar las
-- columnas privadas y devolver lo mismo que la tabla en el resto. La correspondencia de ESTRUCTURA —número, orden, nombre y tipo de las columnas— la comprueba el runner
-- (run-pglite-get-client-by-token.mjs) con los metadatos del resultado; aquí van los casos de contenido y de acceso.)
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;
create function pg_temp.reg(p_caso text, p_ok boolean, p_detalle text default '') returns void language sql as
  $f$ insert into resultados values (p_caso, coalesce(p_ok, false), p_detalle) $f$;
grant execute on function pg_temp.reg(text, boolean, text) to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');

-- c1: activo y con TODO lleno, incluidas las columnas privadas que la función debe enmascarar; c2: otro cliente activo; c3: enlace caducado; c4: enlace que caduca en el futuro;
-- c5: archivado (a mano, con motivo)
insert into public.clientes (id, "trainerId", name, surname, token, phone, weight, objetivo, altura, genero, fechanacimiento, notas_privadas, alerts, label_ids, precio_mensual, lesiones,
                             equipo_disponible, profesional_id, archivado_motivo, recordatorio_diario, main_goal) values
  ('c1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'Lara', 'tok-valido-1', '600111222', 64.5, 'fuerza', 168.5, 'm', '1995-03-10',
   'nota SECRETA del entrenador', '[{"texto":"llamar"}]', '["etiqueta-1"]', 55, 'rodilla derecha', 'solo mancuernas', 'aaaaaaaa-0000-0000-0000-000000000001', null, true, 'hipertrofia'),
  ('c2000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Beto', 'Ruiz', 'tok-valido-2', null, 80, null, null, null, null, 'otra nota secreta', '[]', '[]', null, null, null, null, null, true, null),
  ('c3000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cleo', 'Sanz', 'tok-caducado', null, 70, null, null, null, null, '', '[]', '[]', null, null, null, null, null, true, null),
  ('c4000000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', 'Dani', 'Mora', 'tok-futuro', null, 75, null, null, null, null, '', '[]', '[]', null, null, null, null, null, true, null),
  ('c5000000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', 'Eva', 'Gil', 'tok-archivado', null, 60, null, null, null, null, '', '[]', '[]', null, null, null, null, 'plan_terminado', true, null);
update public.clientes set token_expires_at = now() - interval '1 day' where id = 'c3000000-0000-0000-0000-000000000003';
update public.clientes set token_expires_at = now() + interval '30 days' where id = 'c4000000-0000-0000-0000-000000000004';
update public.clientes set archived_at = 1700000000000 where id = 'c5000000-0000-0000-0000-000000000005';

-- Cuántas filas devuelve la función para un token, llamada como `anon` (así la usa un cliente que abre su enlace, sin sesión) y, si se pide, como un usuario autenticado
create function pg_temp.filas(p_token text, p_rol text default 'anon') returns bigint language plpgsql as $f$
declare n bigint;
begin
  execute format('set local role %I', p_rol);
  select count(*) into n from public.get_client_by_token(p_token);
  reset role;
  return n;
exception when others then
  reset role;
  raise;
end $f$;
grant execute on function pg_temp.filas(text, text) to public;

-- ═══ 1. Un token válido resuelve a SU cliente y a ninguno más ═══
do $$
declare f jsonb; c jsonb;
begin
  perform pg_temp.reg('1a un token válido devuelve exactamente una ficha (como anon, sin sesión)', pg_temp.filas('tok-valido-1') = 1, '');
  select to_jsonb(x) into f from public.get_client_by_token('tok-valido-1') x;
  perform pg_temp.reg('1b es la ficha de ese token', f ->> 'id' = 'c1000000-0000-0000-0000-000000000001' and f ->> 'token' = 'tok-valido-1' and f ->> 'name' = 'Ana', f ->> 'id');
  select to_jsonb(x) into f from public.get_client_by_token('tok-valido-2') x;
  perform pg_temp.reg('1c otro token devuelve la otra ficha, no la primera', f ->> 'id' = 'c2000000-0000-0000-0000-000000000002', f ->> 'id');
  perform pg_temp.reg('1d un token válido no devuelve las fichas de los demás (una sola fila entre 5 clientes)', pg_temp.filas('tok-valido-2') = 1, '');
  perform pg_temp.reg('1e también lo resuelve un usuario autenticado', pg_temp.filas('tok-valido-1', 'authenticated') = 1, '');
  perform pg_temp.reg('1f un enlace que caduca en el futuro sigue valiendo', pg_temp.filas('tok-futuro') = 1, '');
end $$;

-- ═══ 2. Un token que no es válido no da acceso a ninguna ficha ═══
do $$
begin
  perform pg_temp.reg('2a un token que no existe: 0 filas', pg_temp.filas('tok-no-existe') = 0, '');
  perform pg_temp.reg('2b un token vacío: 0 filas', pg_temp.filas('') = 0, '');
  perform pg_temp.reg('2c un token nulo: 0 filas', (select count(*) from public.get_client_by_token(null)) = 0, '');
  perform pg_temp.reg('2d distinto en mayúsculas: 0 filas', pg_temp.filas('TOK-VALIDO-1') = 0, '');
  perform pg_temp.reg('2e con un espacio de más: 0 filas', pg_temp.filas('tok-valido-1 ') = 0 and pg_temp.filas(' tok-valido-1') = 0, '');
  perform pg_temp.reg('2f un trozo del token (prefijo / comodín): 0 filas', pg_temp.filas('tok-valido') = 0 and pg_temp.filas('tok-valido-%') = 0 and pg_temp.filas('%') = 0, '');
  perform pg_temp.reg('2g un intento de inyección no devuelve fichas', pg_temp.filas($q$x' or '1'='1$q$) = 0 and pg_temp.filas($q$' or true --$q$) = 0, '');
  perform pg_temp.reg('2h el enlace caducado: 0 filas', pg_temp.filas('tok-caducado') = 0, '');
  perform pg_temp.reg('2i el cliente archivado: 0 filas', pg_temp.filas('tok-archivado') = 0, '');
end $$;

-- ═══ 3. Lo que devuelve es lo de la tabla, salvo las columnas privadas, que salen vacías ═══
do $$
declare f jsonb; t jsonb;
  privadas text[] := array['notas_privadas', 'alerts', 'label_ids', 'precio_mensual', 'lesiones', 'equipo_disponible', 'profesional_id', 'archivado_motivo'];
begin
  select to_jsonb(x) into f from public.get_client_by_token('tok-valido-1') x;
  select to_jsonb(c) into t from public.clientes c where c.id = 'c1000000-0000-0000-0000-000000000001';
  perform pg_temp.reg('3a el resto de columnas es idéntico al de la tabla', (f - privadas) = (t - privadas), '');
  perform pg_temp.reg('3b notas_privadas sale a null (la tabla tiene una nota secreta)', f -> 'notas_privadas' = 'null'::jsonb and t ->> 'notas_privadas' = 'nota SECRETA del entrenador', '');
  perform pg_temp.reg('3c alerts y label_ids salen vacías', f -> 'alerts' = '[]'::jsonb and f -> 'label_ids' = '[]'::jsonb and t -> 'alerts' <> '[]'::jsonb, '');
  perform pg_temp.reg('3d precio_mensual, lesiones y equipo_disponible salen a null', f -> 'precio_mensual' = 'null'::jsonb and f -> 'lesiones' = 'null'::jsonb and f -> 'equipo_disponible' = 'null'::jsonb
    and t ->> 'precio_mensual' is not null and t ->> 'lesiones' is not null and t ->> 'equipo_disponible' is not null, '');
  perform pg_temp.reg('3e profesional_id sale a null (la tabla lo tiene asignado)', f -> 'profesional_id' = 'null'::jsonb and t ->> 'profesional_id' is not null, '');
  perform pg_temp.reg('3f archivado_motivo sale a null: la columna que faltaba existe en el resultado', f ? 'archivado_motivo' and f -> 'archivado_motivo' = 'null'::jsonb, '');
  perform pg_temp.reg('3g el resultado tiene tantas columnas como la tabla',
    (select count(*) from jsonb_object_keys(f)) = (select count(*) from pg_attribute where attrelid = 'public.clientes'::regclass and attnum > 0 and not attisdropped), '');
  perform pg_temp.reg('3h y las mismas claves', (select array_agg(k order by k) from jsonb_object_keys(f) k) = (select array_agg(attname::text order by attname::text) from pg_attribute where attrelid = 'public.clientes'::regclass and attnum > 0 and not attisdropped), '');
end $$;

-- ═══ 4. Permisos y configuración de la función ═══
do $$
begin
  perform pg_temp.reg('4a anon y authenticated pueden ejecutarla (el cliente la usa sin sesión)', has_function_privilege('anon', 'public.get_client_by_token(text)', 'execute') and has_function_privilege('authenticated', 'public.get_client_by_token(text)', 'execute'), '');
  perform pg_temp.reg('4b sigue siendo SECURITY DEFINER con search_path fijo',
    (select prosecdef and proconfig = array['search_path=public'] from pg_proc where oid = 'public.get_client_by_token(text)'::regprocedure), '');
  perform pg_temp.reg('4c una sola versión de la función', (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'get_client_by_token') = 1, '');
end $$;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
