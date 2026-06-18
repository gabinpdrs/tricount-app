import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error("⚠️ Variables Supabase manquantes. As-tu créé le fichier .env ?")
}

export const supabase = createClient(url, anonKey)

// Le login se fait avec le prénom -> on le transforme en faux email
// Ex : "Lucas" -> "lucas@tricount.local"
export function prenomVersEmail(prenom) {
  return prenom.trim().toLowerCase() + '@tricount.local'
}
