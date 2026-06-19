import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { profil } = useAuth()
  const estEnfant = !!profil?.a_liste_perso
  const classe = ({ isActive }) => (isActive ? 'actif' : '')
  return (
    <nav className="navbar">
      <NavLink to="/" className={classe} end>
        <span className="ico">🏠</span>
        Accueil
      </NavLink>
      <NavLink to="/depenses" className={classe}>
        <span className="ico">🧾</span>
        Dépenses
      </NavLink>
      <NavLink to="/courses" className={classe}>
        <span className="ico">📋</span>
        Listes
      </NavLink>
      <NavLink to="/planning" className={classe}>
        <span className="ico">📅</span>
        Planning
      </NavLink>
      {/* Photos : enfants seulement */}
      {estEnfant && (
        <NavLink to="/photos" className={classe}>
          <span className="ico">📷</span>
          Photos
        </NavLink>
      )}
    </nav>
  )
}
