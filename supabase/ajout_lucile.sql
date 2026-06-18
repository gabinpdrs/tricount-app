-- ============================================================
--  RÔLE "COCHEUSE" (Lucile) — SANS RIEN EFFACER
--  Lucile peut seulement cocher les articles achetés.
--
--  ⚠️ Crée D'ABORD le compte de Lucile dans
--     Authentication > Users (email lucile@tricount.local,
--     mot de passe Lucile1, Auto Confirm coché),
--     PUIS lance ce script.
-- ============================================================

-- 1) Un drapeau sur les profils : true = ne peut que cocher
alter table public.profiles
  add column if not exists peut_seulement_cocher boolean not null default false;

-- 2) On active ce mode pour Lucile
update public.profiles
set peut_seulement_cocher = true
where prenom = 'Lucile';
