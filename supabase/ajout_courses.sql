-- ============================================================
--  LISTES DE COURSES — version "collective + perso"
--  - Liste COLLECTIVE : visible et modifiable par tout le monde
--  - MA liste (perso)  : visible et modifiable par son propriétaire seulement
--  À lancer dans Supabase > SQL Editor > Run
--  (Ne touche PAS aux dépenses / soldes / comptes.)
-- ============================================================

-- On repart propre sur la partie "courses" uniquement
drop table if exists public.articles cascade;
drop table if exists public.listes_courses cascade;

create table public.articles (
  id bigint generated always as identity primary key,
  nom text not null,
  quantite int not null default 1 check (quantite > 0),
  -- 'collectif' = liste partagée ; 'perso' = liste privée du joueur
  portee text not null default 'collectif' check (portee in ('collectif', 'perso')),
  ajoute_par uuid references public.profiles(id),
  achete boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.articles enable row level security;

-- LECTURE : articles collectifs visibles par tous ; articles perso visibles par leur proprio
drop policy if exists "articles_lecture" on public.articles;
create policy "articles_lecture" on public.articles for select to authenticated
  using (portee = 'collectif' or ajoute_par = auth.uid());

-- AJOUT : on ajoute toujours pour soi
drop policy if exists "articles_insert" on public.articles;
create policy "articles_insert" on public.articles for insert to authenticated
  with check (ajoute_par = auth.uid());

-- MODIF (cocher) : collectif par tous, perso par le proprio
drop policy if exists "articles_maj" on public.articles;
create policy "articles_maj" on public.articles for update to authenticated
  using (portee = 'collectif' or ajoute_par = auth.uid())
  with check (portee = 'collectif' or ajoute_par = auth.uid());

-- SUPPRESSION : collectif par tous, perso par le proprio
drop policy if exists "articles_suppr" on public.articles;
create policy "articles_suppr" on public.articles for delete to authenticated
  using (portee = 'collectif' or ajoute_par = auth.uid());
