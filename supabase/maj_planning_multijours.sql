-- ============================================================
--  MAJ Planning — activités sur plusieurs jours (SANS RIEN EFFACER)
--  À lancer dans Supabase > SQL Editor > Run
-- ============================================================

-- Dates de début et de fin (une activité peut durer plusieurs jours)
alter table public.activites add column if not exists date_debut date;
alter table public.activites add column if not exists date_fin date;

-- On reprend l'ancienne date pour les activités déjà créées
update public.activites
set date_debut = coalesce(date_debut, date_activite),
    date_fin   = coalesce(date_fin, date_activite)
where date_debut is null;

-- L'ancienne colonne n'est plus obligatoire
alter table public.activites alter column date_activite drop not null;
