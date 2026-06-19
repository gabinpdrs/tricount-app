-- ============================================================
--  Modifier une dépense existante (SANS RIEN EFFACER d'autre)
--  À lancer dans Supabase > SQL Editor > Run.
-- ============================================================

create or replace function public.modifier_depense(
  p_id bigint, p_titre text, p_montant numeric, p_payeur uuid, p_participants uuid[], p_ticket_url text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_montant <= 0 then raise exception 'Montant invalide'; end if;
  if array_length(p_participants, 1) is null then raise exception 'Aucune famille'; end if;

  update public.depenses
    set titre = p_titre, montant = p_montant, payeur_id = p_payeur,
        ticket_url = coalesce(p_ticket_url, ticket_url) -- on garde l'ancien ticket si aucun nouveau
  where id = p_id;

  delete from public.depense_partages where depense_id = p_id;
  insert into public.depense_partages (depense_id, user_id) select p_id, unnest(p_participants);
end; $$;
