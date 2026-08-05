import { localRepository, type ParteRepository } from '../repositories/localRepository'
import { enqueueParte } from '../sync/outbox'
import { DEVICE_ID, type ParteDoc, type ParteInput, type ParteView } from '../domain/parte'

// ---- Servicio de aplicación (casos de uso) ----
// Orquesta la lógica de negocio (construir el doc, asignar id/dispositivo,
// encolar la operación de sync) y delega la persistencia en el repositorio.
// NO conoce Dexie ni Web Crypto; depende de la interfaz ParteRepository.
export class LocalService {
  private readonly repo: ParteRepository

  constructor(repo: ParteRepository) {
    this.repo = repo
  }

  async registrarParte(input: ParteInput): Promise<void> {
    const doc: ParteDoc = {
      ...input,
      id: crypto.randomUUID(),
      dispositivoId: DEVICE_ID,
      creadoEn: new Date().toISOString(),
    }
    await this.repo.save(doc)
    // Outbox: si este paso falla, el parte quedó local sin cola — la PoC lo
    // registra y continúa; Fase 1 real reconstruiría la cola al detectar la brecha.
    try {
      await enqueueParte(doc)
    } catch (err) {
      console.warn('No se pudo encolar en el outbox', err)
    }
  }

  listarPartes(): Promise<ParteView[]> {
    return this.repo.list()
  }
}

// Instancia única con el adaptador Dexie por defecto.
export const localService = new LocalService(localRepository)
