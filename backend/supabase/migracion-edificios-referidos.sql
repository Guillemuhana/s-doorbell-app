-- ============================================================
-- S-Doorbell — MIGRACIÓN: Edificios/complejos + Referidos (30% off)
-- Pegar TODO en: Supabase → SQL Editor → New query → Run
-- Idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================

-- ─── 1) EDIFICIOS / COMPLEJOS / BARRIOS ─────────────────────
-- Un edificio es una `direcciones` con tipo='Edificio'; las unidades son
-- `direcciones` hijas (parent_id). El administrador es el 'dueño' del edificio.
alter table direcciones
  add column if not exists parent_id uuid references direcciones(id) on delete cascade;
alter table direcciones
  add column if not exists unidad text;
create index if not exists idx_direcciones_parent on direcciones (parent_id);

-- ─── 2) REFERIDOS (regalar 30% a un amigo, 1 canje por usuario) ──
alter table usuarios
  add column if not exists referral_code text unique;

create table if not exists referidos (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references usuarios(id) on delete cascade,
  code text not null,
  amigo_nombre text,
  amigo_email text,
  descuento int not null default 30,
  estado text not null default 'canjeado',   -- canjeado | aplicado
  created_at timestamptz default now(),
  redeemed_at timestamptz default now(),
  applied_at timestamptz,
  unique (referrer_id)                        -- 1 solo canje total por usuario
);
create index if not exists idx_referidos_referrer on referidos (referrer_id);
create index if not exists idx_referidos_code on referidos (code);

-- ============================================================
-- Fin. Debería decir "Success. No rows returned".
-- ============================================================
