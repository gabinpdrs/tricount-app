import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const { session, profil } = useAuth()
  const [vue, setVue] = useState('collectif')
  const [aussiCollectif, setAussiCollectif] = useState(false)
  const [articles, setArticles] = useState([])
  const [chargement, setChargement] = useState(true)
  const [nom, setNom] = useState('')
  const [quantite, setQuantite] = useState(1)
  const [message, setMessage] = useState(null)

  const [titreAchat, setTitreAchat] = useState('')
  const [montant, setMontant] = useState('')
  const [ticketFile, setTicketFile] = useState(null)
  const [msgAchat, setMsgAchat] = useState(null)

  async function charger() {
    setChargement(true)
    const selection = 'id, nom, quantite, achete, ajoute_par, pris_par, portee, ajouteur:ajoute_par(prenom), acheteur:pris_par(prenom)'

    if (vue === 'collectif') {
      const { data } = await supabase.from('articles').select(selection)
        .eq('portee', 'collectif').order('created_at', { ascending: true })
      setArticles(data ?? [])
    } else {
      // Ma liste = partagée avec mon coéquipier (même équipe)
      const { data: profils } = await supabase.from('profiles').select('id, equipe')
      const monEq = profil?.equipe
      const ids = (profils ?? [])
        .filter((p) => (monEq ? p.equipe === monEq : p.id === session.user.id))
        .map((p) => p.id)
      const safeIds = ids.length ? ids : [session.user.id]
      const { data } = await supabase.from('articles').select(selection)
        .eq('portee', 'perso').in('ajoute_par', safeIds).order('created_at', { ascending: true })
      setArticles(data ?? [])
    }
    setChargement(false)
  }

  useEffect(() => { charger() }, [vue])

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    if (!nom.trim()) { setMessage({ type: 'erreur', texte: 'Mets le nom d\'un article.' }); return }
    const qte = parseInt(quantite, 10) || 1
    const lignes = [{ nom: nom.trim(), quantite: qte, portee: vue, ajoute_par: session.user.id }]
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
    if (!window.confirm('Supprimer cet article ?')) return
    await supabase.from('articles').delete().eq('id', id)
    await charger()
  }

  // Mettre un article de ma liste dans la liste commune
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

  async function validerAchat(e) {
    e.preventDefault()
    setMsgAchat(null)
    const m = parseFloat(String(montant).replace(',', '.'))
    if (Number.isNaN(m) || m <= 0) { setMsgAchat({ type: 'erreur', texte: 'Montant invalide.' }); return }

    let ticketUrl = null
    if (ticketFile) {
      const ext = (ticketFile.name.split('.').pop() || 'jpg').toLowerCase()
      const chemin = `${session.user.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('tickets')
        .upload(chemin, ticketFile, { upsert: true, contentType: ticketFile.type })
      if (upErr) { setMsgAchat({ type: 'erreur', texte: 'Photo : ' + upErr.message }); return }
      ticketUrl = supabase.storage.from('tickets').getPublicUrl(chemin).data.publicUrl
    }

    const { error } = await supabase.rpc('valider_achat', {
      p_titre: titreAchat.trim(), p_montant: m, p_ticket_url: ticketUrl,
    })
    if (error) { setMsgAchat({ type: 'erreur', texte: error.message }); return }
    setTitreAchat(''); setMontant(''); setTicketFile(null)
    setMsgAchat({ type: 'succes', texte: '✅ Achat validé ! Ajouté aux dépenses partagées.' })
    await charger()
  }

  const mesPris = articles.filter((a) => a.pris_par === session.user.id && !a.achete).length

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>🛒 Courses</h1><p>Salut {profil?.prenom} 👋</p></div>
      </header>

      <div className="toggle">
        <button className={vue === 'collectif' ? 'actif' : ''} onClick={() => setVue('collectif')}>🛒 Liste commune</button>
        <button className={vue === 'perso' ? 'actif' : ''} onClick={() => setVue('perso')}>👥 Notre liste</button>
      </div>

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
          {vue === 'perso' && (
            <label className="case-collectif">
              <input type="checkbox" checked={aussiCollectif} onChange={(e) => setAussiCollectif(e.target.checked)} />
              Aussi dans la liste commune
            </label>
          )}
          {message && <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>}
          <button type="submit">Ajouter</button>
        </form>
      </div>

      <div className="section-titre">{vue === 'perso' ? '👥 Notre liste' : '🛒 Liste commune'}</div>
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
                  {vue === 'collectif' && (
                    <>
                      <br />
                      <span className="muted" style={{ fontSize: 12 }}>
                        ajouté par {a.ajouteur?.prenom ?? '?'}
                        {a.pris_par && !prisParMoi && <> · 🛒 pris par {a.acheteur?.prenom}</>}
                      </span>
                    </>
                  )}
                </span>

                {/* Liste perso : envoyer vers la commune */}
                {vue === 'perso' && (
                  <button className="btn-pris" onClick={() => versCommune(a)}>→ Commune</button>
                )}

                {/* Liste commune : "c'est moi qui l'achète" */}
                {vue === 'collectif' && !a.achete && (
                  prisParMoi
                    ? <button className="btn-pris actif" onClick={() => annulerPrise(a)}>✓ Moi</button>
                    : !a.pris_par && <button className="btn-pris" onClick={() => prendre(a)}>C'est moi</button>
                )}

                <button className="lien-suppr" onClick={() => supprimer(a.id)}>✕</button>
              </div>
            )
          })
        )}
      </div>

      {vue === 'collectif' && (
        <>
          <div className="section-titre">💸 Valider mon achat</div>
          <div className="card">
            <p className="muted" style={{ marginTop: 0 }}>
              Tu as pris en charge <strong>{mesPris}</strong> article(s). Mets le montant + la photo du
              ticket : ça crée une dépense partagée entre toutes les équipes.
            </p>
            <form onSubmit={validerAchat}>
              <label>Intitulé (facultatif)</label>
              <input value={titreAchat} onChange={(e) => setTitreAchat(e.target.value)} placeholder="Ex : Courses Carrefour" />
              <label>Montant total (€)</label>
              <input type="number" step="0.01" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="0,00" />
              <label>Photo du ticket de caisse</label>
              <input type="file" accept="image/*" onChange={(e) => setTicketFile(e.target.files?.[0] ?? null)} />
              {msgAchat && <p className={msgAchat.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{msgAchat.texte}</p>}
              <button type="submit">Valider et ajouter aux dépenses</button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
