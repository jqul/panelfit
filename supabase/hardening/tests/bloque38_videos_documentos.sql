-- Prueba de migrations/20261107000001_videos_documentos.sql
-- (un documento es un archivo o un enlace de vídeo, nunca los dos ni ninguno; solo enlaces https; el cliente ve los
-- vídeos con la misma visibilidad que los archivos).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar las migraciones. Todo termina en ROLLBACK: no deja datos.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer');
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000001', 'c1@test.local'), ('cccccccc-0000-0000-0000-000000000002', 'c2@test.local');
insert into public.clientes (id, "trainerId", name, token, auth_user_id, label_ids) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Con etiqueta', 'tok-1', 'cccccccc-0000-0000-0000-000000000001', '["lbl-yoga"]'),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Sin etiqueta', 'tok-2', 'cccccccc-0000-0000-0000-000000000002', '[]');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare st text;
begin
  st := 'sin error';
  begin insert into public.documentos (titulo, url, nombre, tipo, visibilidad) values ('Movilidad 10 min', 'https://www.youtube.com/watch?v=abc', 'Movilidad 10 min', 'video', 'todos');
  exception when others then st := sqlstate; end;
  insert into resultados values ('V1 el entrenador guarda un vídeo por enlace', st = 'sin error', st);

  st := 'sin error';
  begin insert into public.documentos (titulo, url, nombre, tipo, visibilidad, etiquetas) values ('Yoga', 'https://vimeo.com/123', 'Yoga', 'video', 'etiquetas', '{lbl-yoga}');
  exception when others then st := sqlstate; end;
  insert into resultados values ('V2 y otro solo para una etiqueta', st = 'sin error', st);

  st := 'sin error';
  begin insert into public.documentos (titulo, url, nombre) values ('Mal', 'http://youtube.com/x', 'Mal');
  exception when others then st := sqlstate; end;
  insert into resultados values ('V3 un enlace sin https no vale', st = '23514', st);

  st := 'sin error';
  begin insert into public.documentos (titulo, nombre) values ('Nada', 'Nada');
  exception when others then st := sqlstate; end;
  insert into resultados values ('V4 sin archivo ni enlace no vale', st = '23514', st);

  st := 'sin error';
  begin insert into public.documentos (titulo, ruta, url, nombre) values ('Los dos', 'aaaaaaaa-0000-0000-0000-000000000001/x.pdf', 'https://youtube.com/x', 'Los dos');
  exception when others then st := sqlstate; end;
  insert into resultados values ('V5 con archivo y enlace a la vez no vale', st = '23514', st);
end $$;

select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare t text;
begin
  select string_agg(titulo, ', ' order by titulo) into t from public.documentos;
  insert into resultados values ('V6 el cliente con la etiqueta ve los dos vídeos', t = 'Movilidad 10 min, Yoga', coalesce(t, 'nada'));
end $$;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000002","role":"authenticated"}', true);
do $$
declare t text;
begin
  select string_agg(titulo, ', ' order by titulo) into t from public.documentos;
  insert into resultados values ('V7 el que no la tiene, solo el de todos', t = 'Movilidad 10 min', coalesce(t, 'nada'));
end $$;
reset role;

select caso, case when ok then 'OK' else 'FALLO' end as resultado, detalle from resultados order by caso;

rollback;
