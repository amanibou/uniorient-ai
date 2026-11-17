import { useEffect, useState } from 'react'
import Orb3D from './Orb3D'
import './StudentSpace.css'
import './AdminSpace.css'

const API_URL = 'http://127.0.0.1:8000'

const SPECIALTY_LABELS = {
  IA: 'Intelligence Artificielle (IA)',
  GL: 'Génie Logiciel',
  CYS: 'Cybersécurité',
}

// pending : section pas encore branchée au moteur RCR (aucun résultat simulé)
const MENU = [
  { id: 'accueil', label: 'Accueil' },
  { id: 'profils', label: 'Profils Étudiants' },
  { id: 'classique', label: 'Raisonnement Classique', pending: true },
  { id: 'defaut', label: 'Raisonnement par Défaut', pending: true },
  { id: 'floue', label: 'Logique Floue', pending: true },
  { id: 'comparaison', label: 'Comparaison', pending: true },
  { id: 'rapport', label: 'Rapport', pending: true },
  { id: 'apropos', label: 'À propos' },
]

const PENDING_TEXT =
  'Cette section n’est pas encore disponible : le moteur RCR n’est pas encore branché à la plateforme.'

function errorText(response, data) {
  if (response.status === 401) return 'Ta session a expiré. Déconnecte-toi et reconnecte-toi.'
  if (response.status === 403) return 'Cet espace est réservé à l’administrateur.'
  return typeof data.detail === 'string' ? data.detail : 'Une erreur est survenue.'
}

export default function AdminSpace({ user, onLogout, theme, onToggleTheme }) {
  const [tab, setTab] = useState('accueil')
  const [stats, setStats] = useState(null)
  const [etudiants, setEtudiants] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    const headers = { Authorization: `Bearer ${user.access_token}` }

    async function load() {
      setLoading(true)
      setMessage(null)
      try {
        const [statsResponse, listResponse] = await Promise.all([
          fetch(`${API_URL}/admin/stats`, { headers }),
          fetch(`${API_URL}/admin/etudiants`, { headers }),
        ])
        const statsData = await statsResponse.json().catch(() => ({}))
        const listData = await listResponse.json().catch(() => [])
        if (cancelled) return

        if (statsResponse.ok) setStats(statsData)
        else setMessage(errorText(statsResponse, statsData))

        if (listResponse.ok) setEtudiants(listData)
        else setMessage(errorText(listResponse, {}))
      } catch (err) {
        if (!cancelled) setMessage('Serveur injoignable. Vérifie que le backend est lancé.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user.access_token])

  const current = MENU.find((item) => item.id === tab)

  return (
    <section className="space-page student-page admin-page">
      <div className="student-layout">
        <div className="student-side">
          <aside className="student-sidebar admin-sidebar">
            <div className="admin-side-orb">
              <Orb3D showLegend={false} />
            </div>

            <nav className="sidebar-nav" aria-label="Menu admin">
              {MENU.map((item) => (
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

        <div className="admin-main">
          <header className="admin-banner">
            <div className="admin-banner-text">
              <h2>Bonjour administrateur</h2>
              <p>Système d’orientation universitaire · Raisonnement classique, par défaut et logique floue</p>
            </div>
            <button type="button" className="theme-toggle" onClick={onToggleTheme}>
              {theme === 'light' ? 'Mode nuit' : 'Mode blanc'}
            </button>
          </header>

          <div className="student-panel admin-panel">
          {message && <p className="status-error">{message}</p>}
          {loading && <p className="panel-note">Chargement…</p>}

          {tab === 'accueil' && !loading && (
            <div className="panel-body admin-accueil">
              <div className="admin-hero">
                <div className="admin-hero-text">
                  <p className="panel-hint">
                    Vue d’ensemble de la plateforme. Les résultats d’orientation seront affichés ici une fois le moteur RCR branché.
                  </p>
                </div>
              </div>

              {stats && (
                <div className="admin-stats">
                  <div className="admin-stat">
                    <span className="admin-stat-value">{stats.etudiants}</span>
                    <span className="admin-stat-label">Étudiants inscrits</span>
                  </div>
                  <div className="admin-stat">
                    <span className="admin-stat-value">{stats.professeurs}</span>
                    <span className="admin-stat-label">Professeurs</span>
                  </div>
                  <div className="admin-stat">
                    <span className="admin-stat-value">{Object.keys(SPECIALTY_LABELS).length}</span>
                    <span className="admin-stat-label">Spécialités</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'profils' && !loading && (
            <div className="panel-body">
              <h3>Profils Étudiants</h3>
              <p className="panel-hint">{etudiants.length} étudiant(s) inscrit(s).</p>

              {etudiants.length === 0 ? (
                <p className="panel-note">Aucun étudiant inscrit pour le moment.</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Étudiant</th>
                        <th>Matricule</th>
                        <th>Centres d’intérêt</th>
                        <th>Algorithmique</th>
                        <th>Programmation</th>
                        <th>Mathématiques</th>
                      </tr>
                    </thead>
                    <tbody>
                      {etudiants.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <span className="stu-name">
                              {`${student.prenom ?? ''} ${student.nom ?? ''}`.trim() || '—'}
                            </span>
                          </td>
                          <td>
                            <span className="matricule">{student.matricule ?? '—'}</span>
                          </td>
                          <td>
                            {student.specialites.length > 0 ? (
                              <div className="tag-list">
                                {student.specialites.map((code) => (
                                  <span key={code} className="tag">
                                    {SPECIALTY_LABELS[code] ?? code}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="grade-none">Aucun choix</span>
                            )}
                          </td>
                          {student.notes.map((item) => (
                            <td key={item.module}>
                              {item.valeur == null ? (
                                <span className="grade-none">—</span>
                              ) : (
                                <span className="grade-badge">{item.valeur}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {current?.pending && (
            <div className="panel-body">
              <h3>{current.label}</h3>
              <p className="panel-note">{PENDING_TEXT}</p>
            </div>
          )}

          {tab === 'apropos' && (
            <div className="panel-body">
              <h3>À propos</h3>
              <p className="panel-hint">
                UniOrient-AI est une plateforme d’orientation universitaire (4e année Ingéniorat IA,
                Université 8 Mai 1945 Guelma). Les recommandations sont produites par les règles et
                calculs du projet : ce ne sont pas des décisions officielles d’admission.
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </section>
  )
}
