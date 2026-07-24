-- ============================================================
-- S-Doorbell — EDIFICIOS / COMPLEJOS (multi-unidad, admin)
-- Pegar y ejecutar en: Supabase → SQL Editor → New query
-- (Ejecutar DESPUÉS de setup-supabase.sql)
-- ============================================================
--
-- Modelo (reutiliza `direcciones`, sin tablas nuevas):
--   • Un EDIFICIO/COMPLEJO/BARRIO es una fila de `direcciones` con
--     tipo = 'Edificio' y parent_id = NULL. Su dueño (membership rol
--     'dueño') es el ADMINISTRADOR.
--   • Cada UNIDAD (depto/lote/casa) es una `direcciones` con
--     parent_id = <id del edificio> y tipo = 'Unidad'. Cada unidad tiene
--     su propio timbre/QR y sus propios residentes (memberships), igual
--     que una casa suelta.
--   • El TIMBRE DE ENTRADA es un `timbres` (tipo 'Directorio') colgado del
--     edificio: el visitante lo escanea, ve la lista de unidades y elige a
--     quién tocar (cada unidad reusa el pipeline de ring/push existente).
--
-- Solo agrega 2 columnas + 1 índice. Idempotente.
-- ============================================================

alter table direcciones
  add column if not exists parent_id uuid references direcciones(id) on delete cascade;

-- Etiqueta de la unidad dentro del edificio (ej: "4°B", "Lote 12", "PB").
alter table direcciones
  add column if not exists unidad text;

create index if not exists idx_direcciones_parent on direcciones (parent_id);

-- Nota: el rol de administrador NO requiere DDL: `memberships.rol` es texto
-- libre y ya admite 'dueño' | 'admin' | 'familiar' | 'colaborador'. El
-- administrador del edificio es el 'dueño' de la fila-edificio.
-- ============================================================
