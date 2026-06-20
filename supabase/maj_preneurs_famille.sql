-- ============================================================
--  "C'est nous" au niveau de la FAMILLE :
--  un membre peut aussi retirer la prise de son coéquipier.
--  À lancer dans Supabase (projet tricount) > SQL Editor > Run.
-- ============================================================

drop policy if exists "preneurs_suppr" on public.article_preneurs;
create policy "preneurs_suppr" on public.article_preneurs for delete to authenticated
using (
  user_id = auth.uid()
  or (select equipe from public.profiles where id = article_preneurs.user_id)
     = (select equipe from public.profiles where id = auth.uid())
);
