-- ============================================================
--  ⚠️ MODE TEST — autorise l'envoi de photos à n'importe quelle date
--  (les enfants peuvent ajouter même avant le 4 juillet)
--  À lancer dans Supabase > SQL Editor > Run.
--  >>> PENSE À RELANCER "remettre_securite_photos.sql" après le test <<<
-- ============================================================

drop policy if exists "photos_insert" on public.photos_jour;
create policy "photos_insert" on public.photos_jour for insert to authenticated
  with check (user_id = auth.uid() and public.est_enfant());
