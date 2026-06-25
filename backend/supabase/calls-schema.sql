-- ============================================================
-- S-Doorbell — Videollamada de timbre (WebRTC signaling)
-- Pegar y ejecutar en: Supabase → SQL Editor → New query
-- (Ejecutar DESPUÉS de schema.sql)
-- ============================================================

-- ─── CALL SESSIONS (una videollamada de timbre) ─────────────
create table if not exists call_sessions (
  id uuid primary key default gen_random_uuid(),
  direccion_id uuid not null references direcciones(id) on delete cascade,
  timbre_id uuid references timbres(id) on delete set null,
  evento_id uuid references eventos(id) on delete set null,
  visitor_name text,
  estado text not null default 'ringing',   -- ringing|accepted|rejected|ended|timeout
  answered_by uuid references usuarios(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  ended_at timestamptz
);
create index if not exists idx_call_sessions_direccion on call_sessions (direccion_id, created_at desc);
create index if not exists idx_call_sessions_estado on call_sessions (estado, created_at desc);

-- ─── CALL SIGNALS (offer/answer/ICE entre los dos peers) ────
-- `seq` (bigserial) da un cursor monótono para el polling incremental.
create table if not exists call_signals (
  id uuid primary key default gen_random_uuid(),
  seq bigserial,
  call_id uuid not null references call_sessions(id) on delete cascade,
  emisor text not null,            -- 'visitor' | 'resident'
  tipo text not null,              -- 'offer' | 'answer' | 'ice'
  payload jsonb not null,
  created_at timestamptz default now()
);
create index if not exists idx_call_signals_poll on call_signals (call_id, emisor, seq);

-- ============================================================
-- Limpieza opcional de sesiones viejas (ejecutar a mano o por cron):
--   delete from call_sessions where created_at < now() - interval '1 day';
-- (call_signals se borra en cascada).
-- ============================================================
