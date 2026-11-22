// Generates 3 short silent .wav files for the demo screenshots.
const fs = require('fs')
const path = require('path')

function makeWav(file, seconds) {
  const rate = 8000
  const n = rate * seconds
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + n * 2, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)          // PCM
  buf.writeUInt16LE(1, 22)          // mono
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(n * 2, 40)
  // faint sine so it is not pure zero (still effectively silent)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(i / 10) * 40), 44 + i * 2)
  fs.writeFileSync(file, buf)
}

const dir = path.join(__dirname, 'audio')
makeWav(path.join(dir, 'hsm-opening.wav'), 5)
makeVamp = null
makeWav(path.join(dir, 'interval-music.wav'), 6)
makeWav(path.join(dir, 'finale-bows.wav'), 4)
console.log('wavs written')
