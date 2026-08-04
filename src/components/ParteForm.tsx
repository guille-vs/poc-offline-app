import { useEffect, useState, type FormEvent } from 'react'
import { localService } from '../services/localService'
import type { Parada, ParteView } from '../domain/parte'

interface FormState {
  fecha: string
  sondaje: string
  plataforma: string
  metros: string
  paradaTipo: string
  paradaMin: string
}

const EMPTY: FormState = {
  fecha: new Date().toISOString().slice(0, 10),
  sondaje: '',
  plataforma: '',
  metros: '',
  paradaTipo: 'standby',
  paradaMin: '',
}

const PARADA_LABEL: Record<string, string> = {
  standby: 'Stand by',
  mantenimiento: 'Mantenimiento',
  fallo: 'Fallo',
  otro: 'Otro',
}

export default function ParteForm() {
  const [partes, setPartes] = useState<ParteView[]>([])
  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState('')

  const refresh = async () => setPartes(await localService.listarPartes())

  useEffect(() => {
    void refresh()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const metros = Number(form.metros)
    if (!form.sondaje.trim() || !form.plataforma.trim()) {
      setError('Completa sondaje y plataforma')
      return
    }
    if (!Number.isFinite(metros) || metros <= 0) {
      setError('Los metros deben ser un número mayor que 0')
      return
    }
    try {
      await localService.registrarParte({
        fecha: form.fecha,
        sondaje: form.sondaje.trim(),
        plataforma: form.plataforma.trim(),
        metros,
        observacion: '',
        paradas:
          form.paradaMin.trim() && Number(form.paradaMin) > 0
            ? [{ tipo: form.paradaTipo as Parada['tipo'], duracionMin: Number(form.paradaMin) }]
            : [],
      })
      setForm(EMPTY)
      await refresh()
    } catch (err) {
      setError(`No se pudo guardar: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <section className="partes">
      <div className="form-card">
        <h2>Registrar parte (offline)</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Fecha
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              required
            />
          </label>
          <label>
            Sondaje
            <input
              type="text"
              placeholder="SD-001"
              value={form.sondaje}
              onChange={(e) => setForm({ ...form, sondaje: e.target.value })}
              required
            />
          </label>
          <label>
            Plataforma
            <input
              type="text"
              placeholder="P-03"
              value={form.plataforma}
              onChange={(e) => setForm({ ...form, plataforma: e.target.value })}
              required
            />
          </label>
          <label>
            Metros
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="120.5"
              value={form.metros}
              onChange={(e) => setForm({ ...form, metros: e.target.value })}
              required
            />
          </label>
          <div className="row">
            <label>
              Parada (opcional)
              <select
                value={form.paradaTipo}
                onChange={(e) => setForm({ ...form, paradaTipo: e.target.value })}
              >
                {Object.entries(PARADA_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minutos
              <input
                type="number"
                min="1"
                placeholder="45"
                value={form.paradaMin}
                onChange={(e) => setForm({ ...form, paradaMin: e.target.value })}
              />
            </label>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit">Guardar parte</button>
        </form>
      </div>

      <div className="list-card">
        <h2>Partes guardados ({partes.length})</h2>
        {partes.length === 0 ? (
          <p className="empty">
            Todavía no hay partes. Crea uno: se guarda cifrado en IndexedDB y sobrevive al recargar.
          </p>
        ) : (
          <ul>
            {partes.map(({ doc, sincronizado, payloadCifrado }) => (
              <li key={doc.id}>
                <div className="list-head">
                  <strong>
                    {doc.sondaje} · {doc.plataforma}
                  </strong>
                  <span className={`badge ${sincronizado ? 'ok' : 'pending'}`}>
                    {sincronizado ? 'Sincronizado' : 'Pendiente de sync'}
                  </span>
                </div>
                <div className="list-meta">
                  {doc.fecha} · {doc.metros} m
                  {doc.paradas.length > 0 && (
                    <>
                      {' · '}
                      {PARADA_LABEL[doc.paradas[0].tipo]} {doc.paradas[0].duracionMin} min
                    </>
                  )}
                </div>
                <code className="payload" title="Payload cifrado AES-GCM (ilegible en IndexedDB)">
                  {payloadCifrado.slice(0, 48)}…
                </code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
