-- Aviso de fin de descanso con el móvil bloqueado. Cuando el cliente empieza un descanso, su app marca aquí un token
-- y llama a la función fin-descanso, que espera los segundos del descanso y le manda un push ("¡A por la siguiente
-- serie!") solo si el token sigue siendo el mismo. Si salta el descanso, lo alarga o lo pausa, la app cambia o borra el
-- token y ese aviso ya no sale. Una fila por cliente; nadie la lee ni la escribe directamente: solo con la función de
-- abajo (el cliente, la suya) y con la clave de servicio (la función de Edge).

create table if not exists public.descansos (
  client_id uuid primary key references public.clientes(id) on delete cascade,
  token text not null check (char_length(token) between 8 and 64),
  fin_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.descansos enable row level security;
revoke all on public.descansos from anon, authenticated;

-- Marca (o, con p_token null, cancela) el descanso en curso del cliente que llama. Devuelve su id de cliente.
create or replace function public.marcar_descanso(p_token text, p_segundos integer default 0)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
begin
  select id into v_client from public.clientes where auth_user_id = (select auth.uid()) limit 1;
  if v_client is null then
    raise exception 'No eres un cliente' using errcode = '42501';
  end if;
  if p_token is null then
    delete from public.descansos where client_id = v_client;
    return v_client;
  end if;
  if p_segundos is null or p_segundos < 1 or p_segundos > 900 then
    raise exception 'Descanso fuera de rango' using errcode = '22023';
  end if;
  insert into public.descansos (client_id, token, fin_at, updated_at)
  values (v_client, p_token, now() + make_interval(secs => p_segundos), now())
  on conflict (client_id) do update set token = excluded.token, fin_at = excluded.fin_at, updated_at = now();
  return v_client;
end;
$$;

revoke all on function public.marcar_descanso(text, integer) from public, anon;
grant execute on function public.marcar_descanso(text, integer) to authenticated;

-- Secreto con el que la función fin-descanso se vuelve a llamar a sí misma en los descansos largos (cada llamada dura
-- como mucho unos 2 minutos). Vive solo en la base de datos, nunca en el código.
insert into public.internal_webhook_secrets (name, secret)
values ('fin_descanso', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;
