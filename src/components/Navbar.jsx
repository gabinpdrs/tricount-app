import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { profil } = useAuth()
  const classe = ({ isActive }) => (isActive ? 'actif' : '')

  // Lucile (mode "cocheuse") ne voit que l'onglet Courses
  if (profil?.peut_seulement_cocher) {
    return (
      <nav className="navbar">
        <NavLink to="/courses" className={classe}>
          <span className="ico">🛒</span>
          Courses
        </NavLink>
      </nav>
    )
  }

  return (
    <nav className="navbar">
      <NavLink to="/" className={classe} end>
        <span className="ico">💰</span>
        Soldes
      </NavLink>
      <NavLink to="/depenses" className={classe}>
        <span className="ico">🧾</span>
        Dépenses
      </NavLink>
      <NavLink to="/courses" className={classe}>
        <span className="ico">🛒</span>
        Courses
      </NavLink>
    </nav>
  )
}
