// Wraps the resized PNGs into a single multi-size .ico (PNG-in-ICO, no deps).
const fs = require('fs')
const path = require('path')

const dir = __dirname
const sizes = [16, 32, 48, 64, 256]
const images = sizes.map((s) => ({
  size: s,
  data: fs.readFileSync(path.join(dir, `icon-${s}.png`)),
}))

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(images.length, 4)

const entries = []
let offset = 6 + images.length * 16
for (const img of images) {
  const e = Buffer.alloc(16)
  e.writeUInt8(img.size >= 256 ? 0 : img.size, 0) // width (0 = 256)
  e.writeUInt8(img.size >= 256 ? 0 : img.size, 1) // height
  e.writeUInt8(0, 2) // palette colours
  e.writeUInt8(0, 3) // reserved
  e.writeUInt16LE(1, 4) // colour planes
  e.writeUInt16LE(32, 6) // bits per pixel
  e.writeUInt32LE(img.data.length, 8)
  e.writeUInt32LE(offset, 12)
  offset += img.data.length
  entries.push(e)
}

fs.writeFileSync(path.join(dir, 'icon.ico'), Buffer.concat([header, ...entries, ...images.map((i) => i.data)]))
console.log('wrote icon.ico', fs.statSync(path.join(dir, 'icon.ico')).size, 'bytes')
