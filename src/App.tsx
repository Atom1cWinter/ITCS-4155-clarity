import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import NotesPage from './pages/NotesPage'
import FlashcardsPage from './pages/FlashcardsPage'
import NavBar from './components/NavBar'
import QuizzesPage from './pages/Quizzes'
import UploadPage from './pages/UploadPage'
import ProfilePage from './pages/ProfilePage'

/* changed app to hide nav bar on login and registration*/
function AppRoutes() {
  const location = useLocation()
  const hideNav = location.pathname === '/auth'

  return (
    <>
      {!hideNav && <NavBar />}
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/flashcards" element={<FlashcardsPage />} />
        <Route path='/quizzes' element={<QuizzesPage />} />
        <Route path='/upload' element={<UploadPage />} />
        <Route path='/profile' element={<ProfilePage />} />
        <Route path="/" element={<Navigate to="/auth" />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}


export default App
