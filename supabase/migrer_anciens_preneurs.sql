-- ============================================================
--  Récupère les anciens "c'est moi" (colonne pris_par) et les
--  recopie dans la nouvelle table article_preneurs.
--  À lancer UNE FOIS dans Supabase > SQL Editor > Run.
--  (Sans danger, ne crée pas de doublon.)
-- ============================================================

insert into public.article_preneurs (article_id, user_id)
select id, pris_par
from public.articles
where pris_par is not null
on conflict (article_id, user_id) do nothing;
