import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function ymd(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

export default function Planning() {
  const { session, profil } = useAuth()
  const estEnfant = !!profil?.a_liste_perso

  const aujourdhui = new Date()
  const [annee, setAnnee] = useState(aujourdhui.getFullYear())
  const [mois, setMois] = useState(aujourdhui.getMonth())
  const [selDate, setSelDate] = useState(ymd(aujourdhui))
  const [activites, setActivites] = useState([])
  const [membres, setMembres] = useState([])
  const [chargement, setChargement] = useState(true)

  const [titre, setTitre] = useState('')
  const [heure, setHeure] = useState('')
  const [participants, setParticipants] = useState([])
  const [visibleParents, setVisibleParents] = useState(true)
  const [message, setMessage] = useState(null)

  async function charger() {
    setChargement(true)
    const { data: profs } = await supabase.from('profiles').select('id, prenom')
    const debut = ymd(new Date(annee, mois, 1))
    const fin = ymd(new Date(annee, mois + 1, 0))
    const { data: acts } = await supabase
      .from('activites')
      .select('id, titre, date_activite, heure, visible_parents, cree_par, activite_participants(user_id)')
      .gte('date_activite', debut).lte('date_activite', fin)
      .order('heure', { ascending: true })
    setMembres(profs ?? [])
    setActivites(acts ?? [])
    setChargement(false)
  }

  useEffect(() => { charger() }, [annee, mois])

  const cellules = useMemo(() => {
    const premier = new Date(annee, mois, 1)
    const debutSemaine = (premier.getDay() + 6) % 7 // lundi = 0
    const nbJours = new Date(annee, mois + 1, 0).getDate()
    const arr = []
    for (let i = 0; i < debutSemaine; i++) arr.push(null)
    for (let d = 1; d <= nbJours; d++) arr.push(d)
    return arr
  }, [annee, mois])

  const actsParJour = useMemo(() => {
    const m = {}
    activites.forEach((a) => { (m[a.date_activite] ??= []).push(a) })
    return m
  }, [activites])

  function moisPrecedent() { if (mois === 0) { setMois(11); setAnnee(annee - 1) } else setMois(mois - 1) }
  function moisSuivant() { if (mois === 11) { setMois(0); setAnnee(annee + 1) } else setMois(mois + 1) }
  function toggleParticipant(id) { setParticipants((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) }

  async function ajouter(e) {
    e.preventDefault()
    setMessage(null)
    if (!titre.trim()) { setMessage({ type: 'erreur', texte: 'Mets un titre.' }); return }
    const { data, error } = await supabase.from('activites').insert({
      titre: titre.trim(), date_activite: selDate, heure: heure || null,
      visible_parents: visibleParents, cree_par: session.user.id,
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
  const ymdAuj = ymd(aujourdhui)
  const activitesDuJour = actsParJour[selDate] || []
  const labelSel = new Date(selDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="container">
      <header className="app-header">
        <div><h1>📅 Planning</h1><p>{estEnfant ? 'Organise les activités' : 'Lecture seule'}</p></div>
      </header>

      {/* Calendrier */}
      <div className="card">
        <div className="cal-header">
          <button onClick={moisPrecedent}>‹</button>
          <span className="cal-mois">{MOIS[mois]} {annee}</span>
          <button onClick={moisSuivant}>›</button>
        </div>
        <div className="cal-grid">
          {JOURS.map((j, i) => <div className="cal-jour-nom" key={'j' + i}>{j}</div>)}
          {cellules.map((d, i) => {
            if (d === null) return <div className="cal-cell vide" key={i} />
            const dateStr = ymd(new Date(annee, mois, d))
            const aDes = (actsParJour[dateStr] || []).length > 0
            const classes = ['cal-cell']
            if (dateStr === ymdAuj) classes.push('auj')
            if (dateStr === selDate) classes.push('sel')
            return (
              <button className={classes.join(' ')} key={i} onClick={() => setSelDate(dateStr)}>
                {d}
                {aDes && <span className="cal-dot" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Activités du jour sélectionné */}
      <div className="section-titre" style={{ textTransform: 'capitalize' }}>{labelSel}</div>
      <div className="card">
        {chargement ? (
          <p className="muted">Chargement...</p>
        ) : activitesDuJour.length === 0 ? (
          <p className="muted">Aucune activité ce jour.</p>
        ) : (
          activitesDuJour.map((a) => (
            <div className="activite-ligne" key={a.id}>
              <div className="activite-heure">{a.heure || '—'}</div>
              <div className="activite-info">
                <div className="activite-titre">
                  {a.titre}
                  {!a.visible_parents && <span className="badge-cache">enfants</span>}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {a.activite_participants?.length
                    ? '👥 ' + a.activite_participants.map((p) => prenomDe(p.user_id)).join(', ')
                    : 'Personne pour l\'instant'}
                </div>
              </div>
              {estEnfant && <button className="lien-suppr" onClick={() => supprimer(a.id)}>✕</button>}
            </div>
          ))
        )}
      </div>

      {/* Ajout (enfants seulement) */}
      {estEnfant ? (
        <div className="card">
          <h3>➕ Nouvelle activité</h3>
          <form onSubmit={ajouter}>
            <label>Titre</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Rando, Pétanque, Baignade..." />

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
        <p className="muted" style={{ textAlign: 'center' }}>👀 Tu peux consulter le planning, mais seuls les enfants le modifient.</p>
      )}
    </div>
  )
}
