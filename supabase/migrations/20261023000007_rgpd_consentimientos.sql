-- Bloque 9 (RGPD, 2026-10-23): historial de consentimientos de solo añadir.

create table if not exists public.consentimientos (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid not null,
  version text not null,
  salud boolean not null,
  fotos boolean not null default false,
  accepted_at timestamptz not null default now(),
  constraint consentimientos_pkey primary key (id),
  constraint "consentimientos_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);
create index if not exists idx_consentimientos_client on public.consentimientos ("clientId", accepted_at desc);
alter table public.consentimientos enable row level security;

create policy client_inserts_own_consent on public.consentimientos for insert to authenticated
  with check (exists (select 1 from public.clientes c
    where c.id = consentimientos."clientId" and c.auth_user_id = (select auth.uid())));

create policy client_or_trainer_reads_consent on public.consentimientos for select to authenticated
  using (exists (select 1 from public.clientes c
    where c.id = consentimientos."clientId"
      and (c.auth_user_id = (select auth.uid()) or c."trainerId" = (select auth.uid())
           or is_super_admin() or is_team_member_of(c."trainerId"))));
