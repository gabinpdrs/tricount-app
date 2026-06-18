import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, profil, chargement } = useAuth()

  if (chargement) {
    return <div className="container"><p className="muted">Chargement...</p></div>
  }
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (profil?.must_change_password) {
    return <Navigate to="/changer-mot-de-passe" replace />
  }
  return children
}
