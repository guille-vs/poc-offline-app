import { localRepository, type ParteRepository } from '../repositories/localRepository'
import type { ParteDoc, ParteInput, ParteView } from '../domain/parte'

export const DEVICE_ID = 'poc-device-001'

// ---- Servicio de aplicación (casos de uso) ----
// Orquesta la lógica de negocio (construir el doc, asignar id/dispositivo)
// y delega la persistencia en el repositorio inyectado.
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
  }

  listarPartes(): Promise<ParteView[]> {
    return this.repo.list()
  }
}

// Instancia única con el adaptador Dexie por defecto.
export const localService = new LocalService(localRepository)
