import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const QR_ELEMENT_ID = 'qr-reader'
const API_URL = 'http://127.0.0.1:8000'

export default function SignupPage({ onBack, onLogin }) {
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [cardFile, setCardFile] = useState(null)
  const [matricule, setMatricule] = useState('')
  const [password, setPassword] = useState('')
  const [cameraOn, setCameraOn] = useState(false)
  const [scanError, setScanError] = useState('')
  const [qrText, setQrText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const scannerRef = useRef(null)

  function getScanner() {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(QR_ELEMENT_ID)
    }
    return scannerRef.current
  }

  // Arrêter la caméra quand on quitte la page
  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(() => {})
      }
    }
  }, [])

  async function stopCamera() {
    const scanner = scannerRef.current
    if (scanner && scanner.isScanning) {
      try {
        await scanner.stop()
      } catch (err) {
        // la caméra était déjà arrêtée
      }
    }
    setCameraOn(false)
  }

  async function startCamera() {
    setScanError('')
    setQrText('')
    try {
      await getScanner().start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          setQrText(decodedText)
          stopCamera()
        },
        () => {
          // frame sans QR : on ignore
        },
      )
      setCameraOn(true)
    } catch (err) {
      setScanError('Caméra inaccessible. Vérifie l’autorisation dans le navigateur.')
    }
  }

  async function handleFile(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) return

    setScanError('')
    setQrText('')
    if (scannerRef.current && scannerRef.current.isScanning) {
      await stopCamera()
    }

    try {
      const text = await getScanner().scanFile(file, false)
      setQrText(text)
    } catch (err) {
      setScanError('Aucun QR code détecté dans cette image.')
    }
    event.target.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    if (!qrText) {
      setStatus({ type: 'error', message: 'Scanne ou importe d’abord le QR code de ta carte.' })
      return
    }

    if (!cardFile) {
      setStatus({ type: 'error', message: 'Ajoute la photo de ta carte entière (JPG ou PNG).' })
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('matricule', matricule.trim())
      formData.append('password', password)
      formData.append('nom', nom.trim())
      formData.append('prenom', prenom.trim())
      formData.append('qr_text', qrText)
      formData.append('carte', cardFile)

      const response = await fetch(`${API_URL}/auth/signup/etudiant`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json().catch(() => ({}))

      if (response.status === 201) {
        setStatus({ type: 'success', message: 'Compte créé avec succès. Tu peux maintenant te connecter.' })
        setPassword('')
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
    <section className="login-page signup-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Inscription étudiant</h2>

        <div className="field-row">
          <label className="field">
            <span>Nom</span>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoComplete="family-name"
              required
            />
          </label>

          <label className="field">
            <span>Prénom</span>
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              autoComplete="given-name"
              required
            />
          </label>
        </div>

        <label className="field">
          <span>Matricule</span>
          <input
            type="text"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            autoComplete="off"
            required
          />
        </label>

        <label className="field">
          <span>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <div className="camera-box">
          <span className="field-label">Carte étudiant (QR code)</span>
          <div className="camera-frame">
            <div id={QR_ELEMENT_ID} className="qr-reader" />
            {!cameraOn && (
              <p className="camera-placeholder">
                Active la caméra et présente le QR code de ta carte, ou importe une photo.
              </p>
            )}
          </div>

          <button
            type="button"
            className="secondary-btn"
            onClick={cameraOn ? stopCamera : startCamera}
          >
            {cameraOn ? 'Arrêter la caméra' : 'Activer la caméra'}
          </button>

          <label className="secondary-btn file-btn">
            Importer une photo du QR
            <input type="file" accept="image/*" onChange={handleFile} hidden />
          </label>

          {scanError && <p className="camera-error">{scanError}</p>}

          {qrText && (
            <div className="qr-result">
              <span className="field-label">QR détecté :</span>
              <code>{qrText}</code>
            </div>
          )}
        </div>

        <div className="camera-box">
          <span className="field-label">Photo de la carte entière (JPG ou PNG)</span>
          <label className="secondary-btn file-btn">
            {cardFile ? cardFile.name : 'Choisir la photo de la carte'}
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setCardFile(e.target.files[0] || null)}
              hidden
            />
          </label>
        </div>

        <button type="submit" className="primary-btn" disabled={submitting}>
          {submitting ? 'Création en cours…' : 'Créer mon compte'}
        </button>

        {status.message && (
          <p className={status.type === 'success' ? 'status-success' : 'status-error'}>
            {status.message}
          </p>
        )}

        <button type="button" className="link-btn" onClick={onLogin}>J’ai déjà un compte</button>
        <button type="button" className="link-btn" onClick={onBack}>Retour à l’accueil</button>
      </form>
    </section>
  )
}
