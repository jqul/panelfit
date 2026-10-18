-- BASELINE (producción, 2026-10-18): funciones, triggers y tareas programadas.
-- Los secretos NO están aquí: viven en public.internal_webhook_secrets.

create or replace function public.normalize_slug(input text)
 returns text language plpgsql
 set search_path to 'public'
as $$
begin
  return lower(regexp_replace(trim(input), '[^a-z0-9]', '', 'g'));
end;
$$;

-- Helpers de RLS (SECURITY DEFINER para evitar recursión entre políticas).
create or replace function public.is_super_admin()
 returns boolean language sql stable security definer
 set search_path to 'public'
as $$
  select exists (select 1 from public.entrenadores where uid = auth.uid() and rol = 'super_admin');
$$;

create or replace function public.is_client_of_trainer(p_trainer_uid uuid)
 returns boolean language sql stable security definer
 set search_path to 'public'
as $$
  select exists (
    select 1 from public.clientes
    where "trainerId" = p_trainer_uid and auth_user_id = auth.uid()
  );
$$;

create or replace function public.is_team_member_of(p_owner_id uuid)
 returns boolean language sql stable security definer
 set search_path to 'public'
as $$
  select exists (select 1 from team_members where owner_id = p_owner_id and member_uid = auth.uid());
$$;

create or replace function public.is_teammate_of(p_uid uuid)
 returns boolean language sql stable security definer
 set search_path to 'public'
as $$
  select exists (select 1 from team_members where (owner_id = p_uid and member_uid = auth.uid()) or (member_uid = p_uid and owner_id = auth.uid()));
$$;

create or replace function public.find_trainer_by_email(p_email text)
 returns uuid language sql stable security definer
 set search_path to 'public'
as $$
  select uid from entrenadores where email = p_email limit 1;
$$;

-- RPCs públicas (las llama el navegador sin sesión o con la del cliente).
create or replace function public.get_client_by_token(p_token text)
 returns setof clientes language sql security definer
 set search_path to 'public'
as $$
  select * from public.clientes where token = p_token limit 1;
$$;

create or replace function public.claim_client_by_token(p_token text)
 returns void language sql security definer
 set search_path to 'public'
as $$
  update public.clientes
  set auth_user_id = auth.uid()
  where token = p_token and auth_user_id is null;
$$;

create or replace function public.mark_plan_opened(p_token text)
 returns void language sql security definer
 set search_path to 'public'
as $$
  update public.clientes set plan_last_opened_at = now() where token = p_token;
$$;

create or replace function public.get_public_trainer_page(p_slug text)
 returns table("displayName" text, slug text, public_page jsonb)
 language sql stable security definer
 set search_path to 'public'
as $$
  select e."displayName", e.slug, e.public_page
  from public.entrenadores e
  where e.slug = p_slug
    and coalesce((e.public_page->>'activa')::boolean, false) = true
  limit 1;
$$;

create or replace function public.get_trainer_referral_slug(p_trainer_id uuid)
 returns text language sql security definer
 set search_path to 'public'
as $$
  select slug from entrenadores where uid = p_trainer_id and (public_page->>'activa')::boolean = true;
$$;

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
    select id into v_ref_client_id from clientes where token = p_ref and "trainerId" = v_trainer_id;
  end if;

  insert into leads (trainer_id, name, email, phone, message, created_at, referred_by_client_id)
  values (v_trainer_id, p_name, p_email, p_phone, p_message, extract(epoch from now()) * 1000, v_ref_client_id);
end;
$$;

-- Funciones de trigger.
create or replace function public.handle_new_user()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  insert into public.entrenadores (uid, email, "displayName", approved, rol, "createdAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'displayName', split_part(new.email, '@', 1)),
    false,
    'trainer',
    extract(epoch from now()) * 1000
  )
  on conflict (uid) do nothing;
  return new;
end;
$$;

create or replace function public.notify_welcome_email()
 returns trigger language plpgsql security definer
 set search_path to 'public'
as $$
begin
  perform net.http_post(
    url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select secret from public.internal_webhook_secrets where name = 'welcome_email')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'email', new.email,
        'displayName', new."displayName"
      )
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger welcome_email_trigger
  after insert on public.entrenadores
  for each row execute function public.notify_welcome_email();

-- Tarea programada: resumen semanal de check-ins (lunes 09:00 UTC).
-- El secreto 'weekly_digest' se lee de la tabla, nunca va en el comando.
select cron.schedule(
  'weekly-checkin-digest',
  '0 9 * * 1',
  $cron$
  select net.http_post(
    url := 'https://thurxdxazqqxuzbupghv.supabase.co/functions/v1/weekly-checkin-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select secret from public.internal_webhook_secrets where name = 'weekly_digest')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $cron$
);
