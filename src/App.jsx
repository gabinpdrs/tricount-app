import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'

import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Soldes from './pages/Soldes'
import Depenses from './pages/Depenses'
import Courses from './pages/Courses'
import Planning from './pages/Planning'
import Photos from './pages/Photos'

export default function App() {
  const { session, profil } = useAuth()
  const afficherNavbar = session && profil && !profil.must_change_password

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/changer-mot-de-passe" element={<ChangePassword />} />
        <Route path="/" element={<ProtectedRoute><Soldes /></ProtectedRoute>} />
        <Route path="/depenses" element={<ProtectedRoute><Depenses /></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
        <Route path="/planning" element={<ProtectedRoute><Planning /></ProtectedRoute>} />
        <Route path="/photos" element={<ProtectedRoute>{profil?.a_liste_perso ? <Photos /> : <Navigate to="/" replace />}</ProtectedRoute>} />
      </Routes>
      {afficherNavbar && <Navbar />}
    </>
  )
}
