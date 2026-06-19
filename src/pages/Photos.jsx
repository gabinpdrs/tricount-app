import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const DEBUT = '2026-07-04'
const FIN = '2026-07-08'

export default function Photos() {
  const { session, profil } = useAuth()
  const aListePerso = !!profil?.a_liste_perso        // enfant
  const estGabin = profil?.prenom === 'Gabin'
  const [photos, setPhotos] = useState([])
  const [chargement, setChargement] = useState(true)
  const [msg, setMsg] = useState(null)
  const [diapo, setDiapo] = useState(false)
  const [idx, setIdx] = useState(0)

  const today = new Date().toLocaleDateString('sv-SE') // AAAA-MM-JJ
  const fenetreOuverte = today >= DEBUT && today <= FIN

  async function charger() {
    setChargement(true)
    const { data } = await supabase
      .from('photos_jour')
      .select('id, user_id, jour, url, profiles:user_id(prenom)')
      .order('jour', { ascending: true }).order('created_at', { ascending: true })
    setPhotos(data ?? [])
    setChargement(false)
  }
  useEffect(() => { charger() }, [])

  // Défilement automatique du diaporama
  useEffect(() => {
    if (!diapo || photos.length === 0) return
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), 3000)
    return () => clearInterval(t)
  }, [diapo, photos.length])

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg('Envoi de la photo...')
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const chemin = `${session.user.id}-${today}.${ext}`
    const { error: up } = await supabase.storage.from('souvenirs').upload(chemin, file, { upsert: true, contentType: file.type })
    if (up) { setMsg('Erreur : ' + up.message); return }
    const url = `${supabase.storage.from('souvenirs').getPublicUrl(chemin).data.publicUrl}?t=${Date.now()}`
    const { error } = await supabase.from('photos_jour').upsert(
      { user_id: session.user.id, jour: today, url }, { onConflict: 'user_id,jour' })
    if (error) { setMsg('Erreur : ' + error.message); return }
    setMsg('✅ Photo du jour ajoutée !')
    await charger()
  }

  const maPhotoDuJour = photos.find((p) => p.user_id === session.user.id && p.jour === today)
  const jj = (j) => j.slice(8, 10) + '/' + j.slice(5, 7)

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>📷 Photos</h1><p>Souvenirs du camping</p></div>
      </header>

      {/* Ajout (enfants, pendant le séjour) */}
      {aListePerso && (
        fenetreOuverte ? (
          <div className="card">
            <h3>📸 Ta photo du jour ({jj(today)})</h3>
            {maPhotoDuJour && <img src={maPhotoDuJour.url} alt="ma photo" style={{ width: '100%', borderRadius: 12, marginBottom: 8 }} />}
            <label className="btn-photo-jour">
              {maPhotoDuJour ? 'Remplacer ma photo' : 'Ajouter ma photo'}
              <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
            </label>
            {msg && <p className="message-succes">{msg}</p>}
          </div>
        ) : (
          <div className="card"><p className="muted" style={{ margin: 0 }}>📅 L'album sera ouvert du <strong>4 au 8 juillet</strong> — chaque jour, mets ta photo !</p></div>
        )
      )}

      {/* Bouton diaporama : seulement Gabin */}
      {estGabin && photos.length > 0 && (
        <button onClick={() => { setIdx(0); setDiapo(true) }}>▶️ Lancer le diaporama</button>
      )}

      {/* Galerie */}
      <div className="section-titre">🖼️ L'album</div>
      {chargement ? (
        <div className="card"><p className="muted">Chargement...</p></div>
      ) : photos.length === 0 ? (
        <div className="card"><p className="muted">Aucune photo pour l'instant.</p></div>
      ) : (
        <div className="photos-grid">
          {photos.map((p) => (
            <div className="photo-vignette" key={p.id} onClick={() => { setIdx(photos.indexOf(p)); setDiapo(true) }}>
              <img src={p.url} alt={p.profiles?.prenom} />
              <div className="photo-leg">{p.profiles?.prenom} · {jj(p.jour)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Diaporama plein écran */}
      {diapo && photos.length > 0 && (
        <div className="diapo-overlay">
          <button className="diapo-fermer" onClick={() => setDiapo(false)}>✕</button>
          <img className="diapo-img" src={photos[idx].url} alt="" />
          <div className="diapo-leg">{photos[idx].profiles?.prenom} · {jj(photos[idx].jour)}</div>
          <div className="diapo-controls">
            <button onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}>‹</button>
            <button onClick={() => setIdx((i) => (i + 1) % photos.length)}>›</button>
          </div>
        </div>
      )}
    </div>
  )
}
