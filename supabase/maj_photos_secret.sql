-- ============================================================
--  Photos "surprise" : cachées de tous, révélées par Gabin
--  - plusieurs photos par jour et par enfant
--  - personne ne peut LIRE les photos sauf Gabin (le diaporama)
--  - les enfants peuvent seulement AJOUTER (du 4 au 8 juillet)
--  À lancer dans Supabase > SQL Editor > Run (n'efface rien).
-- ============================================================

-- Plusieurs photos par jour : on retire la limite "une par jour"
alter table public.photos_jour drop constraint if exists photos_jour_user_id_jour_key;

-- On refait les règles d'accès proprement
drop policy if exists "photos_ecriture" on public.photos_jour;
drop policy if exists "photos_lecture" on public.photos_jour;
drop policy if exists "photos_insert" on public.photos_jour;
drop policy if exists "photos_suppr" on public.photos_jour;

-- LECTURE : seulement Gabin (pour le diaporama)
create policy "photos_lecture" on public.photos_jour for select to authenticated
  using ((select prenom from public.profiles where id = auth.uid()) = 'Gabin');

-- AJOUT : les enfants, pour eux-mêmes, du 4 au 8 juillet
create policy "photos_insert" on public.photos_jour for insert to authenticated
  with check (user_id = auth.uid() and public.est_enfant() and jour between date '2026-07-04' and date '2026-07-08');

-- SUPPRESSION : Gabin (pour faire le ménage si besoin)
create policy "photos_suppr" on public.photos_jour for delete to authenticated
  using ((select prenom from public.profiles where id = auth.uid()) = 'Gabin');
