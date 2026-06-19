import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const DEBUT = '2026-07-04'
const FIN = '2026-07-08'

export default function Photos() {
  const { session, profil } = useAuth()
  const estGabin = profil?.prenom === 'Gabin'
  const [msg, setMsg] = useState(null)
  const [envoi, setEnvoi] = useState(false)
  const [diapoPhotos, setDiapoPhotos] = useState([])
  const [diapo, setDiapo] = useState(false)
  const [idx, setIdx] = useState(0)

  const today = new Date().toLocaleDateString('sv-SE')
  // ⚠️ TEST : upload débloqué. À remettre après : today >= DEBUT && today <= FIN
  const fenetreOuverte = true

  async function onPhotos(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setEnvoi(true); setMsg('Envoi en cours...')
    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const chemin = `${session.user.id}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
      const { error: up } = await supabase.storage.from('souvenirs').upload(chemin, file, { contentType: file.type })
      if (up) { setEnvoi(false); setMsg('Erreur : ' + up.message); return }
      const url = supabase.storage.from('souvenirs').getPublicUrl(chemin).data.publicUrl
      const { error } = await supabase.from('photos_jour').insert({ user_id: session.user.id, jour: today, url })
      if (error) { setEnvoi(false); setMsg('Erreur : ' + error.message); return }
    }
    setEnvoi(false)
    setMsg(`✅ ${files.length} photo(s) envoyée(s) ! Elles restent cachées jusqu'au diaporama 🤫`)
    e.target.value = ''
  }

  async function lancerDiapo() {
    // Double sécurité : on confirme deux fois (action qui révèle tout)
    if (!window.confirm('⚠️ Lancer le diaporama va RÉVÉLER toutes les photos. Continuer ?')) return
    if (!window.confirm('Es-tu vraiment sûr ? Une fois lancé, tout le monde autour va les voir 🎬')) return
    const { data } = await supabase.from('photos_jour')
      .select('id, url, jour, profiles:user_id(prenom)')
      .order('created_at', { ascending: true })
    setDiapoPhotos(data ?? [])
    setIdx(0)
    setDiapo(true)
  }

  const jj = (j) => j.slice(8, 10) + '/' + j.slice(5, 7)

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>📷 Photos</h1><p>Souvenirs surprise du camping</p></div>
      </header>

      {/* Ajout de photos */}
      {fenetreOuverte ? (
        <div className="card">
          <h3>📸 Ajoute tes photos du jour</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Mets-en autant que tu veux ! Tu ne les reverras pas : elles restent <strong>cachées</strong> jusqu'à
            ce que Gabin lance le diaporama 🎬
          </p>
          <label className="btn-photo-jour">
            {envoi ? 'Envoi...' : '+ Ajouter des photos'}
            <input type="file" accept="image/*" multiple onChange={onPhotos} style={{ display: 'none' }} disabled={envoi} />
          </label>
          {msg && <p className="message-succes">{msg}</p>}
        </div>
      ) : (
        <div className="card"><p className="muted" style={{ margin: 0 }}>📅 L'album sera ouvert du <strong>4 au 8 juillet</strong>.</p></div>
      )}

      {/* Révéler : seulement Gabin */}
      {estGabin ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted" style={{ marginTop: 0 }}>Toi seul peux révéler les photos 🤫</p>
          <button onClick={lancerDiapo}>▶️ Lancer le diaporama</button>
        </div>
      ) : (
        <p className="muted" style={{ textAlign: 'center' }}>🤫 Les photos sont secrètes — c'est Gabin qui lancera le diaporama.</p>
      )}

      {/* Diaporama plein écran */}
      {diapo && (
        <div className="diapo-overlay">
          <button className="diapo-fermer" onClick={() => setDiapo(false)}>✕</button>
          {diapoPhotos.length === 0 ? (
            <div style={{ color: '#fff', fontWeight: 700 }}>Aucune photo pour l'instant 📭</div>
          ) : (
            <>
              <img className="diapo-img" src={diapoPhotos[idx].url} alt="" />
              <div className="diapo-leg">{diapoPhotos[idx].profiles?.prenom} · {jj(diapoPhotos[idx].jour)} ({idx + 1}/{diapoPhotos.length})</div>
              <div className="diapo-controls">
                <button onClick={() => setIdx((i) => (i - 1 + diapoPhotos.length) % diapoPhotos.length)}>‹ Précédent</button>
                <button onClick={() => setIdx((i) => (i + 1) % diapoPhotos.length)}>Suivant ›</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
