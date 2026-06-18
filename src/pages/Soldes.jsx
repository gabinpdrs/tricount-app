import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { calculerSoldes, calculerRemboursements, euros } from '../lib/soldes'

export default function Soldes() {
  const { session, profil, deconnexion, rafraichirProfil } = useAuth()
  const [equipes, setEquipes] = useState([])
  const [remboursements, setRemboursements] = useState([])
  const [total, setTotal] = useState(0)
  const [chargement, setChargement] = useState(true)
  const [photoMsg, setPhotoMsg] = useState('')

  async function charger() {
    setChargement(true)
    const { data: profils } = await supabase.from('profiles').select('id, prenom, equipe, photo_url')
    const { data: deps } = await supabase
      .from('depenses')
      .select('id, montant, payeur_id, depense_partages(user_id)')

    const membres = profils ?? []
    const depenses = (deps ?? []).map((d) => ({
      montant: d.montant,
      payeur_id: d.payeur_id,
      participants: (d.depense_partages ?? []).map((p) => p.user_id),
    }))

    // solde par personne, puis regroupé par équipe
    const sUser = calculerSoldes(depenses, membres)
    const map = {}
    membres.forEach((m) => {
      const eq = m.equipe || m.prenom // si pas d'équipe, chacun la sienne
      if (!map[eq]) map[eq] = { id: eq, nom: eq, solde: 0 }
      map[eq].solde += (sUser[m.id] || 0)
    })
    const liste = Object.values(map).map((e) => ({ ...e, solde: Math.round(e.solde * 100) / 100 }))

    const soldeParEquipe = {}
    liste.forEach((e) => { soldeParEquipe[e.id] = e.solde })
    const membresEq = liste.map((e) => ({ id: e.id, prenom: e.nom }))

    setEquipes(liste)
    setRemboursements(calculerRemboursements({ ...soldeParEquipe }, membresEq))
    setTotal((deps ?? []).reduce((acc, d) => acc + Number(d.montant), 0))
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoMsg('Envoi de la photo...')
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const chemin = `${session.user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(chemin, file, { upsert: true, contentType: file.type })
    if (upErr) { setPhotoMsg('Erreur : ' + upErr.message); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(chemin)
    const { error: rpcErr } = await supabase.rpc('set_photo', { p_url: `${data.publicUrl}?t=${Date.now()}` })
    if (rpcErr) { setPhotoMsg('Erreur : ' + rpcErr.message); return }
    await rafraichirProfil()
    setPhotoMsg('✅ Photo mise à jour !')
  }

  const monEquipe = profil?.equipe
  const monSolde = equipes.find((e) => e.id === monEquipe)?.solde ?? 0
  const initiale = (nom) => (nom ? nom.charAt(0).toUpperCase() : '?')

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-user">
          <label className="header-avatar" title="Changer ma photo">
            {profil?.photo_url ? <img className="avatar-img" src={profil.photo_url} alt="moi" /> : initiale(profil?.prenom)}
            <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
          </label>
          <div>
            <h1>💰 Soldes</h1>
            <p>{profil?.prenom}{monEquipe && <> · équipe {monEquipe}</>}</p>
          </div>
        </div>
        <button className="btn-deco" onClick={deconnexion}>Déco</button>
      </header>

      {photoMsg && <p className="message-succes">{photoMsg}</p>}

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <>
          <div className={`card solde-perso ${monSolde < -0.009 ? 'negatif' : monSolde > 0.009 ? 'positif' : ''}`}>
            {monSolde > 0.009 ? (
              <>On doit à ton équipe<br /><span className="gros">{euros(monSolde)}</span></>
            ) : monSolde < -0.009 ? (
              <>Ton équipe doit<br /><span className="gros">{euros(-monSolde)}</span></>
            ) : (
              <>Équipe à jour ✅<br /><span className="gros">{euros(0)}</span></>
            )}
          </div>

          <div className="section-titre">🔁 Qui rembourse qui</div>
          <div className="card">
            {remboursements.length === 0 ? (
              <p className="muted">Tout le monde est à jour 🎉</p>
            ) : (
              remboursements.map((r, i) => (
                <div className="remb-ligne" key={i}>
                  <span><strong>{r.de}</strong> doit à <strong>{r.vers}</strong></span>
                  <span className="remb-montant">{euros(r.montant)}</span>
                </div>
              ))
            )}
          </div>

          <div className="section-titre">📊 Détail par équipe</div>
          <div className="card">
            {equipes.map((e) => (
              <div className="solde-ligne" key={e.id}>
                <span>{e.nom}{e.id === monEquipe && <span className="badge-toi">toi</span>}</span>
                <span className={e.solde < -0.009 ? 'rouge' : e.solde > 0.009 ? 'vert' : 'muted'}>
                  {e.solde > 0.009 ? '+' : ''}{euros(e.solde)}
                </span>
              </div>
            ))}
          </div>

          <p className="muted" style={{ textAlign: 'center' }}>Total des dépenses : {euros(total)}</p>
        </>
      )}
    </div>
  )
}
