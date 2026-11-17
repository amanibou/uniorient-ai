import { useEffect, useState } from 'react'
import Orb3D from './components/Orb3D'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import StudentSpace from './components/StudentSpace'
import ProfessorSpace from './components/ProfessorSpace'
import AdminSpace from './components/AdminSpace'
import './App.css'

const OTHER_ROLE_LABELS = { admin: 'Admin', professeur: 'Professeur' }

function App() {
  const [theme, setTheme] = useState('light')
  const [view, setView] = useState('home')
  const [user, setUser] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function handleLogout() {
    setUser(null)
    setView('home')
  }

  let content
  if (user && user.role === 'etudiant') {
    content = <StudentSpace user={user} onLogout={handleLogout} />
  } else if (user && user.role === 'professeur') {
    content = <ProfessorSpace user={user} onLogout={handleLogout} />
  } else if (user && user.role === 'admin') {
    content = (
      <AdminSpace
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />
    )
  } else if (user) {
    content = (
      <section className="space-page">
        <h2>Espace {OTHER_ROLE_LABELS[user.role] ?? user.role}</h2>
        <p>Cet espace n’est pas encore construit : ses fonctions ne sont pas encore définies.</p>
        <button type="button" className="secondary-btn" onClick={handleLogout}>
          Déconnexion
        </button>
      </section>
    )
  } else if (view === 'login') {
    content = (
      <LoginPage
        onBack={() => setView('home')}
        onSignup={() => setView('signup')}
        onLoggedIn={(data) => setUser(data)}
      />
    )
  } else if (view === 'signup') {
    content = (
      <SignupPage
        onBack={() => setView('home')}
        onLogin={() => setView('login')}
      />
    )
  } else {
    content = (
      <div className="home-split">
        <div className="home-orb">
          <Orb3D />
        </div>
        <div className="home-text">
          <h1>UniOrient-AI</h1>
          <p>Orientation universitaire intelligente</p>
          <div className="home-actions">
            <button className="primary-btn" onClick={() => setView('login')}>
              Connexion
            </button>
            <button className="secondary-btn" onClick={() => setView('signup')}>
              Inscription
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="aurora">
      <div className="aurora-blob blob-1" />
      <div className="aurora-blob blob-2" />
      <div className="aurora-blob blob-3" />

      <main className="app-shell">
        {!(user && user.role === 'admin') && (
          <header className="topbar">
            <button
              className="theme-toggle"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? 'Mode nuit' : 'Mode blanc'}
            </button>
          </header>
        )}

        <section className="hero">{content}</section>
      </main>
    </div>
  )
}

export default App
