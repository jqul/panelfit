-- Prueba de migrations/20261028000004_submit_lead_validacion_y_limites.sql
-- (el formulario de la página pública exige un correo o teléfono válido, recorta lo largo, no duplica el mismo
-- contacto en 24 h y limita a 10 por hora y entrenador; la atribución por código de recomendación sigue funcionando).
--
-- EJECUTAR SOLO EN UN BRANCH / ENTORNO DE PRUEBAS, NUNCA EN PRODUCCIÓN.
-- Solo tiene sentido DESPUÉS de aplicar la migración. Todo ocurre dentro de una transacción que termina en ROLLBACK.

begin;

create temp table resultados (caso text, ok boolean, detalle text) on commit drop;
grant all on resultados to public;

-- El aviso (trigger) no es lo que se prueba aquí: net.http_post no existe en PGlite y el trigger lo tolera.
alter table public.entrenadores disable trigger welcome_email_trigger;
insert into public.entrenadores (uid, email, "displayName", approved, rol, role, slug, public_page) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 't1@test.local', 'Entrenador 1', true, 'trainer', 'trainer', 'entrenador1', '{"activa": true}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 't2@test.local', 'Entrenador 2', true, 'trainer', 'trainer', 'entrenador2', '{"activa": true}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 't3@test.local', 'Entrenador 3', true, 'trainer', 'trainer', 'inactivo', '{"activa": false}');
insert into public.clientes (id, "trainerId", name, token) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Cliente de 1', 'token-del-cliente-1');

-- Intenta un envío como anónimo y devuelve el texto del error ('' si fue bien)
create function pg_temp.enviar(p_slug text, p_name text, p_email text, p_phone text, p_message text, p_ref text default null) returns text language plpgsql as $f$
begin
  set local role anon;
  perform public.submit_lead(p_slug, p_name, p_email, p_phone, p_message, p_ref);
  reset role;
  return '';
exception when others then
  reset role;
  return sqlerrm;
end $f$;
grant execute on function pg_temp.enviar(text, text, text, text, text, text) to public;
-- Una consulta no ve lo que inserta la función llamada en ella misma: los envíos se hacen en su propia sentencia
-- y las comprobaciones, después, leyendo su resultado de aquí.
create temp table salidas (clave text, err text);
grant all on salidas to public;

-- ── Lo que se rechaza ──
insert into resultados select '1a sin correo ni teléfono se rechaza', pg_temp.enviar('entrenador1', 'Ana', null, null, 'hola') like 'Déjame un correo o un teléfono%', pg_temp.enviar('entrenador1', 'Ana', '', '  ', 'hola');
insert into resultados select '1b correo con mala forma se rechaza', pg_temp.enviar('entrenador1', 'Ana', 'ana@', null, null) = 'El correo no parece válido', 'ana@';
insert into resultados select '1c teléfono con letras o muy corto se rechaza', pg_temp.enviar('entrenador1', 'Ana', null, '12345', null) = 'El teléfono no parece válido' and pg_temp.enviar('entrenador1', 'Ana', null, 'llámame mañana', null) = 'El teléfono no parece válido', '12345 / texto';
insert into resultados select '1d sin nombre se rechaza', pg_temp.enviar('entrenador1', '   ', 'ana@example.com', null, null) = 'Escribe tu nombre', 'vacío';
insert into resultados select '1e un mensaje de más de 1000 caracteres se rechaza', pg_temp.enviar('entrenador1', 'Ana', 'ana@example.com', null, repeat('x', 1001)) = 'El mensaje es demasiado largo', '1001';
insert into resultados select '1f una página inexistente o inactiva se rechaza', pg_temp.enviar('nadie', 'Ana', 'ana@example.com', null, null) = 'Página no encontrada o inactiva' and pg_temp.enviar('inactivo', 'Ana', 'ana@example.com', null, null) = 'Página no encontrada o inactiva', 'nadie / inactivo';
insert into resultados select '1g nada de lo rechazado ha dejado filas', count(*) = 0, count(*)::text from public.leads;

