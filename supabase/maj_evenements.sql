-- ============================================================
--  MAJ Planning — heure de fin, lieu, description (SANS RIEN EFFACER)
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

alter table public.activites add column if not exists heure_fin text;
alter table public.activites add column if not exists lieu text;
alter table public.activites add column if not exists description text;
