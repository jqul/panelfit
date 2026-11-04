-- Documentos para el cliente (2026-11-04).
--
-- El entrenador sube archivos (PDF, imágenes, Word, Excel...) y elige quién los ve:
--   - 'oculto': nadie más que él (borrador, o algo que ya no quiere enseñar);
--   - 'todos': todos sus clientes con cuenta;
--   - 'etiquetas': solo los clientes que tienen alguna de esas etiquetas (clientes.label_ids).
-- El cliente los ve en «Archivos» (pestaña Más) y los abre con una URL firmada.
--
-- El archivo va al bucket privado `documentos`, en <uid del entrenador>/<nombre>. Quién puede leerlo lo decide la
-- tabla: la política de lectura del bucket pide una fila de documentos con esa ruta que el usuario pueda ver con su
-- RLS, así que basta con cambiar la visibilidad para que deje de poder descargarlo. Los clientes archivados no ven nada.
-- Prueba: hardening/tests/bloque32_documentos.sql (run-pglite-documentos.mjs).

create table if not exists public.documentos (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null default auth.uid() references public.entrenadores(uid) on delete cascade,
  titulo      text not null check (length(btrim(titulo)) between 1 and 120),
  descripcion text not null default '' check (length(descripcion) <= 500),
  ruta        text not null unique,
  nombre      text not null,
  tipo        text not null default '',
  tamano      bigint not null default 0,
  visibilidad text not null default 'todos' check (visibilidad in ('oculto', 'todos', 'etiquetas')),
  etiquetas   text[] not null default '{}',
  created_at  timestamptz not null default now(),
  constraint documentos_ruta_del_entrenador check (split_part(ruta, '/', 1) = trainer_id::text)
);
create index if not exists documentos_trainer_idx on public.documentos (trainer_id, created_at desc);

alter table public.documentos enable row level security;
revoke all on public.documentos from anon;
grant select, insert, update, delete on public.documentos to authenticated;

drop policy if exists documentos_entrenador on public.documentos;
create policy documentos_entrenador on public.documentos for all to authenticated
  using (trainer_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()));

drop policy if exists documentos_cliente_lee on public.documentos;
create policy documentos_cliente_lee on public.documentos for select to authenticated
  using (visibilidad <> 'oculto' and exists (
    select 1 from public.clientes c
    where c.auth_user_id = (select auth.uid())
      and c."trainerId" = documentos.trainer_id
      and c.archived_at is null
      and (documentos.visibilidad = 'todos'
           or (documentos.visibilidad = 'etiquetas' and coalesce(c.label_ids, '[]'::jsonb) ?| documentos.etiquetas))));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documentos', 'documentos', false, 20971520, array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'])
on conflict (id) do nothing;

drop policy if exists documentos_sube_entrenador on storage.objects;
create policy documentos_sube_entrenador on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists documentos_borra_entrenador on storage.objects;
create policy documentos_borra_entrenador on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists documentos_lee on storage.objects;
create policy documentos_lee on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.documentos d where d.ruta = objects.name)));
