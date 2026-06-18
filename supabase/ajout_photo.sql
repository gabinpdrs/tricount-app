-- ============================================================
--  AJOUT PHOTO DE PROFIL — Tricount (SANS RIEN EFFACER)
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

-- 1) Colonne photo sur les profils
alter table public.profiles add column if not exists photo_url text;

-- 2) Espace de stockage "avatars" (lecture publique)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3) Sécurité du stockage
drop policy if exists "avatars_lecture" on storage.objects;
create policy "avatars_lecture" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_envoi" on storage.objects;
create policy "avatars_envoi" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatars_maj" on storage.objects;
create policy "avatars_maj" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

-- 4) Fonction sécurisée pour enregistrer sa propre photo
create or replace function public.set_photo(p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set photo_url = p_url where id = auth.uid();
end; $$;
