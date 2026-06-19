-- ============================================================
--  Plusieurs personnes peuvent "s'en occuper" d'un article
--  (utile surtout pour le matériel) — SANS RIEN EFFACER
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

create table if not exists public.article_preneurs (
  id bigint generated always as identity primary key,
  article_id bigint not null references public.articles(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  unique (article_id, user_id)
);

alter table public.article_preneurs enable row level security;

drop policy if exists "preneurs_lecture" on public.article_preneurs;
create policy "preneurs_lecture" on public.article_preneurs for select to authenticated using (true);

-- Chacun ne peut s'inscrire / se retirer que lui-même
drop policy if exists "preneurs_insert" on public.article_preneurs;
create policy "preneurs_insert" on public.article_preneurs for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "preneurs_suppr" on public.article_preneurs;
create policy "preneurs_suppr" on public.article_preneurs for delete to authenticated using (user_id = auth.uid());
