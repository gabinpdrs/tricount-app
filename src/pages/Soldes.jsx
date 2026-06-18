import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { calculerSoldes, calculerRemboursements, euros } from '../lib/soldes'

export default function Soldes() {
  const { profil, deconnexion } = useAuth()
  const [membres, setMembres] = useState([])
  const [soldes, setSoldes] = useState({})
  const [remboursements, setRemboursements] = useState([])
  const [total, setTotal] = useState(0)
  const [chargement, setChargement] = useState(true)

  async function charger() {
    setChargement(true)

    const { data: profils } = await supabase.from('profiles').select('id, prenom')
    const { data: deps } = await supabase
      .from('depenses')
      .select('id, montant, payeur_id, depense_partages(user_id)')

    const membres = profils ?? []
    const depenses = (deps ?? []).map((d) => ({
      montant: d.montant,
      payeur_id: d.payeur_id,
      participants: (d.depense_partages ?? []).map((p) => p.user_id),
    }))

    const s = calculerSoldes(depenses, membres)
    setMembres(membres)
    setSoldes(s)
    setRemboursements(calculerRemboursements({ ...s }, membres))
    setTotal((deps ?? []).reduce((acc, d) => acc + Number(d.montant), 0))
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  const monSolde = profil ? (soldes[profil.id] ?? 0) : 0

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>💰 Soldes</h1>
          <p>Salut {profil?.prenom} 👋</p>
        </div>
        <button className="btn-deco" onClick={deconnexion}>Déco</button>
      </header>

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <>
          {/* Mon solde en grand */}
          <div className={`card solde-perso ${monSolde < -0.009 ? 'negatif' : monSolde > 0.009 ? 'positif' : ''}`}>
            {monSolde > 0.009 ? (
              <>On te doit<br /><span className="gros">{euros(monSolde)}</span></>
            ) : monSolde < -0.009 ? (
              <>Tu dois<br /><span className="gros">{euros(-monSolde)}</span></>
            ) : (
              <>Tu es à jour ✅<br /><span className="gros">{euros(0)}</span></>
            )}
          </div>

          {/* Remboursements suggérés */}
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

          {/* Détail des soldes */}
          <div className="section-titre">📊 Détail par personne</div>
          <div className="card">
            {membres.map((m) => {
              const v = soldes[m.id] ?? 0
              return (
                <div className="solde-ligne" key={m.id}>
                  <span>{m.prenom}{m.id === profil?.id && <span className="badge-toi">toi</span>}</span>
                  <span className={v < -0.009 ? 'rouge' : v > 0.009 ? 'vert' : 'muted'}>
                    {v > 0.009 ? '+' : ''}{euros(v)}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="muted" style={{ textAlign: 'center' }}>Total des dépenses : {euros(total)}</p>
        </>
      )}
    </div>
  )
}
