import { useEffect, useState } from 'react'
import './App.css'
import ParteForm from './components/ParteForm'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type SwState = 'dev' | 'unsupported' | 'registering' | 'activated' | 'error'

const SW_LABEL: Record<SwState, string> = {
  dev: 'Solo build/preview',
  unsupported: 'No soportado',
  registering: 'Registrando…',
  activated: 'Activado',
  error: 'Error',
}

const IS_DEV = import.meta.env.DEV

function App() {
  const [online, setOnline] = useState(navigator.onLine)
  const [swState, setSwState] = useState<SwState>(
    IS_DEV ? 'dev' : 'serviceWorker' in navigator ? 'registering' : 'unsupported',
  )
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const onInstalled = () => setInstalled(true)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)

    if (!IS_DEV && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setSwState('activated'))
        .catch(() => setSwState('error'))
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (navigator.serviceWorker.controller) setSwState('activated')
      })
    }

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installEvt) return
    await installEvt.prompt()
    const choice = await installEvt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setInstallEvt(null)
  }

  return (
    <main className="poc">
      <header className="poc-header">
        <img src="/pwa-192x192.png" alt="MineTrace PoC" width={48} height={48} />
        <div>
          <h1>MineTrace PoC — Offline</h1>
          <p>Validación de PWA offline-first para el técnico de campo</p>
        </div>
      </header>

      <section className="cards">
        <article className={`card ${online ? 'ok' : 'bad'}`}>
          <h2>Conexión</h2>
          <strong>{online ? 'En línea' : 'Sin conexión'}</strong>
          <p>{online ? 'El sync puede operar ahora.' : 'La app sigue funcionando localmente.'}</p>
        </article>

        <article className={`card ${swState === 'activated' ? 'ok' : 'bad'}`}>
          <h2>Service worker</h2>
          <strong>{SW_LABEL[swState]}</strong>
          <p>Es el motor del precache y del background sync.</p>
        </article>

        <article className={`card ${installed ? 'ok' : ''}`}>
          <h2>Instalación</h2>
          {installEvt ? (
            <button type="button" onClick={handleInstall}>
              Instalar app
            </button>
          ) : (
            <strong>{installed ? 'App instalada' : 'No instalada'}</strong>
          )}
          <p>El manifest y los iconos habilitan la instalación.</p>
        </article>
      </section>

      <ParteForm />

      <section className="howto">
        <h2>Cómo probar el modo offline</h2>
        {IS_DEV ? (
          <p className="warn">
            El service worker no se activa en desarrollo (Vite dev sirve los módulos
            dinámicamente y no son precacheables). Para validar offline usa{' '}
            <code>npm run build</code> y luego <code>npm run preview</code>.
          </p>
        ) : (
          <ol>
            <li>Abre la app y espera a que el service worker quede <strong>Activado</strong>.</li>
            <li>
              DevTools → <strong>Application → Service Workers</strong> → marca{' '}
              <strong>Offline</strong> (o activa la pestaña Network → Offline).
            </li>
            <li>Recarga la página: debe cargar completa, sin red.</li>
            <li>Desactiva Offline y vuelve a recargar: sigue funcionando y se actualiza.</li>
          </ol>
        )}
      </section>
    </main>
  )
}

export default App
