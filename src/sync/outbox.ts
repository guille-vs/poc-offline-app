import { db, getDeviceKey, type OutboxRow } from '../db/db'
import { encryptJson } from '../db/crypto'
import { DEVICE_ID, type ParteDoc } from '../domain/parte'

// Encola la operación "registrar parte" en el outbox. El payload se cifra
// ANTES de persistir (mismo AES-GCM que la tabla partes): en reposo,
// la cola también es ilegible.
export async function enqueueParte(doc: ParteDoc): Promise<void> {
  const key = await getDeviceKey()
  const row: OutboxRow = {
    id: crypto.randomUUID(),
    parteId: doc.id,
    tipo: 'parte',
    // Idempotencia: la clave es estable por parte. Si el envío se reintenta
    // (fallo de red, cierre de app), el server descarta el duplicado.
    idempotencyKey: `${DEVICE_ID}:${doc.id}`,
    payloadCifrado: await encryptJson(doc, key),
    estado: 'pendiente',
    creadoEn: new Date().toISOString(),
  }
  await db.outbox.add(row)
}

export async function countPendientes(): Promise<number> {
  return db.outbox.where('estado').equals('pendiente').count()
}
