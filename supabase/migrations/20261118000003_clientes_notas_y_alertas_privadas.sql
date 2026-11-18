-- Observaciones privadas y alertas del entrenador fuera de `clientes` (2026-11-18).
--
-- Hallazgo (segunda fuga, hermana de 20261118000002): `clientes` tiene la política client_reads_own_cliente (SELECT de su propia
-- fila) y `authenticated` tiene SELECT sobre todas las columnas, así que un cliente con cuenta podía leer con
-- `from('clientes').select('*')` las columnas `notas_privadas` (la caja «Notas privadas» del Perfil) y `alerts` (recordatorios
-- del entrenador sobre él: «llamar», «revisión»…). get_client_by_token ya las devuelve a null, pero la lectura directa no estaba
-- protegida, y la política no se puede quitar: otras políticas (planes, registros…) consultan la fila del cliente.
--
-- Se mueven a la tabla solo-entrenador que ya existe (notas_privadas_cliente: RLS entrenador/equipo, sin política para el cliente,
-- en client_data_tables, cascada con el cliente):
--   observaciones  lo que antes estaba en clientes.notas_privadas (la caja del Perfil; `notas` es la sección «Notas privadas» de la
--                  ficha, que son otra cosa en la app)
--   alertas        lo que antes estaba en clientes.alerts
-- Datos: se copian, se COMPRUEBA que cada valor quedó idéntico (si no, la migración aborta sin tocar nada) y solo entonces las
-- columnas viejas se dejan vacías ('' y '[]'). Las columnas NO se borran (get_client_by_token devuelve SETOF clientes y depende del
-- orden de columnas): un disparador las mantiene vacías para siempre, así una pestaña antigua del entrenador no las reescribe.
-- Prueba: hardening/tests/bloque31_clientes_notas_y_alertas.sql (run-pglite-clientes-notas-alertas.mjs).

alter table public.notas_privadas_cliente
  add column if not exists observaciones text not null default '' check (char_length(observaciones) <= 200000),
  add column if not exists alertas jsonb not null default '[]'::jsonb check (jsonb_typeof(alertas) = 'array');

-- ── Migración de datos ──
-- 1) Copiar lo que haya (observaciones con texto o alertas no vacías)
create temp table _origen_privado on commit drop as
select c.id as client_id, c."trainerId" as trainer_id,
       coalesce(c.notas_privadas, '') as observaciones,
       case when jsonb_typeof(c.alerts) = 'array' then c.alerts else '[]'::jsonb end as alertas
from public.clientes c
where nullif(btrim(coalesce(c.notas_privadas, '')), '') is not null
   or (jsonb_typeof(c.alerts) = 'array' and jsonb_array_length(c.alerts) > 0);

insert into public.notas_privadas_cliente (client_id, trainer_id, observaciones, alertas)
select client_id, trainer_id, observaciones, alertas from _origen_privado
on conflict (client_id) do update set observaciones = excluded.observaciones, alertas = excluded.alertas;

-- 2) Comprobar que NADA se queda sin copia idéntica; si falla, se aborta y no se vacía nada
do $$
declare n int;
begin
  select count(*) into n
  from _origen_privado o
  where not exists (select 1 from public.notas_privadas_cliente x
                    where x.client_id = o.client_id and x.observaciones = o.observaciones and x.alertas = o.alertas);
  if n > 0 then
    raise exception 'clientes -> notas_privadas_cliente: % filas sin copia fiel; no se vacía nada de clientes', n;
  end if;
end $$;

-- 3) Vaciar las columnas que el cliente puede leer
update public.clientes set notas_privadas = '' where coalesce(notas_privadas, '') <> '';
update public.clientes set alerts = '[]'::jsonb where coalesce(alerts, '[]'::jsonb) <> '[]'::jsonb;

-- 4) Cinturón y tirantes: esas columnas no pueden volver a guardar nada (una pestaña antigua, otro escritor). Las ediciones que
--    llegaran por esa vía se descartan: la app nueva ya escribe en notas_privadas_cliente.
create or replace function public.clientes_sin_notas_privadas()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  new.notas_privadas := '';
  new.alerts := '[]'::jsonb;
  return new;
end;
$function$;
revoke execute on function public.clientes_sin_notas_privadas() from public, anon, authenticated;

drop trigger if exists clientes_sin_notas_privadas on public.clientes;
create trigger clientes_sin_notas_privadas
  before insert or update of notas_privadas, alerts on public.clientes
  for each row
  when (coalesce(new.notas_privadas, '') <> '' or coalesce(new.alerts, '[]'::jsonb) <> '[]'::jsonb)
  execute function public.clientes_sin_notas_privadas();
