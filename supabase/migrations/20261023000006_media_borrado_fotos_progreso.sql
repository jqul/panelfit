-- Bloque 5 de hardening (2026-10-23): el cliente (y su entrenador) pueden borrar las fotos de
-- progreso de Storage (necesario para el derecho de supresión del RGPD).

drop policy if exists delete_own on storage.objects;
create policy media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (
    ((storage.foldername(name))[1] = 'videos' and (auth.uid())::text = (storage.foldername(name))[2])
    or ((storage.foldername(name))[1] = 'fotos' and exists (
      select 1 from clientes c
      where c.id::text = (storage.foldername(objects.name))[2]
        and (c."trainerId" = (select auth.uid()) or c.auth_user_id = (select auth.uid()))))));
