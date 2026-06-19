-- ============================================================
--  PLANNING (calendrier) — Tricount (SANS RIEN EFFACER)
--  Seuls les enfants modifient. Les parents voient seulement
--  les activités cochées "visible par les parents".
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

create table if not exists public.activites (
  id bigint generated always as identity primary key,
  titre text not null,
  date_activite date not null,
  heure text,
  visible_parents boolean not null default true,
  cree_par uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.activite_participants (
  id bigint generated always as identity primary key,
  activite_id bigint not null references public.activites(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  unique (activite_id, user_id)
);

alter table public.activites enable row level security;
alter table public.activite_participants enable row level security;

-- Petite fonction utilitaire : est-ce que l'utilisateur est un enfant ?
create or replace function public.est_enfant()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select a_liste_perso from public.profiles where id = auth.uid()), false);
$$;

-- LECTURE activités : enfants voient tout ; parents seulement les "visibles"
drop policy if exists "activites_lecture" on public.activites;
create policy "activites_lecture" on public.activites for select to authenticated
  using (public.est_enfant() or visible_parents = true);

-- ÉCRITURE activités : seulement les enfants
drop policy if exists "activites_ecriture" on public.activites;
create policy "activites_ecriture" on public.activites for all to authenticated
  using (public.est_enfant()) with check (public.est_enfant());

-- Participants : lecture pour tous, écriture pour les enfants
drop policy if exists "participants_lecture" on public.activite_participants;
create policy "participants_lecture" on public.activite_participants for select to authenticated using (true);
drop policy if exists "participants_ecriture" on public.activite_participants;
create policy "participants_ecriture" on public.activite_participants for all to authenticated
  using (public.est_enfant()) with check (public.est_enfant());
