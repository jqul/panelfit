-- Bloque 7 de hardening (2026-10-23): submit_lead atribuye la recomendación por un código
-- derivado (16 hex de sha256(token)) y deja de aceptar el token de acceso en bruto.

create or replace function public.submit_lead(p_slug text, p_name text, p_email text, p_phone text, p_message text, p_ref text default null)
 returns void language plpgsql security definer
 set search_path to 'public'
as $$
declare
  v_trainer_id uuid;
  v_ref_client_id uuid;
begin
  select uid into v_trainer_id from entrenadores where slug = p_slug and (public_page->>'activa')::boolean = true;
  if v_trainer_id is null then
    raise exception 'Página no encontrada o inactiva';
  end if;

  if p_ref is not null then
    select id into v_ref_client_id from clientes
    where left(encode(sha256(convert_to(token, 'UTF8')), 'hex'), 16) = p_ref and "trainerId" = v_trainer_id;
  end if;

  insert into leads (trainer_id, name, email, phone, message, created_at, referred_by_client_id)
  values (v_trainer_id, p_name, p_email, p_phone, p_message, extract(epoch from now()) * 1000, v_ref_client_id);
end;
$$;
