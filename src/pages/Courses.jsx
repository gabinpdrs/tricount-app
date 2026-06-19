import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const { session, profil } = useAuth()
  const aListePerso = !!profil?.a_liste_perso // seuls les enfants ont une liste perso

  const [categorie, setCategorie] = useState('alimentaire')
  const [vue, setVue] = useState('collectif')
  const [aussiCommune, setAussiCommune] = useState(false)
  const [articles, setArticles] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nom, setNom] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [message, setMessage] = useState(null)

  // Les parents ne voient que la liste commune
  const vueActive = aListePerso ? vue : 'collectif'

  async function charger() {
    setChargement(true)
    const selection = 'id, nom, quantite, achete, ajoute_par, achete_par, portee, categorie, ajouteur:ajoute_par(prenom), acheteur:achete_par(prenom), article_preneurs(user_id, preneur:user_id(prenom, equipe))'
    let req = supabase.from('articles').select(selection)
      .eq('portee', vueActive).eq('categorie', categorie).order('created_at', { ascending: true })
    if (vueActive === 'perso') req = req.eq('ajoute_par', session.user.id)
    const { data } = await req
    setArticles(data ?? [])
    setChargement(false)
  }

  useEffect(() => { charger() }, [vueActive, categorie])

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    if (!nom.trim()) { setMessage({ type: 'erreur', texte: 'Mets le nom d\'un article.' }); return }
    const qte = parseInt(quantite, 10) || 1
    const lignes = [{ nom: nom.trim(), quantite: qte, portee: vueActive, categorie, ajoute_par: session.user.id }]
    if (vueActive === 'perso' && aussiCommune) {
      lignes.push({ nom: nom.trim(), quantite: qte, portee: 'collectif', categorie, ajoute_par: session.user.id })
    }
    const { error } = await supabase.from('articles').insert(lignes)
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    setNom(''); setQuantite(1); setAussiCommune(false)
    await charger()
  }

  async function basculerAchete(a) {
    const nv = !a.achete
    await supabase.from('articles').update({ achete: nv, achete_par: nv ? session.user.id : null }).eq('id', a.id)
    await charger()
  }
  async function supprimer(id) {
    if (!window.confirm('Supprimer cet article ?')) return
    await supabase.from('articles').delete().eq('id', id)
    await charger()
  }
  async function versCommune(a) {
    await supabase.from('articles').update({ portee: 'collectif' }).eq('id', a.id)
    await charger()
  }
  async function prendre(a) {
    await supabase.from('article_preneurs').insert({ article_id: a.id, user_id: session.user.id })
    await charger()
  }
  async function annulerPrise(a) {
    await supabase.from('article_preneurs').delete().eq('article_id', a.id).eq('user_id', session.user.id)
    await charger()
  }

  const restants = articles.filter((a) => !a.achete).length

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>📋 Listes</h1><p>Salut {profil?.prenom} 👋</p></div>
      </header>

      {/* Choix de la catégorie de liste */}
      <div className="toggle">
        <button className={categorie === 'alimentaire' ? 'actif' : ''} onClick={() => setCategorie('alimentaire')}>🍽️ Alimentaire</button>
        <button className={categorie === 'materiel' ? 'actif' : ''} onClick={() => setCategorie('materiel')}>🎒 Matériel</button>
      </div>

      {/* Liste commune ou perso (seulement pour les enfants) */}
      {aListePerso && (
        <div className="toggle">
          <button className={vue === 'collectif' ? 'actif' : ''} onClick={() => setVue('collectif')}>🛒 Liste commune</button>
          <button className={vue === 'perso' ? 'actif' : ''} onClick={() => setVue('perso')}>👤 Ma liste</button>
        </div>
      )}

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
          {vueActive === 'perso' && (
            <label className="case-collectif">
              <input type="checkbox" checked={aussiCommune} onChange={(e) => setAussiCommune(e.target.checked)} />
              Aussi dans la liste commune
            </label>
          )}
          {message && <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>}
          <button type="submit">Ajouter</button>
        </form>
      </div>

      <div className="section-titre">
        {vueActive === 'perso' ? '👤 Ma liste' : '🛒 Liste commune'}
        {articles.length > 0 && (
          <span className="muted" style={{ fontWeight: 400 }}>&nbsp;· {articles.filter((a) => a.achete).length}/{articles.length} achetés</span>
        )}
      </div>
      <div className="card">
        {chargement ? (
          <p className="muted">Chargement...</p>
        ) : articles.length === 0 ? (
          <p className="muted">Liste vide.</p>
        ) : (
          articles.map((a) => {
            const preneurs = a.article_preneurs || []
            const jePrends = preneurs.some((p) => p.user_id === session.user.id)
            const famillesPreneurs = [...new Set(preneurs.map((p) => p.preneur?.equipe || p.preneur?.prenom).filter(Boolean))]
            return (
              <div className={`article-ligne ${a.achete ? 'fait' : ''}`} key={a.id}>
                <input type="checkbox" className="article-check" checked={a.achete} onChange={() => basculerAchete(a)} />
                <span className="article-qte">{a.quantite}×</span>
                <span className="article-info">
                  <span className="article-nom">{a.nom}</span>
                  {vueActive === 'collectif' && (
                    <>
                      <br />
                      <span className="muted" style={{ fontSize: 12 }}>
                        ajouté par {a.ajouteur?.prenom ?? '?'}
                        {famillesPreneurs.length > 0 && <> · 🛒 {famillesPreneurs.join(', ')} {famillesPreneurs.length > 1 ? "s'en occupent" : "s'en occupe"}</>}
                        {a.achete && a.acheteur && <> · ✅ coché par {a.acheteur.prenom}</>}
                      </span>
                    </>
                  )}
                </span>

                {vueActive === 'collectif' && !a.achete && aListePerso && (
                  jePrends
                    ? <button className="btn-pris actif" onClick={() => annulerPrise(a)}>✓ Notre famille</button>
                    : (categorie === 'materiel' || preneurs.length === 0) && <button className="btn-pris" onClick={() => prendre(a)}>C'est nous</button>
                )}
                {vueActive === 'perso' && (
                  <button className="btn-pris" onClick={() => versCommune(a)}>→ Commune</button>
                )}
                <button className="lien-suppr" onClick={() => supprimer(a.id)}>✕</button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
