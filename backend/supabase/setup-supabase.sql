-- ============================================================
-- S-Doorbell — SETUP COMPLETO (schema base + videollamadas)
-- Pegar TODO en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ============================================================
-- S-Doorbell — Schema PostgreSQL para Supabase
-- Pegar y ejecutar en: Supabase → SQL Editor → New query
-- ============================================================

-- Extensión para uuid (gen_random_uuid ya viene en pgcrypto/pg13+)
create extension if not exists "pgcrypto";

-- ─── USUARIOS ───────────────────────────────────────────────
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  email text not null unique,
  password text not null,                 -- hash bcrypt
  telefono text default '',
  foto_fachada text,
  push_token text,
  push_token_updated_at timestamptz,
  is_active boolean default true,
  forzar_cambio_password boolean default false,  -- para credenciales provisorias
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_usuarios_email on usuarios (lower(email));

-- ─── DIRECCIONES ────────────────────────────────────────────
create table if not exists direcciones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references usuarios(id) on delete cascade,
  nombre text not null,
  tipo text default 'Casa',
  direccion text default '',
  foto text,
  lat double precision,                   -- ubicación de la puerta (modo geo)
  lng double precision,
  activa boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_direcciones_owner on direcciones (owner_id);

-- ─── MEMBERSHIPS (usuario ↔ dirección + rol) ────────────────
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  direccion_id uuid not null references direcciones(id) on delete cascade,
  rol text not null default 'familiar',   -- 'dueño' | 'familiar' | 'colaborador'
  estado text not null default 'activo',  -- 'activo' | 'inactivo'
  created_at timestamptz default now(),
  unique (usuario_id, direccion_id)
);
create index if not exists idx_memberships_usuario on memberships (usuario_id);
create index if not exists idx_memberships_direccion on memberships (direccion_id);

-- ─── TIMBRES (dueños del QR) ────────────────────────────────
create table if not exists timbres (
  id uuid primary key default gen_random_uuid(),
  direccion_id uuid not null references direcciones(id) on delete cascade,
  nombre text not null default 'Puerta',
  tipo text default 'Timbre particular',
  qr_id uuid not null unique default gen_random_uuid(),
  qr_image text,                          -- data URL base64 del QR
  activo boolean default true,
  modo_geo boolean default false,         -- pedir ubicación al visitante
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_timbres_direccion on timbres (direccion_id);
create index if not exists idx_timbres_qr on timbres (qr_id);

-- ─── INVITACIONES ───────────────────────────────────────────
create table if not exists invitaciones (
  id uuid primary key default gen_random_uuid(),
  direccion_id uuid not null references direcciones(id) on delete cascade,
  invitado_por uuid not null references usuarios(id) on delete cascade,
  email text not null,
  rol text default 'familiar',
  token uuid not null unique default gen_random_uuid(),
  estado text default 'pendiente',        -- pendiente|aceptada|rechazada|expirada
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);
create index if not exists idx_invitaciones_token on invitaciones (token);
create index if not exists idx_invitaciones_direccion on invitaciones (direccion_id, estado);

-- ─── EVENTOS (timbrazos, escaneos, etc.) ────────────────────
create table if not exists eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references usuarios(id) on delete cascade,
  direccion_id uuid references direcciones(id) on delete cascade,
  timbre_id uuid references timbres(id) on delete set null,
  tipo text not null default 'timbrazo',  -- timbrazo|vista_qr|login|logout
  visitor_ip text default 'unknown',
  visitor_name text,
  user_agent text,
  -- Geo del visitante
  visitor_lat double precision,
  visitor_lng double precision,
  visitor_accuracy double precision,
  distancia_metros integer,
  ubicacion_verificada boolean,
  notification_sent boolean default false,
  notification_error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_eventos_user on eventos (user_id, created_at desc);
create index if not exists idx_eventos_direccion on eventos (direccion_id, created_at desc);

-- ============================================================
-- Nota: el backend usa la SERVICE ROLE KEY (acceso completo),
-- así que RLS no es estrictamente necesaria. Si más adelante el
-- cliente accede directo a Supabase, habilitar RLS por tabla.
-- ============================================================


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
