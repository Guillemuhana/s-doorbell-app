-- ============================================================
-- S-Doorbell — REFERIDOS (regalar 30% a un amigo, 1 canje por usuario)
-- Pegar y ejecutar en: Supabase → SQL Editor → New query
-- (Ejecutar DESPUÉS de setup-supabase.sql)
-- ============================================================
--
-- Cada usuario tiene UN código/link único (usuarios.referral_code). Un amigo lo
-- canjea UNA sola vez (por usuario): al canjear se crea una fila en `referidos`.
-- El unique(referrer_id) garantiza "1 solo canje total" por usuario. El dueño ve
-- el canje en la app y aplica el 30% a mano (no hay checkout todavía).
-- ============================================================

-- Código de referido propio de cada usuario (se genera on-demand desde el back).
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
  -- 1 SOLO CANJE TOTAL por usuario: solo puede existir una fila por referrer.
  unique (referrer_id)
);
create index if not exists idx_referidos_referrer on referidos (referrer_id);
create index if not exists idx_referidos_code on referidos (code);
-- ============================================================
