import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function ChangePassword() {
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const navigate = useNavigate()
  const { session, rafraichirProfil, deconnexion } = useAuth()

  if (!session) { navigate('/login'); return null }

  async function valider(e) {
    e.preventDefault()
    setErreur('')
    if (nouveau.length < 6) { setErreur('Le mot de passe doit faire au moins 6 caractères.'); return }
    if (nouveau !== confirmation) { setErreur('Les deux mots de passe ne sont pas identiques.'); return }
    setEnCours(true)

    const { error: err1 } = await supabase.auth.updateUser({ password: nouveau })
    if (err1) { setEnCours(false); setErreur('Erreur : ' + err1.message); return }

    const { error: err2 } = await supabase.rpc('marquer_mdp_change')
    setEnCours(false)
    if (err2) { setErreur('Erreur profil : ' + err2.message); return }

    await rafraichirProfil()
    navigate('/')
  }

  return (
    <div className="container">
      <h1>🔐 Nouveau mot de passe</h1>
      <div className="card">
        <p className="muted">C'est ta première connexion. Choisis un nouveau mot de passe.</p>
        <form onSubmit={valider}>
          <label>Nouveau mot de passe</label>
          <input type="password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} required />
          <label>Confirme le mot de passe</label>
          <input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
          {erreur && <p className="message-erreur">{erreur}</p>}
          <button type="submit" disabled={enCours}>{enCours ? 'Enregistrement...' : 'Valider'}</button>
        </form>
        <button className="secondaire" onClick={deconnexion}>Se déconnecter</button>
      </div>
    </div>
  )
}
