import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const { session } = useAuth()
  const [listes, setListes] = useState([])
  const [listeId, setListeId] = useState(null)
  const [articles, setArticles] = useState([])
  const [chargement, setChargement] = useState(true)

  const [nom, setNom] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [nouvelleListe, setNouvelleListe] = useState('')
  const [message, setMessage] = useState(null)

  async function chargerListes() {
    const { data } = await supabase.from('listes_courses').select('id, nom').order('created_at')
    setListes(data ?? [])
    return data ?? []
  }

  async function chargerArticles(id) {
    if (!id) { setArticles([]); return }
    const { data } = await supabase
      .from('articles')
      .select('id, nom, quantite, achete, ajoute_par, profiles:ajoute_par(prenom)')
      .eq('liste_id', id)
      .order('created_at', { ascending: true })
    setArticles(data ?? [])
  }

  useEffect(() => {
    (async () => {
      setChargement(true)
      const ls = await chargerListes()
      const premier = ls[0]?.id ?? null
      setListeId(premier)
      await chargerArticles(premier)
      setChargement(false)
    })()
  }, [])

  // Recharge les articles quand on change de liste
  useEffect(() => { chargerArticles(listeId) }, [listeId])

  async function ajouterArticle(e) {
    e.preventDefault()
    setMessage(null)
    if (!listeId) { setMessage({ type: 'erreur', texte: 'Choisis ou crée une liste.' }); return }
    if (!nom.trim()) { setMessage({ type: 'erreur', texte: 'Mets le nom d\'un article.' }); return }
    const q = parseInt(quantite, 10) || 1

    const { error } = await supabase.from('articles').insert({
      liste_id: listeId, nom: nom.trim(), quantite: q, ajoute_par: session.user.id,
    })
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    setNom(''); setQuantite(1)
    await chargerArticles(listeId)
  }

  async function basculerAchete(a) {
    await supabase.from('articles').update({ achete: !a.achete }).eq('id', a.id)
    await chargerArticles(listeId)
  }

  async function supprimerArticle(id) {
    await supabase.from('articles').delete().eq('id', id)
    await chargerArticles(listeId)
  }

  async function creerListe(e) {
    e.preventDefault()
    setMessage(null)
    if (!nouvelleListe.trim()) return
    const { data, error } = await supabase
      .from('listes_courses')
      .insert({ nom: nouvelleListe.trim(), created_by: session.user.id })
      .select()
      .single()
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    setNouvelleListe('')
    await chargerListes()
    setListeId(data.id)
  }

  const restants = articles.filter((a) => !a.achete).length

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>🛒 Courses</h1><p>Liste collective avant de partir</p></div>
      </header>

      {/* Choix de la liste */}
      <div className="card">
        <label>Liste affichée</label>
        <select value={listeId ?? ''} onChange={(e) => setListeId(Number(e.target.value))}>
          {listes.length === 0 && <option value="">— aucune liste —</option>}
          {listes.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
        </select>

        <form onSubmit={creerListe}>
          <label>Créer une nouvelle liste</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={nouvelleListe} onChange={(e) => setNouvelleListe(e.target.value)} placeholder="Ex : Camping, Apéro..." />
            <button type="submit" style={{ width: 'auto', marginTop: 0, padding: '12px 16px' }}>+</button>
          </div>
        </form>
      </div>

      {/* Ajouter un article */}
      <div className="card">
        <h3>➕ Ajouter un article</h3>
        <form onSubmit={ajouterArticle}>
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
          {message && <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>}
          <button type="submit">Ajouter à la liste</button>
        </form>
      </div>

      {/* La liste collective */}
      <div className="section-titre">📋 La liste {restants > 0 && <span className="muted" style={{ fontWeight: 400 }}>({restants} à acheter)</span>}</div>
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
                <br />
                <span className="muted" style={{ fontSize: 12 }}>ajouté par {a.profiles?.prenom ?? '?'}</span>
              </span>
              <button className="lien-suppr" onClick={() => supprimerArticle(a.id)}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