-- ── Lo que entra ──
insert into resultados select '2a con correo válido entra (correo en minúsculas, recortado)', pg_temp.enviar('entrenador1', '  Paula Navarro ', ' Paula@Example.COM ', null, '  Quiero fuerza ') = '', 'ok';
insert into resultados select '2b con teléfono válido entra', pg_temp.enviar('entrenador1', 'Sergio', null, '+34 622 11 22 33', null) = '', 'ok';
insert into resultados select '2c lo guardado está limpio',
  count(*) = 2 and bool_or(name = 'Paula Navarro' and email = 'paula@example.com' and message = 'Quiero fuerza' and status = 'nuevo')
  and bool_or(name = 'Sergio' and phone = '+34 622 11 22 33' and email is null and message is null), count(*)::text || ' filas'
from public.leads;

-- ── No se duplica el mismo contacto en 24 h ──
insert into resultados select '3a repetir el mismo correo (aunque cambie el nombre) no da error ni duplica',
  pg_temp.enviar('entrenador1', 'Otra Paula', 'PAULA@example.com', null, null) = '' and (select count(*) from public.leads where lower(email) = 'paula@example.com') = 1, 'sigue 1';
insert into resultados select '3b repetir el mismo teléfono con otro formato tampoco duplica',
  pg_temp.enviar('entrenador1', 'Sergio B', null, '34622112233', null) = '' and pg_temp.enviar('entrenador1', 'Sergio B', null, '+34 622-11-22-33', null) = '' and (select count(*) from public.leads where name like 'Sergio%') = 1, 'sigue 1';
insert into salidas select '3c', pg_temp.enviar('entrenador2', 'Paula Navarro', 'paula@example.com', null, null);
insert into resultados select '3c el mismo correo en OTRO entrenador sí entra',
  (select err from salidas where clave = '3c') = '' and (select count(*) from public.leads where lower(email) = 'paula@example.com') = 2, '2 en total';
-- Pasadas 24 h, ya no cuenta como repetido
update public.leads set created_at = created_at - 90000000 where name = 'Paula Navarro' and trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into salidas select '3d', pg_temp.enviar('entrenador1', 'Paula Navarro', 'paula@example.com', null, null);
insert into resultados select '3d pasadas 24 h el mismo correo vuelve a entrar',
  (select err from salidas where clave = '3d') = '' and (select count(*) from public.leads where lower(email) = 'paula@example.com' and trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 2, '2 de ese entrenador';

-- ── Tope de 10 por hora y entrenador ──
do $$ declare i int; begin
  for i in 1..20 loop
    perform pg_temp.enviar('entrenador1', 'Robot ' || i, 'robot' || i || '@example.com', null, null);
  end loop;
end $$;
insert into resultados select '4a como mucho 10 contactos por hora y entrenador',
  (select count(*) from public.leads where trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001' and created_at > (extract(epoch from now()) * 1000) - 3600000) = 10, '10';
insert into resultados select '4b pasado el tope el error es claro', pg_temp.enviar('entrenador1', 'Otro', 'otro@example.com', null, null) like 'Demasiados mensajes en poco tiempo%', 'tope';
insert into resultados select '4c el tope de un entrenador no afecta a otro', pg_temp.enviar('entrenador2', 'Marta', 'marta@example.com', null, null) = '', 'ok';

-- ── La atribución por código de recomendación sigue funcionando ──
delete from public.leads where trainer_id = 'aaaaaaaa-0000-0000-0000-000000000001';
insert into salidas select '5a', pg_temp.enviar('entrenador1', 'Referida', 'referida@example.com', null, null, left(encode(sha256(convert_to('token-del-cliente-1', 'UTF8')), 'hex'), 16));
insert into salidas select '5b', pg_temp.enviar('entrenador1', 'Sin referir', 'sin@example.com', null, null, 'codigo-ajeno');
insert into resultados select '5 con el código de un cliente suyo queda "referido por"; con uno ajeno, no',
  (select count(*) from salidas where clave in ('5a', '5b') and err = '') = 2
  and (select referred_by_client_id from public.leads where name = 'Referida') = '11111111-0000-0000-0000-000000000001'
  and (select referred_by_client_id from public.leads where name = 'Sin referir') is null, 'ok';

select caso, case when ok then 'OK' else 'FALLA' end as resultado, detalle from resultados order by caso;

rollback;
