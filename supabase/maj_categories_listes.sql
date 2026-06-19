-- ============================================================
--  Listes par catégorie : Alimentaire / Matériel (SANS RIEN EFFACER)
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

alter table public.articles
  add column if not exists categorie text not null default 'alimentaire';

-- Valeurs autorisées : alimentaire / materiel
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'articles_categorie_chk') then
    alter table public.articles
      add constraint articles_categorie_chk check (categorie in ('alimentaire', 'materiel'));
  end if;
end $$;
