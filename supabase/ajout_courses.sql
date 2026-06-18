-- ============================================================
--  AJOUT LISTES DE COURSES — Tricount (SANS RIEN EFFACER)
--  À lancer dans Supabase > SQL Editor > Run
--  (Que des "create" : dépenses, soldes et comptes intacts.)
-- ============================================================

-- 1) Les listes de courses (ex : "Camping", "Apéro"...)
create table if not exists public.listes_courses (
  id bigint generated always as identity primary key,
  nom text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 2) Les articles d'une liste (avec quantité + qui l'a ajouté)
create table if not exists public.articles (
  id bigint generated always as identity primary key,
  liste_id bigint not null references public.listes_courses(id) on delete cascade,
  nom text not null,
  quantite int not null default 1 check (quantite > 0),
  ajoute_par uuid references public.profiles(id),
  achete boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3) Sécurité (RLS) — entre amis, tout le monde peut tout gérer
alter table public.listes_courses enable row level security;
alter table public.articles       enable row level security;

drop policy if exists "listes_lecture" on public.listes_courses;
create policy "listes_lecture" on public.listes_courses for select to authenticated using (true);
drop policy if exists "listes_insert" on public.listes_courses;
create policy "listes_insert" on public.listes_courses for insert to authenticated with check (true);
drop policy if exists "listes_suppr" on public.listes_courses;
create policy "listes_suppr" on public.listes_courses for delete to authenticated using (true);

drop policy if exists "articles_lecture" on public.articles;
create policy "articles_lecture" on public.articles for select to authenticated using (true);
drop policy if exists "articles_insert" on public.articles;
create policy "articles_insert" on public.articles for insert to authenticated with check (true);
drop policy if exists "articles_maj" on public.articles;
create policy "articles_maj" on public.articles for update to authenticated using (true) with check (true);
drop policy if exists "articles_suppr" on public.articles;
create policy "articles_suppr" on public.articles for delete to authenticated using (true);

-- 4) Une liste d'exemple "Camping" (seulement si aucune liste n'existe)
insert into public.listes_courses (nom)
select 'Camping'
where not exists (select 1 from public.listes_courses);
