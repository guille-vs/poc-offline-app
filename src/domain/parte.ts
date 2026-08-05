// Modelo de dominio del parte — sin dependencias de storage ni de UI.
// Es la "forma en claro" que se cifra al persistir.

export interface Parada {
  tipo: 'standby' | 'mantenimiento' | 'fallo' | 'otro'
  duracionMin: number
  descripcion?: string
}

export interface ParteDoc {
  id: string
  dispositivoId: string
  fecha: string
  sondaje: string
  plataforma: string
  metros: number
  observacion: string
  paradas: Parada[]
  creadoEn: string
}

// Vista que devuelve el repositorio al servicio: el doc + estado de sync.
// payloadCifrado se expone SOLO para la verificación de cifrado de la PoC
// (mostrar el preview ilegible en la UI); no es parte del modelo de negocio.
export interface ParteView {
  doc: ParteDoc
  sincronizado: boolean
  payloadCifrado: string
}

export type ParteInput = Omit<ParteDoc, 'id' | 'dispositivoId' | 'creadoEn'>

// Identidad del dispositivo en la PoC. En Fase 1 real lo asigna el backend
// tras autenticar al técnico y registrar el equipo.
export const DEVICE_ID = 'poc-device-001'
