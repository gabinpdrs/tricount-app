-- ============================================================
--  MAJ — Liste perso réservée aux enfants + ticket dans Dépenses
--  À lancer dans Supabase > SQL Editor > Run (n'efface rien)
-- ============================================================

-- 1) Qui a droit à une liste perso (les enfants seulement)
alter table public.profiles add column if not exists a_liste_perso boolean not null default false;
update public.profiles set a_liste_perso = true  where prenom in ('Gabin', 'Fares', 'Baptiste', 'Lisa', 'Meline');
update public.profiles set a_liste_perso = false where prenom in ('Poderos', 'Sataa', 'Bethuel', 'Pagnon', 'Jacquet');

-- 2) Les listes perso redeviennent PRIVÉES (chaque enfant la sienne)
drop policy if exists "articles_lecture" on public.articles;
create policy "articles_lecture" on public.articles for select to authenticated
  using (portee = 'collectif' or ajoute_par = auth.uid());

drop policy if exists "articles_maj" on public.articles;
create policy "articles_maj" on public.articles for update to authenticated
  using (portee = 'collectif' or ajoute_par = auth.uid())
  with check (portee = 'collectif' or ajoute_par = auth.uid());

drop policy if exists "articles_suppr" on public.articles;
create policy "articles_suppr" on public.articles for delete to authenticated
  using (portee = 'collectif' or ajoute_par = auth.uid());

-- 3) Le ticket de caisse : on s'assure que tout est en place (au cas où)
alter table public.depenses add column if not exists ticket_url text;

insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', true)
on conflict (id) do nothing;

drop policy if exists "tickets_lecture" on storage.objects;
create policy "tickets_lecture" on storage.objects for select using (bucket_id = 'tickets');
drop policy if exists "tickets_envoi" on storage.objects;
create policy "tickets_envoi" on storage.objects for insert to authenticated with check (bucket_id = 'tickets');
drop policy if exists "tickets_maj" on storage.objects;
create policy "tickets_maj" on storage.objects for update to authenticated using (bucket_id = 'tickets');

-- 4) Ajouter une dépense AVEC une photo de ticket (facultative)
drop function if exists public.ajouter_depense(text, numeric, uuid, uuid[]);
create or replace function public.ajouter_depense(
  p_titre text, p_montant numeric, p_payeur uuid, p_participants uuid[], p_ticket_url text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_montant <= 0 then raise exception 'Montant invalide'; end if;
  if array_length(p_participants, 1) is null then raise exception 'Aucun participant'; end if;

  insert into public.depenses (titre, montant, payeur_id, ticket_url)
  values (p_titre, p_montant, p_payeur, p_ticket_url)
  returning id into v_id;

  insert into public.depense_partages (depense_id, user_id)
  select v_id, unnest(p_participants);
end; $$;
