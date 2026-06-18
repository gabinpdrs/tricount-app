import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { euros } from '../lib/soldes'

export default function Depenses() {
  const { session, profil } = useAuth()
  const [membres, setMembres] = useState([])
  const [depenses, setDepenses] = useState([])
  const [chargement, setChargement] = useState(true)

  // Champs du formulaire
  const [titre, setTitre] = useState('')
  const [montant, setMontant] = useState('')
  const [payeur, setPayeur] = useState('')
  const [participants, setParticipants] = useState([]) // tableau d'ids cochés
  const [message, setMessage] = useState(null)

  async function charger() {
    setChargement(true)
    const { data: profils } = await supabase.from('profiles').select('id, prenom')
    const { data: deps } = await supabase
      .from('depenses')
      .select('id, titre, montant, payeur_id, created_at, ticket_url, payeur:payeur_id(prenom), depense_partages(user_id)')
      .order('created_at', { ascending: false })

    const m = profils ?? []
    setMembres(m)
    setDepenses(deps ?? [])
    // Valeurs par défaut : je suis le payeur, tout le monde partage
    if (profil) setPayeur(profil.id)
    setParticipants(m.map((x) => x.id))
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  function toggleParticipant(id) {
    setParticipants((prec) =>
      prec.includes(id) ? prec.filter((x) => x !== id) : [...prec, id]
    )
  }

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    const m = parseFloat(String(montant).replace(',', '.'))
    if (!titre.trim()) { setMessage({ type: 'erreur', texte: 'Mets un titre.' }); return }
    if (Number.isNaN(m) || m <= 0) { setMessage({ type: 'erreur', texte: 'Montant invalide.' }); return }
    if (participants.length === 0) { setMessage({ type: 'erreur', texte: 'Coche au moins une personne.' }); return }

    const { error } = await supabase.rpc('ajouter_depense', {
      p_titre: titre.trim(),
      p_montant: m,
      p_payeur: payeur,
      p_participants: participants,
    })
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }

    setTitre(''); setMontant('')
    setMessage({ type: 'succes', texte: '✅ Dépense ajoutée !' })
    await charger()
  }

  async function supprimer(id) {
    if (!confirm('Supprimer cette dépense ?')) return
    const { error } = await supabase.from('depenses').delete().eq('id', id)
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    await charger()
  }

  const prenomDe = (id) => membres.find((x) => x.id === id)?.prenom ?? '?'

  if (chargement) {
    return <div className="container"><header className="app-header"><h1>🧾 Dépenses</h1></header><p className="muted">Chargement...</p></div>
  }

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>🧾 Dépenses</h1><p>Ajoute et partage une dépense</p></div>
      </header>

      {/* Formulaire d'ajout */}
      <div className="card">
        <h3>➕ Nouvelle dépense</h3>
        <form onSubmit={ajouter}>
          <label>Titre</label>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Courses, Restaurant..." />

          <label>Montant (€)</label>
          <input type="number" step="0.01" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0,00" />

          <label>Payé par</label>
          <select value={payeur} onChange={(e) => setPayeur(e.target.value)}>
            {membres.map((m) => (
              <option key={m.id} value={m.id}>{m.prenom}{m.id === profil?.id ? ' (toi)' : ''}</option>
            ))}
          </select>

          <label>Partagé avec (coche les personnes)</label>
          <div className="checks">
            {membres.map((m) => (
              <label className={`check ${participants.includes(m.id) ? 'coche' : ''}`} key={m.id}>
                <input type="checkbox" checked={participants.includes(m.id)} onChange={() => toggleParticipant(m.id)} />
                {m.prenom}
              </label>
            ))}
          </div>

          {message && <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>}
          <button type="submit">Ajouter la dépense</button>
        </form>
      </div>

      {/* Liste des dépenses */}
      <div className="section-titre">📋 Historique</div>
      {depenses.length === 0 ? (
        <div className="card"><p className="muted">Aucune dépense pour l'instant.</p></div>
      ) : (
        depenses.map((d) => {
          const parts = (d.depense_partages ?? []).map((p) => p.user_id)
          const partChacun = parts.length ? Number(d.montant) / parts.length : 0
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
                Partagé entre {parts.map(prenomDe).join(', ')} → {euros(partChacun)} chacun
              </div>
              {d.ticket_url && (
                <a href={d.ticket_url} target="_blank" rel="noreferrer" className="ticket-lien">
                  <img src={d.ticket_url} alt="ticket" className="ticket-vignette" />
                  🧾 Voir le ticket
                </a>
              )}
              {d.payeur_id === profil?.id && (
                <button className="lien-suppr" onClick={() => supprimer(d.id)}>Supprimer</button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
