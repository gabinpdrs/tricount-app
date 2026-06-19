import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const JOURS_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function ymd(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function debutSemaine(d) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }

export default function Planning() {
  const { session, profil } = useAuth()
  const estEnfant = !!profil?.a_liste_perso
  const aujourdhui = new Date()

  const [vue, setVue] = useState('semaine')     // jour | semaine | mois
  const [curseur, setCurseur] = useState(new Date(aujourdhui))
  const [activites, setActivites] = useState([])
  const [membres, setMembres] = useState([])
  const [chargement, setChargement] = useState(true)

  // Formulaire
  const [titre, setTitre] = useState('')
  const [dateDebut, setDateDebut] = useState(ymd(aujourdhui))
  const [dateFin, setDateFin] = useState(ymd(aujourdhui))
  const [heure, setHeure] = useState('')
  const [participants, setParticipants] = useState([])
  const [visibleParents, setVisibleParents] = useState(true)
  const [message, setMessage] = useState(null)

  // Plage de dates visible selon la vue
  const plage = useMemo(() => {
    if (vue === 'jour') return { debut: new Date(curseur), fin: new Date(curseur) }
    if (vue === 'semaine') { const d = debutSemaine(curseur); return { debut: d, fin: addDays(d, 6) } }
    const d = new Date(curseur.getFullYear(), curseur.getMonth(), 1)
    return { debut: d, fin: new Date(curseur.getFullYear(), curseur.getMonth() + 1, 0) }
  }, [vue, curseur])

  async function charger() {
    setChargement(true)
    const { data: profs } = await supabase.from('profiles').select('id, prenom')
    const { data: acts } = await supabase
      .from('activites')
      .select('id, titre, date_debut, date_fin, heure, visible_parents, cree_par, activite_participants(user_id)')
      .lte('date_debut', ymd(plage.fin)).gte('date_fin', ymd(plage.debut))
      .order('heure', { ascending: true })
    setMembres(profs ?? [])
    setActivites(acts ?? [])
    setChargement(false)
  }
  useEffect(() => { charger() }, [vue, curseur])

  // Une activité couvre-t-elle ce jour ?
  const couvre = (a, jourStr) => a.date_debut <= jourStr && jourStr <= a.date_fin
  const activitesDuJour = (jourStr) => activites.filter((a) => couvre(a, jourStr))

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

  function toggleParticipant(id) { setParticipants((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) }

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    if (!titre.trim()) { setMessage({ type: 'erreur', texte: 'Mets un titre.' }); return }
    if (dateFin < dateDebut) { setMessage({ type: 'erreur', texte: 'La date de fin est avant le début.' }); return }
    const { data, error } = await supabase.from('activites').insert({
      titre: titre.trim(), date_debut: dateDebut, date_fin: dateFin,
      heure: heure || null, visible_parents: visibleParents, cree_par: session.user.id,
    }).select().single()
    if (error) { setMessage({ type: 'erreur', texte: error.message }); return }
    if (participants.length) {
      await supabase.from('activite_participants').insert(participants.map((uid) => ({ activite_id: data.id, user_id: uid })))
    }
    setTitre(''); setHeure(''); setParticipants([]); setVisibleParents(true)
    await charger()
  }

  async function supprimer(id) {
    if (!window.confirm('Supprimer cette activité ?')) return
    await supabase.from('activites').delete().eq('id', id)
    await charger()
  }

  const prenomDe = (id) => membres.find((m) => m.id === id)?.prenom ?? '?'

  // Affiche une activité (carte)
  function Activite({ a }) {
    const multi = a.date_debut !== a.date_fin
    return (
      <div className="activite-ligne">
        <div className="activite-heure">{a.heure || '—'}</div>
        <div className="activite-info">
          <div className="activite-titre">
            {a.titre}
            {!a.visible_parents && <span className="badge-cache">enfants</span>}
          </div>
          {multi && <div className="muted" style={{ fontSize: 12 }}>📆 du {a.date_debut.split('-').reverse().join('/')} au {a.date_fin.split('-').reverse().join('/')}</div>}
          <div className="muted" style={{ fontSize: 12 }}>
            {a.activite_participants?.length ? '👥 ' + a.activite_participants.map((p) => prenomDe(p.user_id)).join(', ') : 'Personne pour l\'instant'}
          </div>
        </div>
        {estEnfant && <button className="lien-suppr" onClick={() => supprimer(a.id)}>✕</button>}
      </div>
    )
  }

  // Étiquette de la période
  const labelPeriode = () => {
    if (vue === 'jour') return curseur.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (vue === 'semaine') { const d = debutSemaine(curseur); const f = addDays(d, 6); return `${d.getDate()} – ${f.getDate()} ${MOIS[f.getMonth()]}` }
    return `${MOIS[curseur.getMonth()]} ${curseur.getFullYear()}`
  }

  // Grille du mois
  const cellulesMois = useMemo(() => {
    const premier = new Date(curseur.getFullYear(), curseur.getMonth(), 1)
    const dec = (premier.getDay() + 6) % 7
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
      </header>

      {/* Sélecteur de vue */}
      <div className="toggle">
        <button className={vue === 'jour' ? 'actif' : ''} onClick={() => setVue('jour')}>Jour</button>
        <button className={vue === 'semaine' ? 'actif' : ''} onClick={() => setVue('semaine')}>Semaine</button>
        <button className={vue === 'mois' ? 'actif' : ''} onClick={() => setVue('mois')}>Mois</button>
      </div>

      {/* Navigation période */}
      <div className="card">
        <div className="cal-header">
          <button onClick={reculer}>‹</button>
          <span className="cal-mois">{labelPeriode()}</span>
          <button onClick={avancer}>›</button>
        </div>

        {/* VUE MOIS : grille */}
        {vue === 'mois' && (
          <div className="cal-grid">
            {JOURS.map((j, i) => <div className="cal-jour-nom" key={'j' + i}>{j}</div>)}
            {cellulesMois.map((d, i) => {
              if (d === null) return <div className="cal-cell vide" key={i} />
              const dateStr = ymd(new Date(curseur.getFullYear(), curseur.getMonth(), d))
              const aDes = activitesDuJour(dateStr).length > 0
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
        )}
      </div>

      {/* VUE JOUR */}
      {vue === 'jour' && (
        <div className="card">
          {chargement ? <p className="muted">Chargement...</p>
            : activitesDuJour(ymd(curseur)).length === 0 ? <p className="muted">Aucune activité ce jour.</p>
              : activitesDuJour(ymd(curseur)).map((a) => <Activite key={a.id} a={a} />)}
        </div>
      )}

      {/* VUE SEMAINE : 7 jours */}
      {vue === 'semaine' && (
        chargement ? <div className="card"><p className="muted">Chargement...</p></div>
          : [0, 1, 2, 3, 4, 5, 6].map((i) => {
            const jour = addDays(debutSemaine(curseur), i)
            const jourStr = ymd(jour)
            const acts = activitesDuJour(jourStr)
            const estAuj = jourStr === ymd(aujourdhui)
            return (
              <div className="card" key={i} style={{ padding: '12px 14px' }}>
                <div className={`semaine-jour ${estAuj ? 'auj' : ''}`}>{JOURS_LONG[i]} {jour.getDate()}</div>
                {acts.length === 0 ? <p className="muted" style={{ margin: '6px 0 0' }}>—</p>
                  : acts.map((a) => <Activite key={a.id} a={a} />)}
              </div>
            )
          })
      )}

      {/* Ajout (enfants seulement) */}
      {estEnfant ? (
        <div className="card">
          <h3>➕ Nouvelle activité</h3>
          <form onSubmit={ajouter}>
            <label>Titre</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Rando, Pétanque, Baignade..." />

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label>Du</label>
                <input type="date" value={dateDebut} onChange={(e) => { setDateDebut(e.target.value); if (e.target.value > dateFin) setDateFin(e.target.value) }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Au</label>
                <input type="date" value={dateFin} min={dateDebut} onChange={(e) => setDateFin(e.target.value)} />
              </div>
            </div>

            <label>Heure (facultatif)</label>
            <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />

            <label>Qui vient ?</label>
            <div className="checks">
              {membres.map((m) => (
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
      ) : (
        <p className="muted" style={{ textAlign: 'center' }}>👀 Lecture seule — seuls les enfants modifient le planning.</p>
      )}
    </div>
  )
}
