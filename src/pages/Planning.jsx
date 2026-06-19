import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const JOURS_LONG = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const PALETTE = ['#e8820c', '#e6398f', '#2563eb', '#1f2d3d', '#16a34a', '#7c3aed', '#0e8a8f']
const H_DEBUT = 7, H_FIN = 22, H_PX = 48 // grille horaire

function ymd(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function debutSemaine(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
function initiale(nom) { return nom ? nom.charAt(0).toUpperCase() : '?' }
function hauteurEvt(a) {
  if (a.heure && a.heure_fin) {
    const [h1, m1] = a.heure.split(':').map(Number)
    const [h2, m2] = a.heure_fin.split(':').map(Number)
    const dur = (h2 + (m2 || 0) / 60) - (h1 + (m1 || 0) / 60)
    if (dur > 0) return Math.max(22, dur * H_PX - 4)
  }
  return H_PX - 4
}

// Le planning ne couvre que le séjour : 4 au 8 juillet 2026
const PLAN_DEBUT = '2026-07-04'
const PLAN_FIN = '2026-07-08'
function clampJour(d) {
  const s = ymd(d)
  if (s < PLAN_DEBUT) return new Date(PLAN_DEBUT + 'T12:00:00')
  if (s > PLAN_FIN) return new Date(PLAN_FIN + 'T12:00:00')
  return d
}

export default function Planning() {
  const { session, profil } = useAuth()
  const estEnfant = !!profil?.a_liste_perso
  const aujourdhui = new Date()

  const [vue, setVue] = useState('semaine')
  const [curseur, setCurseur] = useState(clampJour(new Date(aujourdhui)))
  const [activites, setActivites] = useState([])
  const [membres, setMembres] = useState([])
  const [filtre, setFiltre] = useState([])        // ids d'enfants pour filtrer
  const [selAct, setSelAct] = useState(null)
  const [chargement, setChargement] = useState(true)
  const scrollRef = useRef(null)

  const [titre, setTitre] = useState('')
  const [dateDebut, setDateDebut] = useState(PLAN_DEBUT)
  const [dateFin, setDateFin] = useState(PLAN_DEBUT)
  const [jourEntier, setJourEntier] = useState(false)
  const [heure, setHeure] = useState('')
  const [heureFin, setHeureFin] = useState('')
  const [lieu, setLieu] = useState('')
  const [description, setDescription] = useState('')
  const [participants, setParticipants] = useState([])
  const [visibleParents, setVisibleParents] = useState(true)
  const [message, setMessage] = useState(null)

  const enfants = useMemo(() => membres.filter((m) => m.a_liste_perso), [membres])
  const couleur = useMemo(() => {
    const map = {}
    enfants.forEach((e, i) => { map[e.id] = PALETTE[i % PALETTE.length] })
    return (a) => map[a.cree_par] || '#0e8a8f'
  }, [enfants])

  const plage = useMemo(() => {
    if (vue === 'jour') return { debut: new Date(curseur), fin: new Date(curseur) }
    if (vue === 'semaine') { const d = debutSemaine(curseur); return { debut: d, fin: addDays(d, 6) } }
    const d = new Date(curseur.getFullYear(), curseur.getMonth(), 1)
    return { debut: d, fin: new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0) }
  }, [vue, curseur])

  async function charger() {
    setChargement(true)
    const { data: profs } = await supabase.from('profiles').select('id, prenom, photo_url, a_liste_perso')
    const { data: acts } = await supabase
      .from('activites')
      .select('id, titre, date_debut, date_fin, heure, heure_fin, lieu, description, visible_parents, cree_par, activite_participants(user_id)')
      .lte('date_debut', ymd(plage.fin)).gte('date_fin', ymd(plage.debut))
      .order('heure', { ascending: true })
    setMembres(profs ?? [])
    setActivites(acts ?? [])
    setChargement(false)
  }
  useEffect(() => { charger() }, [vue, curseur])

  // Défile vers le matin à l'ouverture de la vue semaine/jour
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (8 - H_DEBUT) * H_PX
  }, [vue])

  const passeFiltre = (a) => filtre.length === 0 || (a.activite_participants || []).some((p) => filtre.includes(p.user_id))
  const couvre = (a, jourStr) => a.date_debut <= jourStr && jourStr <= a.date_fin
  const visibles = activites.filter(passeFiltre)
  const sansHeure = (a) => !a.heure || a.date_debut !== a.date_fin // multi-jours ou sans heure -> "journée"

  function reculer() {
    if (vue === 'jour') setCurseur(addDays(curseur, -1))
    else if (vue === 'semaine') setCurseur(addDays(curseur, -7))
    else setCurseur(new Date(curseur.getFullYear(), curseur.getMonth() - 1, 1))
  }
  function avancer() {
    if (vue === 'jour') setCurseur(addDays(curseur, 1))
    else if (vue === 'semaine') setCurseur(addDays(curseur, 7))
    else setCurseur(new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1))
  }
  function toggleFiltre(id) { setFiltre((f) => f.includes(id) ? f.filter((x) => x !== id) : [...f, id]) }
  function toggleParticipant(id) { setParticipants((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) }

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    if (!titre.trim()) { setMessage({ type: 'erreur', texte: 'Mets un titre.' }); return }
    if (dateFin < dateDebut) { setMessage({ type: 'erreur', texte: 'La date de fin est avant le début.' }); return }
    if (dateDebut < PLAN_DEBUT || dateFin > PLAN_FIN) { setMessage({ type: 'erreur', texte: 'Le planning va du 4 au 8 juillet seulement.' }); return }
    const { data, error } = await supabase.from('activites').insert({
      titre: titre.trim(), date_debut: dateDebut, date_fin: dateFin,
      heure: jourEntier ? null : (heure || null), heure_fin: jourEntier ? null : (heureFin || null),
      lieu: lieu.trim() || null, description: description.trim() || null,
      visible_parents: visibleParents, cree_par: session.user.id,
    }).select().single()
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    if (participants.length) {
      await supabase.from('activite_participants').insert(participants.map((uid) => ({ activite_id: data.id, user_id: uid })))
    }
    setTitre(''); setHeure(''); setHeureFin(''); setLieu(''); setDescription(''); setJourEntier(false); setParticipants([]); setVisibleParents(true)
    await charger()
  }
  async function supprimer(id) {
    if (!window.confirm('Supprimer cette activité ?')) return
    await supabase.from('activites').delete().eq('id', id)
    setSelAct(null)
    await charger()
  }

  const prenomDe = (id) => membres.find((m) => m.id === id)?.prenom ?? '?'

  const labelPeriode = () => {
    if (vue === 'jour') return curseur.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (vue === 'semaine') { const d = debutSemaine(curseur); const f = addDays(d, 6); return `${d.getDate()} – ${f.getDate()} ${MOIS[f.getMonth()]} ${f.getFullYear()}` }
    return `${MOIS[curseur.getMonth()]} ${curseur.getFullYear()}`
  }

  const heures = []
  for (let h = H_DEBUT; h <= H_FIN; h++) heures.push(h)

  // Grille horaire (1 jour pour la vue Jour, 7 pour la Semaine)
  function GrilleHoraire({ jours }) {
    return (
      <div className="tg">
        <div className="tg-head">
          <div className="tg-timecol" />
          {jours.map((j, i) => {
            const auj = ymd(j) === ymd(aujourdhui)
            return (
              <div className={`tg-day-head ${auj ? 'auj' : ''}`} key={i}>
                <div className="tg-day-name">{JOURS_LONG[(j.getDay() + 6) % 7]}</div>
                <div className="tg-day-num">{j.getDate()}</div>
              </div>
            )
          })}
        </div>

        <div className="tg-allday">
          <div className="tg-timecol">journée</div>
          {jours.map((j, i) => {
            const jourStr = ymd(j)
            const barres = visibles.filter((a) => sansHeure(a) && couvre(a, jourStr))
            return (
              <div className="tg-allday-col" key={i}>
                {barres.map((a) => (
                  <div className="tg-allday-bar" key={a.id} style={{ background: couleur(a) }} onClick={() => setSelAct(a)}>
                    {a.titre}
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div className="tg-scroll" ref={scrollRef}>
          <div className="tg-grid">
            <div className="tg-hours">
              {heures.map((h) => <div className="tg-hour" key={h}>{h}:00</div>)}
            </div>
            {jours.map((j, i) => {
              const jourStr = ymd(j)
              const evts = visibles.filter((a) => !sansHeure(a) && couvre(a, jourStr))
              return (
                <div className="tg-day-col" key={i}>
                  {heures.map((h) => <div className="tg-hourline" key={h} />)}
                  {evts.map((a) => {
                    const [hh, mm] = a.heure.split(':').map(Number)
                    const top = Math.max(0, (hh - H_DEBUT + (mm || 0) / 60) * H_PX)
                    return (
                      <div className="tg-event" key={a.id}
                        style={{ background: couleur(a), top: top + 'px', height: hauteurEvt(a) + 'px' }}
                        onClick={() => setSelAct(a)}>
                        {a.heure_fin ? `${a.heure}–${a.heure_fin}` : a.heure} {a.titre}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Grille du mois
  const cellulesMois = useMemo(() => {
    const dec = (new Date(curseur.getFullYear(), curseur.getMonth(), 1).getDay() + 6) % 7
    const nb = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0).getDate()
    const arr = []
    for (let i = 0; i < dec; i++) arr.push(null)
    for (let d = 1; d <= nb; d++) arr.push(d)
    return arr
  }, [curseur])

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>📅 Planning</h1><p>{estEnfant ? 'Organise les activités' : 'Lecture seule'}</p></div>
        <button className="btn-deco" onClick={() => { setCurseur(clampJour(new Date())); }}>Aujourd'hui</button>
      </header>

      {/* Filtres par enfant */}
      <div className="chips-row">
        {enfants.map((m) => (
          <button className={`chip ${filtre.includes(m.id) ? 'actif' : ''}`} key={m.id} onClick={() => toggleFiltre(m.id)}>
            <span className="chip-av">
              {m.photo_url ? <img className="avatar-img" src={m.photo_url} alt={m.prenom} /> : initiale(m.prenom)}
            </span>
            {m.prenom}
          </button>
        ))}
      </div>

      <div className="toggle">
        <button className={vue === 'jour' ? 'actif' : ''} onClick={() => setVue('jour')}>Jour</button>
        <button className={vue === 'semaine' ? 'actif' : ''} onClick={() => setVue('semaine')}>Semaine</button>
        <button className={vue === 'mois' ? 'actif' : ''} onClick={() => setVue('mois')}>Mois</button>
      </div>

      <div className="cal-header">
        <button className="cal-nav" onClick={reculer}>‹</button>
        <span className="cal-mois">{labelPeriode()}</span>
        <button className="cal-nav" onClick={avancer}>›</button>
      </div>

      {chargement ? (
        <div className="card"><p className="muted">Chargement...</p></div>
      ) : vue === 'mois' ? (
        <div className="card">
          <div className="cal-grid">
            {JOURS.map((j, i) => <div className="cal-jour-nom" key={'j' + i}>{j}</div>)}
            {cellulesMois.map((d, i) => {
              if (d === null) return <div className="cal-cell vide" key={i} />
              const dateStr = ymd(new Date(curseur.getFullYear(), curseur.getMonth(), d))
              const aDes = visibles.some((a) => couvre(a, dateStr))
              const classes = ['cal-cell']
              if (dateStr === ymd(aujourdhui)) classes.push('auj')
              return (
                <button className={classes.join(' ')} key={i}
                  onClick={() => { setCurseur(new Date(curseur.getFullYear(), curseur.getMonth(), d)); setVue('jour') }}>
                  {d}{aDes && <span className="cal-dot" />}
                </button>
              )
            })}
          </div>
        </div>
      ) : vue === 'jour' ? (
        <GrilleHoraire jours={[new Date(curseur)]} />
      ) : (
        <GrilleHoraire jours={[0, 1, 2, 3, 4, 5, 6].map((i) => addDays(debutSemaine(curseur), i))} />
      )}

      {/* Fenêtre détail de l'activité */}
      {selAct && (
        <div className="modal-overlay" onClick={() => setSelAct(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ borderTop: `5px solid ${couleur(selAct)}` }}>
            <div className="modal-head">
              <strong>{selAct.titre}{!selAct.visible_parents && <span className="badge-cache">enfants</span>}</strong>
              <button onClick={() => setSelAct(null)}>✕</button>
            </div>

            <p className="modal-info">
              📆 {selAct.date_debut === selAct.date_fin
                ? selAct.date_debut.split('-').reverse().join('/')
                : `du ${selAct.date_debut.split('-').reverse().join('/')} au ${selAct.date_fin.split('-').reverse().join('/')}`}
            </p>
            {selAct.heure && (
              <p className="modal-info">🕒 {selAct.heure}{selAct.heure_fin ? ` – ${selAct.heure_fin}` : ''}</p>
            )}
            {selAct.lieu && <p className="modal-info">📍 {selAct.lieu}</p>}
            {selAct.description && <p className="modal-info">📝 {selAct.description}</p>}
            <p className="modal-info">
              👥 {selAct.activite_participants?.length
                ? selAct.activite_participants.map((p) => prenomDe(p.user_id)).join(', ')
                : 'Personne pour l\'instant'}
            </p>

            {estEnfant && <button className="lien-suppr" onClick={() => supprimer(selAct.id)}>Supprimer l'activité</button>}
          </div>
        </div>
      )}

      {/* Ajout (enfants seulement) */}
      {estEnfant && (
        <div className="card">
          <h3>➕ Nouvelle activité</h3>
          <form onSubmit={ajouter}>
            <label>Titre</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Rando, Pétanque, Baignade..." />

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label>Du</label>
                <input type="date" value={dateDebut} min={PLAN_DEBUT} max={PLAN_FIN} onChange={(e) => { setDateDebut(e.target.value); if (e.target.value > dateFin) setDateFin(e.target.value) }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Au</label>
                <input type="date" value={dateFin} min={dateDebut} max={PLAN_FIN} onChange={(e) => setDateFin(e.target.value)} />
              </div>
            </div>

            <label className="case-collectif">
              <input type="checkbox" checked={jourEntier} onChange={(e) => setJourEntier(e.target.checked)} />
              Jour entier (sans heure)
            </label>

            {!jourEntier && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label>De (heure)</label>
                  <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>À (heure)</label>
                  <input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
                </div>
              </div>
            )}

            <label>Lieu (facultatif)</label>
            <input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Ex : Plage, Aire de jeux..." />

            <label>Description (facultatif)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="2" placeholder="Infos sur l'activité..." />

            <label>Qui vient ? (les enfants)</label>
            <div className="checks">
              {enfants.map((m) => (
                <label className={`check ${participants.includes(m.id) ? 'coche' : ''}`} key={m.id}>
                  <input type="checkbox" checked={participants.includes(m.id)} onChange={() => toggleParticipant(m.id)} />
                  {m.prenom}
                </label>
              ))}
            </div>

            <label className="case-collectif">
              <input type="checkbox" checked={visibleParents} onChange={(e) => setVisibleParents(e.target.checked)} />
              Visible par les parents
            </label>

            {message && <p className={message.type === 'erreur' ? 'message-erreur' : 'message-succes'}>{message.texte}</p>}
            <button type="submit">Ajouter l'activité</button>
          </form>
        </div>
      )}
    </div>
  )
}
