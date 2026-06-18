import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const { session, profil } = useAuth()
  const restreint = !!profil?.peut_seulement_cocher // Lucile : peut seulement cocher

  const [vue, setVue] = useState('collectif')
  const [aussiCollectif, setAussiCollectif] = useState(false)
  const [articles, setArticles] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nom, setNom] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [message, setMessage] = useState(null)

  // Lucile ne voit que la liste collective
  const vueActive = restreint ? 'collectif' : vue

  async function charger() {
    setChargement(true)
    let requete = supabase
      .from('articles')
      .select('id, nom, quantite, achete, ajoute_par, portee, profiles:ajoute_par(prenom)')
      .eq('portee', vueActive)
      .order('created_at', { ascending: true })
    if (vueActive === 'perso') requete = requete.eq('ajoute_par', session.user.id)

    const { data } = await requete
    setArticles(data ?? [])
    setChargement(false)
  }

  useEffect(() => { charger() }, [vueActive])

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    if (!nom.trim()) { setMessage({ type: 'erreur', texte: 'Mets le nom d\'un article.' }); return }
    const qte = parseInt(quantite, 10) || 1

    // L'article va dans la liste actuellement affichée
    const lignes = [{ nom: nom.trim(), quantite: qte, portee: vue, ajoute_par: session.user.id }]
    // Si on est dans "Ma liste" et que la case est cochée -> aussi dans le collectif
    if (vue === 'perso' && aussiCollectif) {
      lignes.push({ nom: nom.trim(), quantite: qte, portee: 'collectif', ajoute_par: session.user.id })
    }

    const { error } = await supabase.from('articles').insert(lignes)
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    setNom(''); setQuantite(1); setAussiCollectif(false)
    await charger()
  }

  async function basculerAchete(a) {
    await supabase.from('articles').update({ achete: !a.achete }).eq('id', a.id)
    await charger()
  }
  async function supprimer(id) {
    await supabase.from('articles').delete().eq('id', id)
    await charger()
  }

  const restants = articles.filter((a) => !a.achete).length

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>🛒 Courses</h1>
          <p>{restreint ? 'Coche les articles achetés' : 'Avant de partir au camping'}</p>
        </div>
      </header>

      {/* Choix de la liste affichée (caché pour Lucile) */}
      {!restreint && (
        <div className="toggle">
          <button className={vue === 'collectif' ? 'actif' : ''} onClick={() => setVue('collectif')}>🛒 Liste collective</button>
          <button className={vue === 'perso' ? 'actif' : ''} onClick={() => setVue('perso')}>👤 Ma liste</button>
        </div>
      )}

      {/* Formulaire d'ajout (caché pour Lucile) */}
      {!restreint && (
        <div className="card">
          <h3>➕ Ajouter un article</h3>
          <form onSubmit={ajouter}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label>Article</label>
                <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Chips, Eau..." />
              </div>
              <div style={{ width: 90 }}>
                <label>Quantité</label>
                <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
              </div>
            </div>

            {/* La case demandée : visible seulement dans "Ma liste" */}
            {vue === 'perso' && (
              <label className="case-collectif">
                <input type="checkbox" checked={aussiCollectif} onChange={(e) => setAussiCollectif(e.target.checked)} />
                Aussi dans la liste collective
              </label>
            )}

            {message && <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>}
            <button type="submit">Ajouter</button>
          </form>
        </div>
      )}

      {/* La liste */}
      <div className="section-titre">
        {vueActive === 'perso' ? '👤 Ma liste' : '🛒 Liste collective'}
        {restants > 0 && <span className="muted" style={{ fontWeight: 400 }}>&nbsp;({restants} à acheter)</span>}
      </div>
      <div className="card">
        {chargement ? (
          <p className="muted">Chargement...</p>
        ) : articles.length === 0 ? (
          <p className="muted">Liste vide.</p>
        ) : (
          articles.map((a) => (
            <div className={`article-ligne ${a.achete ? 'fait' : ''}`} key={a.id}>
              <input type="checkbox" className="article-check" checked={a.achete} onChange={() => basculerAchete(a)} />
              <span className="article-qte">{a.quantite}×</span>
              <span className="article-info">
                <span className="article-nom">{a.nom}</span>
                {vueActive === 'collectif' && (
                  <>
                    <br />
                    <span className="muted" style={{ fontSize: 12 }}>ajouté par {a.profiles?.prenom ?? '?'}</span>
                  </>
                )}
              </span>
              {/* Lucile ne peut pas supprimer, seulement cocher */}
              {!restreint && <button className="lien-suppr" onClick={() => supprimer(a.id)}>✕</button>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
