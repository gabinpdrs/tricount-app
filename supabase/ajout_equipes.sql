-- ============================================================
--  ÉQUIPES (binômes) — Tricount (SANS RIEN EFFACER)
--  Chaque équipe = 2 comptes : leur solde et leur liste perso
--  sont mis en commun.
--  ⚠️ Les 10 comptes doivent exister AVANT de lancer ce script.
-- ============================================================

-- 1) Colonne "equipe" sur les profils
alter table public.profiles add column if not exists equipe text;

-- 2) Les binômes (le nom de l'équipe est le même pour les 2)
update public.profiles set equipe = 'Poderos & Gabin'    where prenom in ('Poderos', 'Gabin');
update public.profiles set equipe = 'Sataa & Fares'       where prenom in ('Sataa', 'Fares');
update public.profiles set equipe = 'Bethuel & Baptiste'  where prenom in ('Bethuel', 'Baptiste');
update public.profiles set equipe = 'Pagnon & Lisa'       where prenom in ('Pagnon', 'Lisa');
update public.profiles set equipe = 'Jacquet & Meline'    where prenom in ('Jacquet', 'Meline');

-- 3) RLS : la liste perso est partagée au sein de l'équipe
--    (chaque coéquipier voit / modifie / supprime les articles de l'autre)
drop policy if exists "articles_lecture" on public.articles;
create policy "articles_lecture" on public.articles for select to authenticated
using (
  portee = 'collectif'
  or ajoute_par = auth.uid()
  or ajoute_par in (
    select p.id from public.profiles p
    where p.equipe is not null
      and p.equipe = (select equipe from public.profiles where id = auth.uid())
  )
);

drop policy if exists "articles_maj" on public.articles;
create policy "articles_maj" on public.articles for update to authenticated
using (
  portee = 'collectif'
  or ajoute_par = auth.uid()
  or ajoute_par in (select p.id from public.profiles p where p.equipe is not null and p.equipe = (select equipe from public.profiles where id = auth.uid()))
)
with check (
  portee = 'collectif'
  or ajoute_par = auth.uid()
  or ajoute_par in (select p.id from public.profiles p where p.equipe is not null and p.equipe = (select equipe from public.profiles where id = auth.uid()))
);

drop policy if exists "articles_suppr" on public.articles;
create policy "articles_suppr" on public.articles for delete to authenticated
using (
  portee = 'collectif'
  or ajoute_par = auth.uid()
  or ajoute_par in (select p.id from public.profiles p where p.equipe is not null and p.equipe = (select equipe from public.profiles where id = auth.uid()))
);
