// Genera los iconos PWA de la PoC (192, 512 y maskable) sin dependencias.
// PNG RGBA codificado a mano: firma + IHDR + IDAT (zlib) + IEND + CRC32.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// ---- CRC32 (tabla clásica) ----
const crcTable = new Array(256).fill(0).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) {
    c = (c >>> 8) ^ crcTable[(c ^ b) & 0xff]
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

// ---- Paleta: slate-900 de fondo, sky-400 exterior, blanco interior (broca) ----
const BG = [15, 23, 42] // #0f172a
const OUTER = [56, 189, 248] // #38bdf8
const INNER = [255, 255, 255] // #ffffff

function renderPng(size, maskable) {
  // Rombo (|x|+|y|<=r) como "broca" centrada.
  // Maskable: contenido dentro del safe zone (80% central) para no ser recortado.
  const rOuter = size * (maskable ? 0.3 : 0.4)
  const rInner = rOuter * 0.55
  const c = (size - 1) / 2

  const px = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.abs(x - c) + Math.abs(y - c)
      const col = d <= rInner ? INNER : d <= rOuter ? OUTER : BG
      const i = (y * size + x) * 4
      px[i] = col[0]
      px[i + 1] = col[1]
      px[i + 2] = col[2]
      px[i + 3] = 255
    }
  }

  // Scanlines con byte de filtro 0 por fila (formato PNG)
  const stride = size * 4 + 1
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0
    px.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const targets = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
]

for (const t of targets) {
  const file = join(outDir, t.name)
  writeFileSync(file, renderPng(t.size, t.maskable))
  console.log(`wrote ${file}`)
}
