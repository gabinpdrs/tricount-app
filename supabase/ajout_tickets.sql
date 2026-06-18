-- ============================================================
--  ACHATS + TICKETS DE CAISSE — Tricount (SANS RIEN EFFACER)
--  "C'est moi qui achète" sur les courses, puis on valide
--  l'achat avec un montant + photo du ticket -> dépense partagée.
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

-- 1) Qui prend en charge l'achat d'un article
alter table public.articles
  add column if not exists pris_par uuid references public.profiles(id);

-- 2) Photo du ticket de caisse sur une dépense
alter table public.depenses
  add column if not exists ticket_url text;

-- 3) Espace de stockage des tickets (lecture publique)
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', true)
on conflict (id) do nothing;

drop policy if exists "tickets_lecture" on storage.objects;
create policy "tickets_lecture" on storage.objects
  for select using (bucket_id = 'tickets');
drop policy if exists "tickets_envoi" on storage.objects;
create policy "tickets_envoi" on storage.objects
  for insert to authenticated with check (bucket_id = 'tickets');
drop policy if exists "tickets_maj" on storage.objects;
create policy "tickets_maj" on storage.objects
  for update to authenticated using (bucket_id = 'tickets');

-- 4) Valider un achat : crée une dépense partagée entre TOUTES les familles
--    et marque "achetés" les articles que j'avais pris en charge.
create or replace function public.valider_achat(
  p_titre text, p_montant numeric, p_ticket_url text
)
returns void language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_montant <= 0 then raise exception 'Montant invalide'; end if;

  -- la dépense (payée par moi, avec le ticket)
  insert into public.depenses (titre, montant, payeur_id, ticket_url)
  values (coalesce(nullif(p_titre, ''), 'Courses'), p_montant, auth.uid(), p_ticket_url)
  returning id into v_id;

  -- partagée entre toutes les familles
  insert into public.depense_partages (depense_id, user_id)
  select v_id, id from public.profiles;

  -- les articles que j'avais pris en charge passent en "acheté"
  update public.articles
  set achete = true
  where pris_par = auth.uid() and achete = false;
end; $$;
