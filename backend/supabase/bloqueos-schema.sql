-- ============================================================
-- S-Doorbell — BLOQUEOS de visitantes (que no molesten)
-- Pegar y ejecutar en: Supabase → SQL Editor → New query → Run
-- Idempotente.
-- ============================================================
--
-- El residente puede BLOQUEAR a un visitante. Se identifica al visitante por un
-- id persistente de su navegador (localStorage, `visitor_id`) y/o por IP. Si un
-- visitante bloqueado toca el timbre, NO se notifica a nadie (y él no se entera).
-- El bloqueo es POR DIRECCIÓN.
-- ============================================================

create table if not exists bloqueos (
  id uuid primary key default gen_random_uuid(),
  direccion_id uuid not null references direcciones(id) on delete cascade,
  visitor_id text,                 -- fingerprint del navegador del visitante
  visitor_ip text,
  visitor_name text,
  motivo text,
  created_by uuid references usuarios(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_bloqueos_direccion on bloqueos (direccion_id);
create index if not exists idx_bloqueos_visitor on bloqueos (direccion_id, visitor_id);
create index if not exists idx_bloqueos_ip on bloqueos (direccion_id, visitor_ip);
-- ============================================================
