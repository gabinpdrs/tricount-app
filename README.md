# 💸 Tricount entre amis

Application de partage de dépenses entre 5 amis.
Stack : **React + Vite**, **Supabase**, **Cloudflare Pages**.

## Fonctionnalités
- Connexion par **prénom + mot de passe** (changement obligatoire à la 1re connexion)
- Page **Soldes** : combien tu dois / on te doit + qui rembourse qui
- Page **Dépenses** : ajouter une dépense et **cocher** avec qui la partager
- Calcul automatique des soldes et des remboursements

## Étapes

### 1. Supabase
1. Crée un projet sur supabase.com
2. **SQL Editor** → colle `supabase/schema.sql` → **Run**
3. Crée tes 5 joueurs dans **Authentication → Users → Add user** :
   - Email : `prenom@tricount.local` (en minuscules)
   - Password : `Prénom1`
   - ✅ coche **Auto Confirm User**
4. **Settings → API** → copie `Project URL` et `anon public`

### 2. Variables d'environnement
Crée un fichier `.env` (copie de `.env.example`) :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 3. Lancer en local
```bash
npm install
npm run dev
```

### 4. Déployer (Cloudflare Pages)
- Mets le code sur GitHub (`git init`, `add`, `commit`, `push`)
- Cloudflare → Workers & Pages → Create → Pages → Connect to Git
- Build command : `npm run build` — Output : `dist`
- Ajoute les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
- Save and Deploy

## Comment marchent les soldes ?
Chaque dépense est divisée à parts égales entre les personnes cochées.
- Le **payeur** est crédité du montant total.
- Chaque **participant** est débité de sa part.
- Solde **positif** = on te doit ; **négatif** = tu dois.
