// Cifrado AES-GCM con Web Crypto (sin dependencias).
// Formato del payload cifrado: base64( iv(12 bytes) + ciphertext+tag )
// El tag de autenticación lo añade el propio AES-GCM al final del ciphertext.

const KEY_ALG = 'AES-GCM'
const IV_BYTES = 12

export function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function b64ToBuf(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: KEY_ALG, length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function importKey(raw: ArrayBuffer | Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: KEY_ALG }, false, ['encrypt', 'decrypt'])
}

export async function exportKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key)
}

export async function encryptJson<T>(value: T, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const data = new TextEncoder().encode(JSON.stringify(value))
  const cipher = await crypto.subtle.encrypt({ name: KEY_ALG, iv }, key, data)

  const combined = new Uint8Array(IV_BYTES + cipher.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(cipher), IV_BYTES)
  return bufToB64(combined.buffer)
}

export async function decryptJson<T>(payloadB64: string, key: CryptoKey): Promise<T> {
  const combined = b64ToBuf(payloadB64)
  const iv = combined.slice(0, IV_BYTES)
  const data = combined.slice(IV_BYTES)
  const plain = await crypto.subtle.decrypt({ name: KEY_ALG, iv }, key, data)
  return JSON.parse(new TextDecoder().decode(plain)) as T
}
