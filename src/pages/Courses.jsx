import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const { session } = useAuth()
  const [vue, setVue] = useState('collectif')         // liste affichée
  const [destination, setDestination] = useState('collectif') // où ajouter l'article
  const [articles, setArticles] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nom, setNom] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [message, setMessage] = useState(null)

  async function charger() {
    setChargement(true)
    let requete = supabase
      .from('articles')
      .select('id, nom, quantite, achete, ajoute_par, portee, profiles:ajoute_par(prenom)')
      .eq('portee', vue)
      .order('created_at', { ascending: true })
    if (vue === 'perso') requete = requete.eq('ajoute_par', session.user.id)

    const { data } = await requete
    setArticles(data ?? [])
    setChargement(false)
  }

  useEffect(() => { charger() }, [vue])

  // Quand on change de liste affichée, on aligne la destination par défaut dessus
  useEffect(() => { setDestination(vue) }, [vue])

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    if (!nom.trim()) { setMessage({ type: 'erreur', texte: 'Mets le nom d\'un article.' }); return }
    const qte = parseInt(quantite, 10) || 1

    const { error } = await supabase.from('articles').insert({
      nom: nom.trim(), quantite: qte, portee: destination, ajoute_par: session.user.id,
    })
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    setNom(''); setQuantite(1)

    // On affiche la liste où l'article a été ajouté
    if (destination !== vue) setVue(destination)
    else await charger()
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
        <div><h1>🛒 Courses</h1><p>Avant de partir au camping</p></div>
      </header>

      {/* Choix de la liste affichée */}
      <div className="toggle">
        <button className={vue === 'collectif' ? 'actif' : ''} onClick={() => setVue('collectif')}>🛒 Liste collective</button>
        <button className={vue === 'perso' ? 'actif' : ''} onClick={() => setVue('perso')}>👤 Ma liste</button>
      </div>

      {/* Ajouter un article */}
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

          <label>Ajouter dans...</label>
          <div className="toggle" style={{ marginBottom: 0 }}>
            <button type="button" className={destination === 'collectif' ? 'actif' : ''} onClick={() => setDestination('collectif')}>🛒 Liste collective</button>
            <button type="button" className={destination === 'perso' ? 'actif' : ''} onClick={() => setDestination('perso')}>👤 Ma liste</button>
          </div>

          {message && <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>}
          <button type="submit">Ajouter</button>
        </form>
      </div>

      {/* La liste */}
      <div className="section-titre">
        {vue === 'perso' ? '👤 Ma liste' : '🛒 Liste collective'}
        {restants > 0 && <span className="muted" style={{ fontWeight: 400 }}>&nbsp;({restants} à acheter)</span>}
      </div>
      <div className="card">
        {chargement ? (
          <p className="muted">Chargement...</p>
        ) : articles.length === 0 ? (
          <p className="muted">Liste vide. Ajoute le premier article !</p>
        ) : (
          articles.map((a) => (
            <div className={`article-ligne ${a.achete ? 'fait' : ''}`} key={a.id}>
              <input type="checkbox" className="article-check" checked={a.achete} onChange={() => basculerAchete(a)} />
              <span className="article-qte">{a.quantite}×</span>
              <span className="article-info">
                <span className="article-nom">{a.nom}</span>
                {vue === 'collectif' && (
                  <>
                    <br />
                    <span className="muted" style={{ fontSize: 12 }}>ajouté par {a.profiles?.prenom ?? '?'}</span>
                  </>
                )}
              </span>
              <button className="lien-suppr" onClick={() => supprimer(a.id)}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
