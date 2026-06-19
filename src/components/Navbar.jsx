import { NavLink } from 'react-router-dom'

export default function Navbar() {
  const classe = ({ isActive }) => (isActive ? 'actif' : '')
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
      <NavLink to="/planning" className={classe}>
        <span className="ico">📅</span>
        Planning
      </NavLink>
    </nav>
  )
}
