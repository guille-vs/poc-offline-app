import Dexie, { type Table } from 'dexie'
import { generateKey, importKey, exportKeyRaw, bufToB64, b64ToBuf } from './crypto'

// Fila persistida: el payload del parte se guarda CIFRADO (AES-GCM).
// Solo la metadata necesaria para listar/sincronizar queda en claro.
export interface ParteRow {
  id: string
  dispositivoId: string
  version: number
  sincronizado: boolean
  payloadCifrado: string // base64(iv + ciphertext)
}

// Clave del dispositivo. En producción se derivaría de una passphrase (PBKDF2)
// o de un keystore del SO; para la PoC se genera y se persiste en su propia tabla.
interface ClaveRow {
  id: string
  material: string // base64(raw key)
}

// Outbox: la cola de operaciones pendientes de sincronizar.
// El payload se guarda CIFRADO (mismo formato que el parte) — solo se
// descifra en memoria al momento de enviar. estado 'procesado' = confirmado
// por el server (o descartado por duplicado de idempotencia).
export interface OutboxRow {
  id: string
  parteId: string
  tipo: string
  idempotencyKey: string
  payloadCifrado: string
  estado: 'pendiente' | 'procesado'
  creadoEn: string
}

class PocDB extends Dexie {
  partes!: Table<ParteRow, string>
  claves!: Table<ClaveRow, string>
  outbox!: Table<OutboxRow, string>

  constructor() {
    super('minetrace-poc')
    this.version(1).stores({
      partes: 'id, dispositivoId, sincronizado',
      claves: 'id',
    })
    this.version(2).stores({
      partes: 'id, dispositivoId, sincronizado',
      claves: 'id',
      outbox: 'id, parteId, estado',
    })
  }
}

export const db = new PocDB()

const KEY_ID = 'device-key'

export async function getDeviceKey(): Promise<CryptoKey> {
  const existing = await db.claves.get(KEY_ID)
  if (existing) return importKey(b64ToBuf(existing.material))
  const key = await generateKey()
  const raw = await exportKeyRaw(key)
  await db.claves.put({ id: KEY_ID, material: bufToB64(raw) })
  return key
}
