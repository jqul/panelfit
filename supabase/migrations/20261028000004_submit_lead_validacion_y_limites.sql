-- Formulario de la página pública: validación y límites en submit_lead (2026-10-28).
--
-- Hasta ahora aceptaba cualquier cosa: un contacto sin correo ni teléfono ("Sin contacto directo") y sin límite de
-- envíos, así que un robot podía llenar la lista del entrenador (y, desde el aviso nuevo, mandarle notificaciones).
-- Ahora, en el servidor (el formulario ya lo comprueba, pero se puede llamar a la función sin pasar por él):
--   · hace falta un nombre (hasta 100 caracteres) y un correo o un teléfono con forma válida;
--   · el mensaje, hasta 1000 caracteres;
--   · el mismo correo o teléfono en las últimas 24 h no se duplica (se contesta como si hubiera ido bien);
--   · como mucho 10 contactos por hora y por entrenador.
-- Los avisos de error van en español y cortos: la página los enseña tal cual.

create or replace function public.submit_lead(p_slug text, p_name text, p_email text, p_phone text, p_message text, p_ref text default null)
 returns void language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_trainer_id uuid;
  v_ref_client_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
  v_digits text;
  v_ahora bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  select uid into v_trainer_id from entrenadores where slug = p_slug and (public_page->>'activa')::boolean = true;
  if v_trainer_id is null then
    raise exception 'Página no encontrada o inactiva';
  end if;

  if length(v_name) < 1 or length(v_name) > 100 then
    raise exception 'Escribe tu nombre';
  end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'El correo no parece válido';
  end if;
  if v_phone is not null then
    v_digits := regexp_replace(v_phone, '\D', '', 'g');
    if v_phone !~ '^[0-9+().\s-]{8,25}$' or length(v_digits) < 8 or length(v_digits) > 15 then
      raise exception 'El teléfono no parece válido';
    end if;
  end if;
  if v_email is null and v_phone is null then
    raise exception 'Déjame un correo o un teléfono para poder contestarte';
  end if;
  if v_message is not null and length(v_message) > 1000 then
    raise exception 'El mensaje es demasiado largo';
  end if;

  -- El mismo contacto en las últimas 24 h no se duplica
  if exists (
    select 1 from leads
    where trainer_id = v_trainer_id and created_at > v_ahora - 86400000
      and ((v_email is not null and lower(email) = v_email)
        or (v_digits is not null and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_digits))
  ) then
    return;
  end if;

  -- Tope por entrenador: un robot no puede llenar la lista ni las notificaciones
  if (select count(*) from leads where trainer_id = v_trainer_id and created_at > v_ahora - 3600000) >= 10 then
    raise exception 'Demasiados mensajes en poco tiempo. Inténtalo de nuevo más tarde.';
  end if;

  if p_ref is not null then
    select id into v_ref_client_id from clientes
    where left(encode(sha256(convert_to(token, 'UTF8')), 'hex'), 16) = p_ref and "trainerId" = v_trainer_id;
  end if;

  insert into leads (trainer_id, name, email, phone, message, created_at, referred_by_client_id)
  values (v_trainer_id, v_name, v_email, v_phone, v_message, v_ahora, v_ref_client_id);
end;
$$;
