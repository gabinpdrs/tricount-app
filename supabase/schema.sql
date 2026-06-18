-- ============================================================
--  TRICOUNT ENTRE AMIS — Script SQL Supabase
--  À coller dans : Supabase > SQL Editor > New query > Run
--  (Relançable sans erreur.)
-- ============================================================

-- 1) PROFILS (1 par joueur, lié au compte Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  prenom text not null,
  must_change_password boolean not null default true
);

-- 2) DÉPENSES
create table if not exists public.depenses (
  id bigint generated always as identity primary key,
  titre text not null,
  montant numeric(10, 2) not null check (montant > 0),
  payeur_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 3) PARTAGES (avec qui chaque dépense est partagée)
create table if not exists public.depense_partages (
  id bigint generated always as identity primary key,
  depense_id bigint not null references public.depenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  unique (depense_id, user_id)
);


-- ============================================================
--  Création automatique du profil à chaque nouveau joueur
--  (email lucas@tricount.local -> prenom "Lucas")
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, prenom)
  values (new.id, initcap(split_part(new.email, '@', 1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- ============================================================
--  Marquer le mot de passe comme changé (1re connexion)
-- ============================================================
create or replace function public.marquer_mdp_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set must_change_password = false where id = auth.uid();
end; $$;


-- ============================================================
--  Ajouter une dépense + ses partages en une fois
-- ============================================================
create or replace function public.ajouter_depense(
  p_titre text, p_montant numeric, p_payeur uuid, p_participants uuid[]
)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_montant <= 0 then raise exception 'Montant invalide'; end if;
  if array_length(p_participants, 1) is null then raise exception 'Aucun participant'; end if;

  insert into public.depenses (titre, montant, payeur_id)
  values (p_titre, p_montant, p_payeur)
  returning id into v_id;

  insert into public.depense_partages (depense_id, user_id)
  select v_id, unnest(p_participants);
end; $$;


-- ============================================================
--  SÉCURITÉ (RLS)
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.depenses         enable row level security;
alter table public.depense_partages enable row level security;

-- Profils : lecture pour tous les connectés, pas de modif directe
drop policy if exists "profiles_lecture" on public.profiles;
create policy "profiles_lecture" on public.profiles for select to authenticated using (true);

-- Dépenses : lecture pour tous ; suppression seulement par celui qui a payé
-- (l'ajout passe par la fonction ajouter_depense)
drop policy if exists "depenses_lecture" on public.depenses;
create policy "depenses_lecture" on public.depenses for select to authenticated using (true);
drop policy if exists "depenses_suppr" on public.depenses;
create policy "depenses_suppr" on public.depenses for delete to authenticated using (payeur_id = auth.uid());

-- Partages : lecture pour tous (écriture via la fonction, suppression en cascade)
drop policy if exists "partages_lecture" on public.depense_partages;
create policy "partages_lecture" on public.depense_partages for select to authenticated using (true);
