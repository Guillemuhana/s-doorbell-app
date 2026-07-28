-- ============================================================
-- S-Doorbell — geo_preciso (bloqueo por distancia solo con GPS preciso)
-- Pegar y ejecutar en: Supabase → SQL Editor → New query → Run. Idempotente.
-- ============================================================
--
-- El bloqueo por distancia del geofence (rechazar visitantes lejanos) SOLO debe
-- aplicar cuando la ubicación de la casa fue fijada con GPS parado en la puerta
-- (preciso). Una dirección geocodificada por texto es aproximada (nivel de
-- calle) y no debe rechazar visitantes. Esta bandera distingue ambos casos.
-- ============================================================

alter table direcciones
  add column if not exists geo_preciso boolean default false;
-- ============================================================
