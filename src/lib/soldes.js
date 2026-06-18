// Calcule le solde net de chaque membre à partir des dépenses.
// Solde positif = on lui doit de l'argent. Solde négatif = il doit de l'argent.
//
// depenses : [{ montant, payeur_id, participants: [user_id, ...] }]
// membres  : [{ id, prenom }]
export function calculerSoldes(depenses, membres) {
  const solde = {}
  membres.forEach((m) => { solde[m.id] = 0 })

  depenses.forEach((d) => {
    const parts = d.participants || []
    if (parts.length === 0) return
    const partChacun = Number(d.montant) / parts.length
    // le payeur a avancé tout le montant
    solde[d.payeur_id] = (solde[d.payeur_id] ?? 0) + Number(d.montant)
    // chaque participant doit sa part
    parts.forEach((uid) => { solde[uid] = (solde[uid] ?? 0) - partChacun })
  })

  // on arrondit aux centimes
  Object.keys(solde).forEach((id) => { solde[id] = Math.round(solde[id] * 100) / 100 })
  return solde
}

// Propose qui doit rembourser qui (algorithme simple).
// Renvoie [{ de: prenom, vers: prenom, montant }]
export function calculerRemboursements(solde, membres) {
  const nom = {}
  membres.forEach((m) => { nom[m.id] = m.prenom })

  const debiteurs = []  // doivent de l'argent
  const crediteurs = [] // on leur doit
  Object.entries(solde).forEach(([id, v]) => {
    if (v < -0.009) debiteurs.push({ id, montant: -v })
    else if (v > 0.009) crediteurs.push({ id, montant: v })
  })
  debiteurs.sort((a, b) => b.montant - a.montant)
  crediteurs.sort((a, b) => b.montant - a.montant)

  const remboursements = []
  let i = 0, j = 0
  while (i < debiteurs.length && j < crediteurs.length) {
    const d = debiteurs[i], c = crediteurs[j]
    const m = Math.min(d.montant, c.montant)
    remboursements.push({ de: nom[d.id], vers: nom[c.id], montant: Math.round(m * 100) / 100 })
    d.montant -= m
    c.montant -= m
    if (d.montant < 0.009) i++
    if (c.montant < 0.009) j++
  }
  return remboursements
}

// Formate un montant en euros : 12.5 -> "12,50 €"
export function euros(montant) {
  return (Math.round(montant * 100) / 100).toFixed(2).replace('.', ',') + ' €'
}
