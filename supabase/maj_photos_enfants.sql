-- ============================================================
--  Photos réservées aux enfants (les parents ne les voient pas)
--  À lancer dans Supabase > SQL Editor > Run (n'efface rien).
-- ============================================================

drop policy if exists "photos_lecture" on public.photos_jour;
create policy "photos_lecture" on public.photos_jour for select to authenticated
  using (public.est_enfant());
