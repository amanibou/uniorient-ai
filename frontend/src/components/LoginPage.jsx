import { useState } from 'react'
import Orb3D from './Orb3D'

const API_URL = 'http://127.0.0.1:8000'

export default function LoginPage({ onBack, onSignup, onLoggedIn }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ type: '', message: '' })
    setSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok) {
        onLoggedIn(data)
      } else {
        const message = typeof data.detail === 'string'
          ? data.detail
          : 'Données invalides, vérifie les champs.'
        setStatus({ type: 'error', message })
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Serveur injoignable. Vérifie que le backend est lancé (uvicorn).' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <Orb3D showLegend={false} />

      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Connexion</h2>

        <label className="field">
          <span>Matricule ou email</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? 'Connexion en cours…' : 'Se connecter'}
        </button>

        {status.message && (
          <p className="status-error">{status.message}</p>
        )}

        <button type="button" className="link-btn" onClick={onSignup}>Créer un compte étudiant</button>
        <button type="button" className="link-btn" onClick={onBack}>Retour à l’accueil</button>
      </form>
    </section>
  )
}
