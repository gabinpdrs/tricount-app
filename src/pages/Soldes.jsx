import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { calculerSoldes, calculerRemboursements, euros } from '../lib/soldes'

// Bannière "camping" : petit paysage (montagnes, lac, tente) + le nom du camping
function CampingBanner() {
  return (
    <div className="camping-banner">
      <svg viewBox="0 0 400 150" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fd3ef" />
            <stop offset="1" stopColor="#fde6c4" />
          </linearGradient>
          <linearGradient id="lac" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3fb0c6" />
            <stop offset="1" stopColor="#1c7f95" />
          </linearGradient>
        </defs>
        <rect width="400" height="150" fill="url(#ciel)" />
        <circle cx="305" cy="60" r="24" fill="#ffd27a" />
        <ellipse cx="80" cy="40" rx="22" ry="8" fill="#ffffff" opacity="0.85" />
        <ellipse cx="112" cy="44" rx="15" ry="6" fill="#ffffff" opacity="0.85" />
        <polygon points="150,100 235,32 320,100" fill="#5e7e46" />
        <polygon points="222,46 235,32 248,46" fill="#ffffff" />
        <polygon points="40,100 120,48 205,100" fill="#6e8e54" />
        <polygon points="107,60 120,48 133,60" fill="#ffffff" />
        <g fill="#3f6b3a">
          <polygon points="300,100 309,82 318,100" />
          <polygon points="320,100 331,78 342,100" />
          <polygon points="345,100 353,84 361,100" />
          <polygon points="150,100 158,84 166,100" />
        </g>
        <rect y="100" width="400" height="50" fill="url(#lac)" />
        <path d="M0,100 Q200,94 400,100 L400,103 Q200,97 0,103 Z" fill="#e7d2a0" />
        <polygon points="48,100 72,72 96,100" fill="#f3933a" />
        <polygon points="72,72 82,100 96,100" fill="#e07d28" />
        <polygon points="66,100 72,84 78,100" fill="#7a3b12" />
        <ellipse cx="116" cy="100" rx="9" ry="3" fill="#6b4423" />
        <path d="M116,99 q-5,-7 0,-12 q5,6 0,12" fill="#ff8a3c" />
        <path d="M116,99 q-3,-4 0,-7 q3,3 0,7" fill="#ffd23c" />
      </svg>
      <div className="camping-banner-texte">
        <div className="camping-nom">Détente et Clapotis</div>
        <div className="camping-sous">🏕️ Lac de Paladru</div>
      </div>
    </div>
  )
}

// Météo du Lac de Paladru (via Open-Meteo, service gratuit et libre)
function meteoInfo(code) {
  if (code === 0) return { emoji: '☀️', label: 'Ensoleillé' }
  if (code <= 2) return { emoji: '🌤️', label: 'Éclaircies' }
  if (code === 3) return { emoji: '☁️', label: 'Couvert' }
  if (code <= 48) return { emoji: '🌫️', label: 'Brouillard' }
  if (code <= 57) return { emoji: '🌦️', label: 'Bruine' }
  if (code <= 67) return { emoji: '🌧️', label: 'Pluie' }
  if (code <= 77) return { emoji: '❄️', label: 'Neige' }
  if (code <= 82) return { emoji: '🌦️', label: 'Averses' }
  if (code <= 86) return { emoji: '🌨️', label: 'Neige' }
  return { emoji: '⛈️', label: 'Orage' }
}

