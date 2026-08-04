import { db, getDeviceKey, type ParteRow } from '../db/db'
import { encryptJson, decryptJson } from '../db/crypto'
import type { ParteDoc, ParteView } from '../domain/parte'

// ---- Puerto (contrato) ----
// El servicio depende SOLO de esta interfaz. Cambiar de implementación
// (Dexie → WA-SQLite, o → API remota) es crear otra clase que cumpla
// este contrato y cambiar la instancia exportada al final del archivo.
export interface ParteRepository {
  save(doc: ParteDoc): Promise<void>
  list(): Promise<ParteView[]>
  markSynced(id: string, sincronizado: boolean): Promise<void>
}

// ---- Adaptador concreto: Dexie + cifrado AES-GCM ----
// La forma en claro nunca se persiste; solo la metadata necesaria para
// listar/sincronizar. crypto.ts es reutilizable si se migra de storage.
class DexieParteRepository implements ParteRepository {
  async save(doc: ParteDoc): Promise<void> {
    const key = await getDeviceKey()
    const row: ParteRow = {
      id: doc.id,
      dispositivoId: doc.dispositivoId,
      version: 1,
      sincronizado: false,
      payloadCifrado: await encryptJson(doc, key),
    }
    await db.partes.add(row)
  }

  async list(): Promise<ParteView[]> {
    const key = await getDeviceKey()
    const rows = await db.partes.toArray()
    const views: ParteView[] = []
    for (const row of rows) {
      try {
        views.push({
          doc: await decryptJson<ParteDoc>(row.payloadCifrado, key),
          sincronizado: row.sincronizado,
          payloadCifrado: row.payloadCifrado,
        })
      } catch {
        // Payload corrupto o clave distinta: no romper la lista, saltar el registro.
        console.warn('No se pudo descifrar el parte', row.id)
      }
    }
    return views.sort((a, b) => b.doc.creadoEn.localeCompare(a.doc.creadoEn))
  }

  async markSynced(id: string, sincronizado: boolean): Promise<void> {
    await db.partes.update(id, { sincronizado })
  }
}

// Instancia única. Para "cambiar de implementación": crear otra clase
// que implemente ParteRepository y sustituirla aquí (o inyectarla).
export const localRepository: ParteRepository = new DexieParteRepository()
