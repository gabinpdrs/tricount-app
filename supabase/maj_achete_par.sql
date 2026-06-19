-- ============================================================
--  Courses : mémoriser QUI a coché un article (SANS RIEN EFFACER)
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

alter table public.articles add column if not exists achete_par uuid references public.profiles(id);
