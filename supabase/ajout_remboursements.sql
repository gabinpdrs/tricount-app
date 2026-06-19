-- ============================================================
--  Remboursements (régler les comptes au fur et à mesure)
--  À lancer dans Supabase > SQL Editor > Run (n'efface rien).
-- ============================================================

create table if not exists public.remboursements (
  id bigint generated always as identity primary key,
  de_id uuid not null references public.profiles(id),    -- qui rembourse
  vers_id uuid not null references public.profiles(id),   -- à qui
  montant numeric(10, 2) not null check (montant > 0),
  created_at timestamptz not null default now()
);

alter table public.remboursements enable row level security;

drop policy if exists "remb_lecture" on public.remboursements;
create policy "remb_lecture" on public.remboursements for select to authenticated using (true);
drop policy if exists "remb_insert" on public.remboursements;
create policy "remb_insert" on public.remboursements for insert to authenticated with check (true);
drop policy if exists "remb_suppr" on public.remboursements;
create policy "remb_suppr" on public.remboursements for delete to authenticated using (true);
