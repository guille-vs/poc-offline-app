import { db, getDeviceKey } from '../db/db'
import { decryptJson } from '../db/crypto'
import { localRepository } from '../repositories/localRepository'
import type { ParteDoc } from '../domain/parte'

// URL del backend de la PoC. En producción apunta al BFF Field detrás de HTTPS.
const SYNC_URL = import.meta.env.VITE_SYNC_URL ?? 'http://localhost:3001/api/sync/batch'

export interface OperacionEnvio {
  opId: string
  idempotencyKey: string
  tipo: string
  version: number
  payload: unknown
}

export interface ResultadoSync {
  enviados: number
  pendientes: number
  error?: string
}

// Lee el outbox, descifra cada payload en memoria y envía el lote al server.
// Por cada "ok" (nuevo o duplicado) marca la operación procesada y pone el
// parte como sincronizado. Ante fallo de red devuelve el error SIN perder la cola.
export async function enviarPendientes(): Promise<ResultadoSync> {
  const key = await getDeviceKey()
  const ops = await db.outbox.where('estado').equals('pendiente').toArray()
  if (ops.length === 0) return { enviados: 0, pendientes: 0 }

  const payloads: OperacionEnvio[] = []
  for (const op of ops) {
    try {
      const doc = await decryptJson<ParteDoc>(op.payloadCifrado, key)
      payloads.push({
        opId: op.id,
        idempotencyKey: op.idempotencyKey,
        tipo: op.tipo,
        version: 1,
        payload: doc,
      })
    } catch {
      console.warn('outbox: no se pudo descifrar la operación', op.id)
    }
  }
  if (payloads.length === 0) return { enviados: 0, pendientes: ops.length }

  let enviados = 0
  let error: string | undefined
  try {
    const res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operaciones: payloads }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { resultados?: { opId: string; estado: string; duplicado?: boolean }[] }

    for (const r of data.resultados ?? []) {
      if (r.estado !== 'ok') continue
      const op = ops.find((o) => o.id === r.opId)
      await db.outbox.update(r.opId, { estado: 'procesado' })
      if (op) {
        await localRepository.markSynced(op.parteId, true)
        if (!r.duplicado) enviados++
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  const pendientes = await countPendientes()
  return { enviados, pendientes, error }
}

async function countPendientes(): Promise<number> {
  return db.outbox.where('estado').equals('pendiente').count()
}