function Meteo() {
  const [m, setM] = useState(null)
  const [eau, setEau] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=45.49&longitude=5.53&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunset&timezone=Europe%2FParis&forecast_days=3')
      .then((r) => r.json()).then(setM).catch(() => setErr(true))
    // Estimation de la température de l'eau : moyenne des 7 derniers jours
    fetch('https://api.open-meteo.com/v1/forecast?latitude=45.49&longitude=5.53&daily=temperature_2m_mean&past_days=7&forecast_days=1&timezone=Europe%2FParis')
      .then((r) => r.json())
      .then((d) => {
        const t = (d.daily?.temperature_2m_mean || []).filter((v) => v != null)
        if (t.length) setEau(Math.round(t.reduce((a, b) => a + b, 0) / t.length))
      }).catch(() => {})
  }, [])
  if (err || !m?.current) return null

  const info = meteoInfo(m.current.weather_code)
  const jourCourt = (t, i) => i === 0 ? "Auj." : new Date(t + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short' })

  return (
    <div className="card meteo">
      <div className="meteo-actuel">
        <span className="meteo-emoji">{info.emoji}</span>
        <div>
          <div className="meteo-temp">{Math.round(m.current.temperature_2m)}°</div>
          <div className="muted">{info.label} · Lac de Paladru</div>
          {m.daily?.sunset?.[0] && <div className="muted">🌇 Coucher du soleil : {m.daily.sunset[0].slice(11, 16)}</div>}
          {eau != null && <div className="muted">🌊 Eau du lac : ~{eau}° (estimée)</div>}
        </div>
      </div>
      <div className="meteo-jours">
        {m.daily.time.slice(0, 3).map((t, i) => (
          <div className="meteo-jour" key={i}>
            <div className="muted">{jourCourt(t, i)}</div>
            <div className="meteo-emoji-mini">{meteoInfo(m.daily.weather_code[i]).emoji}</div>
            <div className="meteo-minmax">{Math.round(m.daily.temperature_2m_max[i])}° / {Math.round(m.daily.temperature_2m_min[i])}°</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Compte à rebours avant le camping (départ le 4 juillet)
function Countdown() {
  const dep = new Date('2026-07-04T00:00:00')
  const fin = new Date('2026-07-08T23:59:59')
  const now = new Date()
  if (now > fin) return null
  let contenu
  if (now < dep) {
    const j = Math.ceil((dep - now) / 86400000)
    contenu = <>⏳ J-{j} avant le camping !</>
  } else {
    const jour = Math.floor((now - dep) / 86400000) + 1
    contenu = <>🏕️ Camping en cours — jour {jour} !</>
  }
  return <div className="card countdown">{contenu}</div>
}

// Roue du soir : tire au sort une famille pour une corvée
function RoueDuSoir({ noms }) {
  const TACHES = [
    { label: 'Vaisselle', emoji: '🍽️' },
    { label: 'Feu de camp', emoji: '🔥' },
    { label: 'Rangement', emoji: '🧹' },
    { label: 'Apéro', emoji: '🥂' },
  ]
  const [tache, setTache] = useState('Vaisselle')
  const [resultat, setResultat] = useState(null)
  const [enCours, setEnCours] = useState(false)

  function tirer() {
    if (enCours || noms.length === 0) return
    setEnCours(true)
    let n = 0
    const t = setInterval(() => {
      setResultat(noms[Math.floor(Math.random() * noms.length)])
      n++
      if (n > 16) {
        clearInterval(t)
        setResultat(noms[Math.floor(Math.random() * noms.length)])
        setEnCours(false)
      }
    }, 80)
  }

  const emoji = TACHES.find((x) => x.label === tache)?.emoji
  return (
    <div className="card">
      <div className="section-titre" style={{ margin: '0 0 8px' }}>🎲 Roue du soir</div>
      <div className="roue-taches">
        {TACHES.map((x) => (
          <button key={x.label} className={`roue-tache ${tache === x.label ? 'actif' : ''}`} onClick={() => setTache(x.label)}>
            {x.emoji} {x.label}
          </button>
        ))}
      </div>
      <div className="roue-resultat">
        {resultat ? <>{emoji} {tache} : <strong>{resultat}</strong></> : <span className="muted">Clique pour tirer au sort !</span>}
      </div>
      <button onClick={tirer} disabled={enCours}>{enCours ? '🎲 Tirage...' : '🎲 Tirer au sort'}</button>
    </div>
  )
}

export default function Soldes() {
  const { session, profil, deconnexion, rafraichirProfil } = useAuth()
  const [equipes, setEquipes] = useState([])
  const [remboursements, setRemboursements] = useState([])
  const [total, setTotal] = useState(0)
  const [nbCourses, setNbCourses] = useState(0)
  const [prochaine, setProchaine] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [photoMsg, setPhotoMsg] = useState('')
  const [enfantsNoms, setEnfantsNoms] = useState([])
  const navigate = useNavigate()

  async function charger() {
    setChargement(true)
    const { data: profils } = await supabase.from('profiles').select('id, prenom, equipe, photo_url, a_liste_perso')
    const { data: deps } = await supabase
      .from('depenses')
      .select('id, montant, payeur_id, depense_partages(user_id)')
    const { data: rembs } = await supabase
      .from('remboursements')
      .select('de_id, vers_id, montant')

    const membres = profils ?? []
    const depenses = (deps ?? []).map((d) => ({
      montant: d.montant,
      payeur_id: d.payeur_id,
      participants: (d.depense_partages ?? []).map((p) => p.user_id),
    }))

    // solde par personne (dépenses + remboursements), puis regroupé par famille
    const sUser = calculerSoldes(depenses, membres, rembs ?? [])
    const map = {}
    membres.forEach((m) => {
      const eq = m.equipe || m.prenom // si pas d'équipe, chacun la sienne
      if (!map[eq]) map[eq] = { id: eq, nom: eq, solde: 0 }
      map[eq].solde += (sUser[m.id] || 0)
    })
    const liste = Object.values(map).map((e) => ({ ...e, solde: Math.round(e.solde * 100) / 100 }))

    const soldeParEquipe = {}
    liste.forEach((e) => { soldeParEquipe[e.id] = e.solde })
    const membresEq = liste.map((e) => ({ id: e.id, prenom: e.nom }))

    setEquipes(liste)
    setEnfantsNoms(membres.filter((p) => p.a_liste_perso).map((p) => p.prenom))
    setRemboursements(calculerRemboursements({ ...soldeParEquipe }, membresEq))
    setTotal((deps ?? []).reduce((acc, d) => acc + Number(d.montant), 0))

    // Bilan Courses : articles de la liste commune encore à acheter
    const { count } = await supabase
      .from('articles').select('*', { count: 'exact', head: true })
      .eq('portee', 'collectif').eq('achete', false)
    setNbCourses(count ?? 0)

    // Bilan Planning : prochaine activité à venir
    const todayStr = new Date().toLocaleDateString('sv-SE') // AAAA-MM-JJ local
    const { data: proch } = await supabase
      .from('activites').select('titre, date_debut, heure')
      .gte('date_fin', todayStr)
      .order('date_debut', { ascending: true }).order('heure', { ascending: true })
      .limit(1)
    setProchaine(proch?.[0] ?? null)

    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoMsg('Envoi de la photo...')
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const chemin = `${session.user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(chemin, file, { upsert: true, contentType: file.type })
    if (upErr) { setPhotoMsg('Erreur : ' + upErr.message); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(chemin)
    const { error: rpcErr } = await supabase.rpc('set_photo', { p_url: `${data.publicUrl}?t=${Date.now()}` })
    if (rpcErr) { setPhotoMsg('Erreur : ' + rpcErr.message); return }
    await rafraichirProfil()
    setPhotoMsg('✅ Photo mise à jour !')
  }

  const monEquipe = profil?.equipe
  const monSolde = equipes.find((e) => e.id === monEquipe)?.solde ?? 0
  const initiale = (nom) => (nom ? nom.charAt(0).toUpperCase() : '?')

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-user">
          <label className="header-avatar" title="Changer ma photo">
            {profil?.photo_url ? <img className="avatar-img" src={profil.photo_url} alt="moi" /> : initiale(profil?.prenom)}
            <input type="file" accept="image/*" onChange={onPhoto} style={{ display: 'none' }} />
          </label>
          <div>
            <h1>🏠 Accueil</h1>
            <p>{profil?.prenom}{monEquipe && <> · famille {monEquipe}</>}</p>
          </div>
        </div>
        <button className="btn-deco" onClick={deconnexion}>Déco</button>
      </header>

      <CampingBanner />
      {profil?.a_liste_perso && <Countdown />}
      <Meteo />

      {photoMsg && <p className="message-succes">{photoMsg}</p>}

      {chargement ? (
        <p className="muted">Chargement...</p>
      ) : (
        <>
          <div className={`card solde-perso ${monSolde < -0.009 ? 'negatif' : monSolde > 0.009 ? 'positif' : ''}`}>
            {monSolde > 0.009 ? (
              <>On doit à ta famille<br /><span className="gros">{euros(monSolde)}</span></>
            ) : monSolde < -0.009 ? (
              <>Ta famille doit<br /><span className="gros">{euros(-monSolde)}</span></>
            ) : (
              <>Famille à jour ✅<br /><span className="gros">{euros(0)}</span></>
            )}
          </div>

          <div className="section-titre">📋 Bilan</div>
          <div className="bilan">
            <div className="bilan-card" onClick={() => navigate('/depenses')}>
              <div className="bilan-ico">🧾</div>
              <div className="bilan-val">{euros(total)}</div>
              <div className="bilan-lbl">Dépenses</div>
            </div>
            <div className="bilan-card" onClick={() => navigate('/courses')}>
              <div className="bilan-ico">🛒</div>
              <div className="bilan-val">{nbCourses}</div>
              <div className="bilan-lbl">À acheter</div>
            </div>
            <div className="bilan-card" onClick={() => navigate('/planning')}>
              <div className="bilan-ico">📅</div>
              <div className="bilan-val petit">{prochaine ? prochaine.titre : '—'}</div>
              <div className="bilan-lbl">Prochaine activité</div>
            </div>
          </div>

          {profil?.a_liste_perso && <RoueDuSoir noms={enfantsNoms} />}

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

          <div className="section-titre">📊 Détail par famille</div>
          <div className="card">
            {equipes.map((e) => (
              <div className="solde-ligne" key={e.id}>
                <span>{e.nom}{e.id === monEquipe && <span className="badge-toi">toi</span>}</span>
                <span className={e.solde < -0.009 ? 'rouge' : e.solde > 0.009 ? 'vert' : 'muted'}>
                  {e.solde > 0.009 ? '+' : ''}{euros(e.solde)}
                </span>
              </div>
            ))}
          </div>

          <p className="muted" style={{ textAlign: 'center' }}>Total des dépenses : {euros(total)}</p>
        </>
      )}
    </div>
  )
}
