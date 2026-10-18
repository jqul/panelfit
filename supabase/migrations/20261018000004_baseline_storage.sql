-- BASELINE (producción, 2026-10-18): buckets de Storage y sus políticas.
-- Privados: client-videos, exercise-videos, media (se leen con URL firmada).
-- Públicos: trainer-assets (logos/fondos de marca) y trainer-videos (vídeos de
-- demostración del entrenador).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('client-videos',   'client-videos',   false, null,     null),
  ('exercise-videos', 'exercise-videos', false, null,     null),
  ('media',           'media',           false, 52428800, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']),
  ('trainer-assets',  'trainer-assets',  true,  5242880,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('trainer-videos',  'trainer-videos',  true,  null,     null)
on conflict (id) do nothing;

-- trainer-assets: carpeta = uid del entrenador.
create policy "Trainer assets owner upload" on storage.objects for insert
  with check (bucket_id = 'trainer-assets' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "Trainer assets owner update" on storage.objects for update
  using (bucket_id = 'trainer-assets' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "Trainer assets owner delete" on storage.objects for delete
  using (bucket_id = 'trainer-assets' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "Trainer assets public read" on storage.objects for select to authenticated
  using (bucket_id = 'trainer-assets');

-- trainer-videos: cualquier usuario autenticado puede ver cualquier vídeo.
create policy "Upload trainer videos" on storage.objects for insert to authenticated
  with check (bucket_id = 'trainer-videos' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "View trainer videos" on storage.objects for select to authenticated
  using (bucket_id = 'trainer-videos');

-- client-videos: ruta = <clientId>/...; lo ven el cliente y su entrenador.
create policy client_videos_owner_or_trainer_insert on storage.objects for insert
  with check (bucket_id = 'client-videos' and exists (
    select 1 from clientes c
    where c.id::text = (storage.foldername(objects.name))[1]
      and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()))));
create policy client_videos_owner_or_trainer_select on storage.objects for select
  using (bucket_id = 'client-videos' and exists (
    select 1 from clientes c
    where c.id::text = (storage.foldername(objects.name))[1]
      and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid()))));

-- exercise-videos: ruta = <clientId>/...
create policy exercise_videos_owner_or_trainer_insert on storage.objects for insert
  with check (bucket_id = 'exercise-videos' and exists (
    select 1 from clientes c
    where c.id::text = (storage.foldername(objects.name))[1]
      and (c.auth_user_id = auth.uid() or c."trainerId" = auth.uid())));
create policy exercise_videos_owner_or_trainer_select on storage.objects for select
  using (bucket_id = 'exercise-videos' and exists (
    select 1 from clientes c
    where c.id::text = (storage.foldername(objects.name))[1]
      and (c.auth_user_id = auth.uid() or c."trainerId" = auth.uid())));

-- media: videos/<uid>/... (entrenador) y fotos/<clientId>/... (cliente o su entrenador).
create policy media_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (
    ((storage.foldername(name))[1] = 'videos' and (auth.uid())::text = (storage.foldername(name))[2])
    or ((storage.foldername(name))[1] = 'fotos' and exists (
      select 1 from clientes c
      where c.id::text = (storage.foldername(objects.name))[2]
        and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))));
create policy media_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and (
    ((storage.foldername(name))[1] = 'videos' and (auth.uid())::text = (storage.foldername(name))[2])
    or ((storage.foldername(name))[1] = 'fotos' and exists (
      select 1 from clientes c
      where c.id::text = (storage.foldername(objects.name))[2]
        and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))));
-- Solo cubre videos/<uid>: las fotos (fotos/<clientId>/...) no se pueden borrar desde la API.
create policy delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (auth.uid())::text = (storage.foldername(name))[2]);
