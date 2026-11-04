-- Prueba de migrations/20261104000003_documentos.sql
-- (el entrenador gestiona solo sus documentos; el cliente ve los de su entrenador según la visibilidad y sus
-- etiquetas, y solo puede descargar esos; ni otro entrenador, ni un cliente archivado, ni anon ven nada).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer');
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'),
  ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local'),
  ('cccccccc-0000-0000-0000-000000000003', 'c3@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id, label_ids) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Con etiqueta', 'tok-1', 'cccccccc-0000-0000-0000-000000000001', '["lbl-online"]'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Sin etiqueta', 'tok-2', 'cccccccc-0000-0000-0000-000000000002', '[]'),
  ('11111111-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Archivado', 'tok-3', 'cccccccc-0000-0000-0000-000000000003', '["lbl-online"]');
update public.clientes set archived_at = 1 where id = '11111111-0000-0000-0000-000000000003';

-- ── El entrenador 1 sube tres documentos ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
insert into public.documentos (id, titulo, ruta, nombre, visibilidad, etiquetas) values
  ('d0000000-0000-0000-0000-000000000001', 'Normas del centro', 'aaaaaaaa-0000-0000-0000-000000000001/normas.pdf', 'normas.pdf', 'todos', '{}'),
  ('d0000000-0000-0000-0000-000000000002', 'Guía online', 'aaaaaaaa-0000-0000-0000-000000000001/online.pdf', 'online.pdf', 'etiquetas', '{lbl-online}'),
  ('d0000000-0000-0000-0000-000000000003', 'Borrador', 'aaaaaaaa-0000-0000-0000-000000000001/borrador.pdf', 'borrador.pdf', 'oculto', '{}');
insert into storage.objects (bucket_id, name) values
  ('documentos', 'aaaaaaaa-0000-0000-0000-000000000001/normas.pdf'),
  ('documentos', 'aaaaaaaa-0000-0000-0000-000000000001/online.pdf'),
  ('documentos', 'aaaaaaaa-0000-0000-0000-000000000001/borrador.pdf');
do $$
declare st text := 'sin error';
begin
  select count(*)::text into st from public.documentos;
  insert into resultados values ('D1 el entrenador ve sus tres documentos', st = '3', st);
  st := 'sin error';
  begin insert into public.documentos (titulo, ruta, nombre) values ('Ajeno', 'aaaaaaaa-0000-0000-0000-000000000002/x.pdf', 'x.pdf');
  exception when others then st := sqlstate; end;
  insert into resultados values ('D2 no puede registrar un archivo en la carpeta de otro', st = '23514', st);
  st := 'sin error';
  begin insert into storage.objects (bucket_id, name) values ('documentos', 'aaaaaaaa-0000-0000-0000-000000000002/x.pdf');
  exception when others then st := sqlstate; end;
  insert into resultados values ('D3 ni subirlo a la carpeta de otro en el bucket', st = '42501', st);
end $$;

-- ── El entrenador 2 no ve ni toca nada del 1 ──
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare n integer; m integer;
begin
  select count(*) into n from public.documentos;
  select count(*) into m from storage.objects where bucket_id = 'documentos';
  update public.documentos set visibilidad = 'todos' where id = 'd0000000-0000-0000-0000-000000000003';
  insert into resultados values ('D4 otro entrenador no ve documentos ni archivos ajenos', n = 0 and m = 0, n || ' / ' || m);
end $$;

-- ── Cliente con la etiqueta ──
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare t text; m integer; n integer;
begin
  select string_agg(titulo, ', ' order by titulo) into t from public.documentos;
  insert into resultados values ('D5 el cliente con la etiqueta ve los de todos y los de su etiqueta', t = 'Guía online, Normas del centro', coalesce(t, 'nada'));
  select count(*) into m from storage.objects where bucket_id = 'documentos';
  insert into resultados values ('D6 y solo puede descargar esos dos (el oculto no)', m = 2, m::text);
  update public.documentos set visibilidad = 'oculto';
  get diagnostics n = row_count;
  delete from storage.objects where bucket_id = 'documentos';
  get diagnostics m = row_count;
  insert into resultados values ('D7 el cliente no cambia ni borra documentos', n = 0 and m = 0, n || ' / ' || m);
end $$;

-- ── Cliente sin la etiqueta ──
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare t text;
begin
  select string_agg(titulo, ', ' order by titulo) into t from public.documentos;
  insert into resultados values ('D8 el cliente sin la etiqueta solo ve los de todos', t = 'Normas del centro', coalesce(t, 'nada'));
end $$;

-- ── Cliente archivado ──
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
do $$
declare n integer; m integer;
begin
  select count(*) into n from public.documentos;
  select count(*) into m from storage.objects where bucket_id = 'documentos';
  insert into resultados values ('D9 un cliente archivado no ve nada', n = 0 and m = 0, n || ' / ' || m);
end $$;
reset role;

-- ── Anon ──
set local role anon;
do $$
declare st text := 'sin error'; m integer;
begin
  begin perform count(*) from public.documentos; exception when others then st := sqlstate; end;
  select count(*) into m from storage.objects where bucket_id = 'documentos';
  insert into resultados values ('D10 anon no lee documentos ni archivos', st = '42501' and m = 0, st || ' / ' || m);
end $$;
reset role;

-- ── El entrenador oculta la guía: el cliente deja de poder descargarla ──
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
update public.documentos set visibilidad = 'oculto' where id = 'd0000000-0000-0000-0000-000000000002';
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare m integer;
begin
  select count(*) into m from storage.objects where bucket_id = 'documentos';
  insert into resultados values ('D11 al ocultarlo, el cliente ya no puede descargarlo', m = 1, m::text);
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
