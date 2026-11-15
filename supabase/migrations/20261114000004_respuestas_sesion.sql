-- Respuesta rápida del entrenador a una sesión (2026-11-14).
-- Desde la Bandeja, el entrenador contesta a una sesión terminada con una frase o un emoji ("¡Buen trabajo!"). Le llega
-- al cliente con push y la ve en Hoy hasta que la marca como leída.
--   respuestas_sesion  la escribe el entrenador (o su equipo), solo para SUS clientes; el cliente ve las suyas.
--   marcar_respuesta_leida(id)  el cliente marca como leída una respuesta suya (no puede tocar nada más).

create table if not exists public.respuestas_sesion (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clientes(id) on delete cascade,
  trainer_id uuid not null,
  fecha date not null,
  texto text not null check (char_length(texto) between 1 and 500),
  created_at timestamptz not null default now(),
  leida_at timestamptz
);
create index if not exists respuestas_sesion_cliente_idx on public.respuestas_sesion (client_id, created_at desc);

alter table public.respuestas_sesion enable row level security;

drop policy if exists "entrenador_responde_sesiones" on public.respuestas_sesion;
create policy "entrenador_responde_sesiones" on public.respuestas_sesion for all to authenticated
  using ((trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
    and exists (select 1 from public.clientes c where c.id = respuestas_sesion.client_id and c."trainerId" = respuestas_sesion.trainer_id))
  with check ((trainer_id = (select auth.uid()) or public.is_team_member_of(trainer_id))
    and exists (select 1 from public.clientes c where c.id = respuestas_sesion.client_id and c."trainerId" = respuestas_sesion.trainer_id));

drop policy if exists "cliente_ve_sus_respuestas" on public.respuestas_sesion;
create policy "cliente_ve_sus_respuestas" on public.respuestas_sesion for select to authenticated
  using (exists (select 1 from public.clientes c where c.id = respuestas_sesion.client_id and c.auth_user_id = (select auth.uid())));

revoke all on public.respuestas_sesion from anon;

create or replace function public.marcar_respuesta_leida(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update respuestas_sesion r set leida_at = now()
   where r.id = p_id and r.leida_at is null
     and exists (select 1 from clientes c where c.id = r.client_id and c.auth_user_id = auth.uid());
$$;
revoke all on function public.marcar_respuesta_leida(uuid) from public, anon;
grant execute on function public.marcar_respuesta_leida(uuid) to authenticated;
