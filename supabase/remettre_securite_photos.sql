-- ============================================================
--  Remet la sécurité : envoi de photos seulement du 4 au 8 juillet
--  À lancer APRÈS le test.
-- ============================================================

drop policy if exists "photos_insert" on public.photos_jour;
create policy "photos_insert" on public.photos_jour for insert to authenticated
  with check (user_id = auth.uid() and public.est_enfant() and jour between date '2026-07-04' and date '2026-07-08');
