import { useEffect, useState } from 'react'
import './StudentSpace.css'
import './ProfessorSpace.css'

const API_URL = 'http://127.0.0.1:8000'

function errorText(response, data) {
  if (response.status === 401) return 'Ta session a expiré. Déconnecte-toi et reconnecte-toi.'
  if (response.status === 403) return 'Cet espace est réservé aux professeurs.'
  return typeof data.detail === 'string' ? data.detail : 'Une erreur est survenue.'
}

export default function ProfessorSpace({ user, onLogout }) {
  const [moduleName, setModuleName] = useState('')
  const [query, setQuery] = useState('')
  const [students, setStudents] = useState([])
  // Valeurs tapées dans les cases de notes (une par étudiant)
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [message, setMessage] = useState(null)

  // Au chargement : le module enseigné par ce professeur
  useEffect(() => {
    let cancelled = false

    async function loadModule() {
      try {
        const response = await fetch(`${API_URL}/professeur/moi`, {
          headers: { Authorization: `Bearer ${user.access_token}` },
        })
        const data = await response.json().catch(() => ({}))
        if (cancelled) return
        if (response.ok) {
          setModuleName(data.module ?? '')
        } else {
          setMessage({ type: 'error', text: errorText(response, data) })
        }
      } catch (err) {
        if (!cancelled) {
          setMessage({ type: 'error', text: 'Serveur injoignable. Vérifie que le backend est lancé.' })
        }
      }
    }

    loadModule()
    return () => {
      cancelled = true
    }
  }, [user.access_token])

  // Liste des étudiants, filtrée par la recherche (attend 300 ms après la dernière frappe)
  useEffect(() => {
    let cancelled = false

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `${API_URL}/professeur/etudiants?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${user.access_token}` } }
        )
        const data = await response.json().catch(() => [])
        if (cancelled) return
        if (response.ok) {
          setStudents(data)
          setDrafts((prev) => {
            const next = { ...prev }
            data.forEach((student) => {
              if (!(student.id in next)) next[student.id] = student.note ?? ''
            })
            return next
          })
        } else {
          setMessage({ type: 'error', text: errorText(response, {}) })
        }
      } catch (err) {
        if (!cancelled) {
          setMessage({ type: 'error', text: 'Serveur injoignable. Vérifie que le backend est lancé.' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, user.access_token])

  async function saveNote(student) {
    setMessage(null)
    const raw = String(drafts[student.id] ?? '').replace(',', '.').trim()
    const value = Number(raw)
    if (raw === '' || Number.isNaN(value) || value < 0 || value > 20) {
      setMessage({ type: 'error', text: 'La note doit être un nombre entre 0 et 20.' })
      return
    }

    const name = student.prenom && student.nom ? `${student.prenom} ${student.nom}` : student.matricule
    setSavingId(student.id)
    try {
      const response = await fetch(`${API_URL}/professeur/notes/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ valeur: value }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setStudents((list) =>
          list.map((item) => (item.id === student.id ? { ...item, note: data.valeur } : item))
        )
        setMessage({ type: 'success', text: `Note enregistrée pour ${name} : ${data.valeur}/20.` })
      } else {
        setMessage({ type: 'error', text: errorText(response, data) })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Serveur injoignable. Vérifie que le backend est lancé.' })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="space-page student-page prof-page">
      <header className="student-greeting">
        <h2>Bonjour professeur</h2>
        <p>Module : {moduleName || '…'}</p>
      </header>

      <div className="student-panel prof-panel">
        <div className="panel-body">
          <div className="prof-toolbar">
            <input
              className="prof-search"
              type="search"
              placeholder="Chercher par matricule, nom ou prénom"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {message && (
            <p className={message.type === 'success' ? 'status-success' : 'status-error'}>
              {message.text}
            </p>
          )}

          {loading && <p className="panel-note">Recherche…</p>}

          {!loading && students.length === 0 && (
            <p className="panel-note">Aucun étudiant trouvé.</p>
          )}

          {students.length > 0 && (
            <div className="table-wrap">
              <table className="grades-table">
                <thead>
                  <tr>
                    <th>Matricule</th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Note /20</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.matricule}</td>
                      <td>{student.nom}</td>
                      <td>{student.prenom}</td>
                      <td>
                        <input
                          className="note-input"
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={drafts[student.id] ?? ''}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [student.id]: e.target.value }))
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="primary-btn small-btn"
                          disabled={savingId === student.id}
                          onClick={() => saveNote(student)}
                        >
                          {savingId === student.id ? '…' : 'Enregistrer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <button type="button" className="secondary-btn prof-logout" onClick={onLogout}>
        Déconnexion
      </button>
    </section>
  )
}
