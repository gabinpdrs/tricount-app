import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const { session, profil } = useAuth()
  const aListePerso = !!profil?.a_liste_perso // seuls les enfants ont une liste perso

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
    const selection = 'id, nom, quantite, achete, ajoute_par, pris_par, portee, ajouteur:ajoute_par(prenom), preneur:pris_par(prenom)'
    let req = supabase.from('articles').select(selection)
      .eq('portee', vueActive).order('created_at', { ascending: true })
    if (vueActive === 'perso') req = req.eq('ajoute_par', session.user.id)
    const { data } = await req
    setArticles(data ?? [])
    setChargement(false)
  }

  useEffect(() => { charger() }, [vueActive])

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    if (!nom.trim()) { setMessage({ type: 'erreur', texte: 'Mets le nom d\'un article.' }); return }
    const qte = parseInt(quantite, 10) || 1
    const lignes = [{ nom: nom.trim(), quantite: qte, portee: vueActive, ajoute_par: session.user.id }]
    if (vueActive === 'perso' && aussiCommune) {
      lignes.push({ nom: nom.trim(), quantite: qte, portee: 'collectif', ajoute_par: session.user.id })
    }
    const { error } = await supabase.from('articles').insert(lignes)
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    setNom(''); setQuantite(1); setAussiCommune(false)
    await charger()
  }

  async function basculerAchete(a) {
    await supabase.from('articles').update({ achete: !a.achete }).eq('id', a.id)
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
    await supabase.from('articles').update({ pris_par: session.user.id }).eq('id', a.id)
    await charger()
  }
  async function annulerPrise(a) {
    await supabase.from('articles').update({ pris_par: null }).eq('id', a.id)
    await charger()
  }

  const restants = articles.filter((a) => !a.achete).length

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>🛒 Courses</h1><p>Salut {profil?.prenom} 👋</p></div>
      </header>

      {/* Choix de la liste (seulement pour les enfants) */}
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
        {restants > 0 && <span className="muted" style={{ fontWeight: 400 }}>&nbsp;({restants} à acheter)</span>}
      </div>
      <div className="card">
        {chargement ? (
          <p className="muted">Chargement...</p>
        ) : articles.length === 0 ? (
          <p className="muted">Liste vide.</p>
        ) : (
          articles.map((a) => {
            const prisParMoi = a.pris_par === session.user.id
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
                        {a.pris_par && <> · 🛒 {a.preneur?.prenom} s'en occupe</>}
                      </span>
                    </>
                  )}
                </span>

                {vueActive === 'collectif' && !a.achete && (
                  prisParMoi
                    ? <button className="btn-pris actif" onClick={() => annulerPrise(a)}>✓ Moi</button>
                    : !a.pris_par && <button className="btn-pris" onClick={() => prendre(a)}>C'est moi</button>
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
