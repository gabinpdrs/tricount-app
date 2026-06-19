-- ============================================================
--  Planning limité au séjour : 4 au 8 juillet 2026
--  À lancer dans Supabase > SQL Editor > Run (n'efface rien).
-- ============================================================

drop policy if exists "activites_ecriture" on public.activites;
create policy "activites_ecriture" on public.activites for all to authenticated
  using (public.est_enfant())
  with check (
    public.est_enfant()
    and date_debut between date '2026-07-04' and date '2026-07-08'
    and date_fin   between date '2026-07-04' and date '2026-07-08'
  );
