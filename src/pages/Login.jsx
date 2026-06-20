import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, prenomVersEmail } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [prenom, setPrenom] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)
  const navigate = useNavigate()
  const { session, profil } = useAuth()

  useEffect(() => {
    if (session && profil) {
      if (profil.must_change_password) navigate('/changer-mot-de-passe')
      else navigate('/')
    }
  }, [session, profil, navigate])

  async function seConnecter(e) {
    e.preventDefault()
    setErreur('')
    setEnCours(true)
    const email = prenomVersEmail(prenom)
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    setEnCours(false)
    if (error) { setErreur('Prénom ou mot de passe incorrect.'); return }
  }

  return (
    <div className="centre">
      <div className="logo-titre">
        <h1>💸 Tricount entre amis</h1>
      </div>
      <div className="card">
        <h2>Connexion</h2>
        <form onSubmit={seConnecter}>
          <label>Nom de famille (identifiant)</label>
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex : Poderos ou Pagnon" required />

          <label>Mot de passe</label>
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="Première fois : Nom + 1 (ex: Poderos1)" required />

          {erreur && <p className="message-erreur">{erreur}</p>}
          <button type="submit" disabled={enCours}>{enCours ? 'Connexion...' : 'Se connecter'}</button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          Première connexion : mot de passe = ton nom de famille suivi de 1 (ex : <strong>Poderos1</strong>).
        </p>
      </div>
    </div>
  )
}
