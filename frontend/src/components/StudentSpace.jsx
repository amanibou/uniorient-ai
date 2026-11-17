import { useEffect, useState } from 'react'
import './StudentSpace.css'

const API_URL = 'http://127.0.0.1:8000'

// id : valeur côté front ; code : valeur attendue par le backend (IA, GL, CYS)
const SPECIALTIES = [
  { id: 'ia', code: 'IA', label: 'Intelligence Artificielle (IA)' },
  { id: 'gl', code: 'GL', label: 'Génie Logiciel' },
  { id: 'cys', code: 'CYS', label: 'Cybersécurité' },
]

const TABS = [
  { id: 'interets', label: 'Centres d’intérêt' },
  { id: 'notes', label: 'Mes notes' },
  { id: 'resultats', label: 'Mes résultats' },
]

function labelOfCode(code) {
  return SPECIALTIES.find((item) => item.code === code)?.label ?? code
}

function errorText(response, data) {
  if (response.status === 401) return 'Ta session a expiré. Déconnecte-toi et reconnecte-toi.'
  return typeof data.detail === 'string' ? data.detail : 'Une erreur est survenue.'
}

export default function StudentSpace({ user, onLogout }) {
  const [tab, setTab] = useState('interets')
  const [interests, setInterests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState(null)

  const fullName = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.matricule

  // Au chargement : on récupère les choix déjà enregistrés pour ce compte
  useEffect(() => {
    let cancelled = false

    async function loadInterests() {
      setLoading(true)
      try {
        const response = await fetch(`${API_URL}/etudiant/interets`, {
          headers: { Authorization: `Bearer ${user.access_token}` },
        })
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (response.ok) {
          setInterests(
            SPECIALTIES.filter((item) => data.specialites.includes(item.code)).map((item) => item.id)
          )
        } else {
          setMessage({ type: 'error', text: errorText(response, data) })
        }
      } catch (err) {
        if (!cancelled) {
          setMessage({ type: 'error', text: 'Serveur injoignable. Vérifie que le backend est lancé.' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInterests()
    return () => {
      cancelled = true
    }
  }, [user.access_token])

  // Onglet "Mes notes" : on charge les notes à chaque fois qu'on ouvre l'onglet
  useEffect(() => {
    if (tab !== 'notes') return
    let cancelled = false

    async function loadNotes() {
      setNotesLoading(true)
      setNotesError(null)
      try {
        const response = await fetch(`${API_URL}/etudiant/notes`, {
          headers: { Authorization: `Bearer ${user.access_token}` },
        })
        const data = await response.json().catch(() => [])
        if (cancelled) return
        if (response.ok) {
          setNotes(data)
        } else {
          setNotesError(errorText(response, {}))
        }
      } catch (err) {
        if (!cancelled) {
          setNotesError('Serveur injoignable. Vérifie que le backend est lancé.')
        }
      } finally {
        if (!cancelled) setNotesLoading(false)
      }
    }

    loadNotes()
    return () => {
      cancelled = true
    }
  }, [tab, user.access_token])

  function toggleInterest(id) {
    setMessage(null)
    setInterests((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  async function handleConfirm() {
    setMessage(null)
    if (interests.length === 0) {
      setMessage({ type: 'error', text: 'Choisis au moins une spécialité.' })
      return
    }

    setSaving(true)
    try {
      const codes = SPECIALTIES.filter((item) => interests.includes(item.id)).map((item) => item.code)
      const response = await fetch(`${API_URL}/etudiant/interets`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ specialites: codes }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const chosen = data.specialites.map(labelOfCode).join(', ')
        setMessage({ type: 'success', text: `Choix enregistrés : ${chosen}.` })
      } else {
        setMessage({ type: 'error', text: errorText(response, data) })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Serveur injoignable. Vérifie que le backend est lancé.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-page student-page">
      <header className="student-greeting">
        <h2>Bonjour {fullName}</h2>
        <p>Matricule : {user.matricule}</p>
      </header>

      <div className="student-layout">
        <div className="student-side">
          <aside className="student-sidebar">
            <nav className="sidebar-nav" aria-label="Menu étudiant">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={tab === item.id ? 'nav-btn nav-active' : 'nav-btn'}
                  aria-current={tab === item.id ? 'page' : undefined}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <button type="button" className="secondary-btn sidebar-logout" onClick={onLogout}>
            Déconnexion
          </button>
        </div>

        <div className="student-panel">
          {tab === 'interets' && (
            <div className="panel-body">
              <h3>Centres d’intérêt</h3>
              <p className="panel-hint">Choisis les spécialités qui t’intéressent.</p>
              <div className="checklist">
                {SPECIALTIES.map((item) => (
                  <label key={item.id} className="check-item">
                    <input
                      type="checkbox"
                      checked={interests.includes(item.id)}
                      disabled={loading}
                      onChange={() => toggleInterest(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="primary-btn"
                onClick={handleConfirm}
                disabled={loading || saving}
              >
                {saving ? 'Enregistrement…' : 'OK'}
              </button>

              {loading && <p className="panel-note">Chargement de tes choix…</p>}

              {message && (
                <p className={message.type === 'success' ? 'status-success' : 'status-error'}>
                  {message.text}
                </p>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="panel-body">
              <h3>Mes notes</h3>
              <p className="panel-hint">
                Lecture seule. Chaque professeur saisit les notes de son module.
              </p>

              {notesLoading && <p className="panel-note">Chargement de tes notes…</p>}

              {notesError && <p className="status-error">{notesError}</p>}

              {!notesLoading && !notesError && (
                <table className="grades-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Note /20</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notes.map((item) => (
                      <tr key={item.module}>
                        <td>{item.module}</td>
                        {item.valeur == null ? (
                          <td className="grade-empty">Pas encore saisie</td>
                        ) : (
                          <td className="grade-value">{item.valeur}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'resultats' && (
            <div className="panel-body">
              <h3>Mes résultats</h3>
              <div className="empty-state">
                <p>Pas encore de résultats d’orientation.</p>
                <p className="panel-note">
                  Ils seront affichés ici, calculés par le moteur RCR. Ce sont des recommandations,
                  pas une décision officielle d’admission.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
