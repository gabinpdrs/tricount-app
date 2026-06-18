import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profil, setProfil] = useState(null)
  const [chargement, setChargement] = useState(true)

  async function chargerProfil(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfil(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await chargerProfil(data.session.user.id)
      setChargement(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, newSession) => {
      setSession(newSession)
      if (newSession) await chargerProfil(newSession.user.id)
      else setProfil(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function deconnexion() {
    await supabase.auth.signOut()
    setProfil(null)
  }
  async function rafraichirProfil() {
    if (session) await chargerProfil(session.user.id)
  }

  return (
    <AuthContext.Provider value={{ session, profil, chargement, deconnexion, rafraichirProfil }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
