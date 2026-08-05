import { enviarPendientes, type ResultadoSync } from '../sync/sender'
import { countPendientes } from '../sync/outbox'

// Servicio de sincronización: expone la operación de envio al UI.
// (El envío real vive en sync/sender.ts; esta capa evita que el componente
// conozca el transporte.)
export const syncService = {
  sincronizar(): Promise<ResultadoSync> {
    return enviarPendientes()
  },
  pendientes(): Promise<number> {
    return countPendientes()
  },
}
