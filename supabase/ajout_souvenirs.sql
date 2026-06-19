-- ============================================================
--  SOUVENIRS — Photo du jour (4 au 8 juillet 2026)
--  Chaque enfant : 1 photo par jour, uniquement pendant le séjour.
--  À lancer dans Supabase > SQL Editor > Run (n'efface rien).
-- ============================================================

-- Fonction "est enfant ?" (au cas où le planning n'aurait pas été lancé)
create or replace function public.est_enfant()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select a_liste_perso from public.profiles where id = auth.uid()), false);
$$;

-- Espace de stockage des photos souvenirs
insert into storage.buckets (id, name, public)
values ('souvenirs', 'souvenirs', true)
on conflict (id) do nothing;

drop policy if exists "souvenirs_lecture" on storage.objects;
create policy "souvenirs_lecture" on storage.objects for select using (bucket_id = 'souvenirs');
drop policy if exists "souvenirs_envoi" on storage.objects;
create policy "souvenirs_envoi" on storage.objects for insert to authenticated with check (bucket_id = 'souvenirs');
drop policy if exists "souvenirs_maj" on storage.objects;
create policy "souvenirs_maj" on storage.objects for update to authenticated using (bucket_id = 'souvenirs');

-- Une photo par enfant et par jour
create table if not exists public.photos_jour (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id),
  jour date not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, jour)
);

alter table public.photos_jour enable row level security;

-- Lecture : tout le monde voit les photos
drop policy if exists "photos_lecture" on public.photos_jour;
create policy "photos_lecture" on public.photos_jour for select to authenticated using (true);

-- Écriture : seulement les enfants, pour eux-mêmes, du 4 au 8 juillet
drop policy if exists "photos_ecriture" on public.photos_jour;
create policy "photos_ecriture" on public.photos_jour for all to authenticated
  using (user_id = auth.uid() and public.est_enfant() and jour between date '2026-07-04' and date '2026-07-08')
  with check (user_id = auth.uid() and public.est_enfant() and jour between date '2026-07-04' and date '2026-07-08');
