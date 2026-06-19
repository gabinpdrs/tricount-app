import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { euros } from '../lib/soldes'

export default function Depenses() {
  const { profil } = useAuth()
  const [membres, setMembres] = useState([])
  const [equipes, setEquipes] = useState([]) // [{ nom, membres:[ids] }]
  const [depenses, setDepenses] = useState([])
  const [chargement, setChargement] = useState(true)

  const [editId, setEditId] = useState(null) // id de la dépense en cours de modification
  const [titre, setTitre] = useState('')
  const [montant, setMontant] = useState('')
  const [payeur, setPayeur] = useState('')
  const [equipesChoisies, setEquipesChoisies] = useState([]) // noms d'équipes cochées
  const [ticketFile, setTicketFile] = useState(null)
  const [resetTicket, setResetTicket] = useState(0)
  const [message, setMessage] = useState(null)
  const [remboursements, setRemboursements] = useState([])
  const [rembVers, setRembVers] = useState('')
  const [rembMontant, setRembMontant] = useState('')
  const [msgRemb, setMsgRemb] = useState(null)

  async function charger() {
    setChargement(true)
    const { data: profils } = await supabase.from('profiles').select('id, prenom, equipe, a_liste_perso')
    const { data: deps } = await supabase
      .from('depenses')
      .select('id, titre, montant, payeur_id, created_at, ticket_url, payeur:payeur_id(prenom), depense_partages(user_id)')
      .order('created_at', { ascending: false })

    const m = profils ?? []
    // Construit les équipes (si pas d'équipe, la personne est sa propre équipe)
    const map = {}
    m.forEach((p) => {
      const eq = p.equipe || p.prenom
      if (!map[eq]) map[eq] = { nom: eq, membres: [] }
      map[eq].membres.push(p.id)
    })
    const listeEquipes = Object.values(map)

    const { data: rembs } = await supabase
      .from('remboursements')
      .select('id, de_id, vers_id, montant, created_at, de:de_id(prenom), vers:vers_id(prenom)')
      .order('created_at', { ascending: false })

    setMembres(m)
    setEquipes(listeEquipes)
    setDepenses(deps ?? [])
    setRemboursements(rembs ?? [])
    if (profil) setPayeur(profil.id)
    setEquipesChoisies(listeEquipes.map((e) => e.nom)) // toutes cochées par défaut
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  function toggleEquipe(nom) {
    setEquipesChoisies((prec) => prec.includes(nom) ? prec.filter((x) => x !== nom) : [...prec, nom])
  }

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    const m = parseFloat(String(montant).replace(',', '.'))
    if (!titre.trim()) { setMessage({ type: 'erreur', texte: 'Mets un titre.' }); return }
    if (Number.isNaN(m) || m <= 0) { setMessage({ type: 'erreur', texte: 'Montant invalide.' }); return }
    if (equipesChoisies.length === 0) { setMessage({ type: 'erreur', texte: 'Coche au moins une équipe.' }); return }

    // On transforme les équipes choisies en liste de personnes
    const participants = equipes
      .filter((eq) => equipesChoisies.includes(eq.nom))
      .flatMap((eq) => eq.membres)

    // Photo du ticket de caisse (facultative)
    let ticketUrl = null
    if (ticketFile) {
      const ext = (ticketFile.name.split('.').pop() || 'jpg').toLowerCase()
      const chemin = `${profil.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('tickets')
        .upload(chemin, ticketFile, { upsert: true, contentType: ticketFile.type })
      if (upErr) { setMessage({ type: 'erreur', texte: 'Photo : ' + upErr.message }); return }
      ticketUrl = supabase.storage.from('tickets').getPublicUrl(chemin).data.publicUrl
    }

    const enEdition = !!editId
    const { error } = enEdition
      ? await supabase.rpc('modifier_depense', { p_id: editId, p_titre: titre.trim(), p_montant: m, p_payeur: payeur, p_participants: participants, p_ticket_url: ticketUrl })
      : await supabase.rpc('ajouter_depense', { p_titre: titre.trim(), p_montant: m, p_payeur: payeur, p_participants: participants, p_ticket_url: ticketUrl })
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    annulerEdition()
    setMessage({ type: 'succes', texte: enEdition ? '✅ Dépense modifiée !' : '✅ Dépense ajoutée !' })
    await charger()
  }

  function lancerEdition(d) {
    setEditId(d.id)
    setTitre(d.titre)
    setMontant(String(d.montant))
    setPayeur(d.payeur_id)
    const parts = (d.depense_partages ?? []).map((p) => p.user_id)
    setEquipesChoisies([...new Set(parts.map(equipeDe))])
    setMessage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function annulerEdition() {
    setEditId(null)
    setTitre(''); setMontant(''); setTicketFile(null); setResetTicket((n) => n + 1)
    if (profil) setPayeur(profil.id)
    setEquipesChoisies(equipes.map((e) => e.nom))
  }

  async function supprimer(id) {
    if (!window.confirm('Supprimer cette dépense ?')) return
    const { error } = await supabase.from('depenses').delete().eq('id', id)
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    await charger()
  }

  async function ajouterRemboursement(e) {
    e.preventDefault()
    setMsgRemb(null)
    const m = parseFloat(String(rembMontant).replace(',', '.'))
    if (!rembVers) { setMsgRemb({ type: 'erreur', texte: 'Choisis une famille.' }); return }
    if (Number.isNaN(m) || m <= 0) { setMsgRemb({ type: 'erreur', texte: 'Montant invalide.' }); return }
    // On vise un membre de la famille choisie (le solde est calculé par famille)
    const eq = equipes.find((e) => e.nom === rembVers)
    const versId = eq?.membres?.find((id) => id !== profil?.id) || eq?.membres?.[0]
    if (!versId) { setMsgRemb({ type: 'erreur', texte: 'Famille introuvable.' }); return }
    const { error } = await supabase.from('remboursements').insert({ de_id: profil.id, vers_id: versId, montant: m })
    if (error) { setMsgRemb({ type: 'erreur', texte: error.message }); return }
    setRembMontant(''); setRembVers('')
    setMsgRemb({ type: 'succes', texte: '✅ Remboursement enregistré !' })
    await charger()
  }

  async function supprimerRemboursement(id) {
    if (!window.confirm('Supprimer ce remboursement ?')) return
    await supabase.from('remboursements').delete().eq('id', id)
    await charger()
  }

  // équipe d'une personne (pour l'affichage)
  const equipeDe = (uid) => {
    const p = membres.find((x) => x.id === uid)
    return p ? (p.equipe || p.prenom) : '?'
  }

  if (chargement) {
    return <div className="container"><header className="app-header"><h1>🧾 Dépenses</h1></header><p className="muted">Chargement...</p></div>
  }

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>🧾 Dépenses</h1><p>Partagées entre les familles</p></div>
      </header>

      <div className="card">
        <h3>{editId ? '✏️ Modifier la dépense' : '➕ Nouvelle dépense'}</h3>
        <form onSubmit={ajouter}>
          <label>Titre</label>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Courses, Essence..." />

          <label>Montant (€)</label>
          <input type="number" step="0.01" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0,00" />

          <label>Payé par</label>
          <select value={payeur} onChange={(e) => setPayeur(e.target.value)}>
            {membres.map((m) => (
              <option key={m.id} value={m.id}>{m.prenom}{m.id === profil?.id ? ' (toi)' : ''}</option>
            ))}
          </select>

          <label>Partagé entre quelles familles</label>
          <div className="checks">
            {equipes.map((eq) => (
              <label className={`check ${equipesChoisies.includes(eq.nom) ? 'coche' : ''}`} key={eq.nom}>
                <input type="checkbox" checked={equipesChoisies.includes(eq.nom)} onChange={() => toggleEquipe(eq.nom)} />
                {eq.nom}
              </label>
            ))}
          </div>

          <label>📸 Photo du ticket de caisse (facultatif)</label>
          <input key={resetTicket} type="file" accept="image/*" onChange={(e) => setTicketFile(e.target.files?.[0] ?? null)} />

          {message && <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>}
          <button type="submit">{editId ? 'Enregistrer les modifications' : 'Ajouter la dépense'}</button>
          {editId && <button type="button" className="secondaire" onClick={annulerEdition}>Annuler</button>}
        </form>
      </div>

      {/* Remboursement */}
      <div className="card">
        <h3>💸 J'ai remboursé</h3>
        <form onSubmit={ajouterRemboursement}>
          <label>À qui ?</label>
          <select value={rembVers} onChange={(e) => setRembVers(e.target.value)}>
            <option value="">— choisir une famille —</option>
            {equipes.filter((eq) => !eq.membres.includes(profil?.id)).map((eq) => (
              <option key={eq.nom} value={eq.nom}>{eq.nom}</option>
            ))}
          </select>
          <label>Montant (€)</label>
          <input type="number" step="0.01" min="0" value={rembMontant} onChange={(e) => setRembMontant(e.target.value)} placeholder="0,00" />
          {msgRemb && <p className={msgRemb.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{msgRemb.texte}</p>}
          <button type="submit">Enregistrer le remboursement</button>
        </form>
      </div>

      {remboursements.length > 0 && (
        <>
          <div className="section-titre">🔁 Remboursements</div>
          <div className="card">
            {remboursements.map((r) => (
              <div className="resultat-ligne" key={r.id}>
                <span><strong>{equipeDe(r.de_id)}</strong> → <strong>{equipeDe(r.vers_id)}</strong></span>
                <span>
                  <span className="remb-montant">{euros(r.montant)}</span>
                  {r.de_id === profil?.id && <button className="lien-suppr" style={{ marginLeft: 10 }} onClick={() => supprimerRemboursement(r.id)}>✕</button>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-titre">📋 Historique</div>
      {depenses.length === 0 ? (
        <div className="card"><p className="muted">Aucune dépense pour l'instant.</p></div>
      ) : (
        depenses.map((d) => {
          const parts = (d.depense_partages ?? []).map((p) => p.user_id)
          const equipesPart = [...new Set(parts.map(equipeDe))]
          const partChacun = equipesPart.length ? Number(d.montant) / equipesPart.length : 0
          return (
            <div className="card depense" key={d.id}>
              <div className="depense-haut">
                <div>
                  <div className="depense-titre">{d.titre}</div>
                  <div className="muted">Payé par {d.payeur?.prenom}</div>
                </div>
                <div className="depense-montant">{euros(d.montant)}</div>
              </div>
              <div className="muted" style={{ fontSize: 13 }}>
                Partagé entre {equipesPart.join(', ')} → {euros(partChacun)} par famille
              </div>
              {d.ticket_url && (
                <a href={d.ticket_url} target="_blank" rel="noreferrer" className="ticket-lien">
                  <img src={d.ticket_url} alt="ticket" className="ticket-vignette" />
                  🧾 Voir le ticket
                </a>
              )}
              {d.payeur_id === profil?.id && (
                <div style={{ display: 'flex', gap: 16 }}>
                  <button className="lien-modif" onClick={() => lancerEdition(d)}>Modifier</button>
                  <button className="lien-suppr" onClick={() => supprimer(d.id)}>Supprimer</button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
