-- ============================================================
--  Courses : "c'est moi qui m'en occupe" (réserver un article)
--  À lancer dans Supabase > SQL Editor > Run (n'efface rien).
--  La colonne existe peut-être déjà : c'est sans risque.
-- ============================================================

alter table public.articles add column if not exists pris_par uuid references public.profiles(id);
