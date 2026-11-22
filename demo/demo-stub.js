// Demo stub: fakes the Electron bridge + devices so the real renderer runs in a browser.
(function () {
  const params = new URLSearchParams(location.search)
  const mode = params.get('mode') || 'full' // full | empty | toast
  const audioDir = new URL('audio/', location.href).pathname

  const DEMO_QUEUE = [
    { id: 1, name: 'HSM Opening - Lights Up', path: audioDir + 'hsm-opening.wav', pos: 1 },
    { id: 2, name: 'Interval Music (playlist 03)', path: audioDir + 'interval-music.wav', pos: 2 },
    { id: 3, name: 'Finale / Bows', path: audioDir + 'finale-bows.wav', pos: 3 },
    { id: 4, name: 'Interval - house music', path: audioDir + 'interval-music.wav', pos: 4 },
  ]

  window.deck = {
    pathForFile: () => '',
    pickAudioFiles: async () => [],
    listConfigs: async () => (mode === 'empty' ? [] : ['HSM Opening', 'Interval Music', 'Finale - Full Show']),
    saveConfig: async (n) => n,
    loadConfig: async () => null,
    deleteConfig: async () => true,
    autosave: async () => true,
    autosaveLoad: async () =>
      mode === 'empty'
        ? null
        : { queue: DEMO_QUEUE, currentId: 2, autoPlay: true, selected: ['default', 'foh', 'monitor'], nextId: 5 },
  }

  // Fake output devices (Chrome headless has none)
  const fakeDevices = [
    { kind: 'audiooutput', deviceId: 'default', label: '' },
    { kind: 'audiooutput', deviceId: 'foh', label: 'Realtek Speakers (Front of House)' },
    { kind: 'audiooutput', deviceId: 'monitor', label: 'USB Audio Device (Stage Monitor)' },
    { kind: 'audiooutput', deviceId: 'hdmi', label: 'HDMI / DisplayPort (Projector)' },
  ]
  const media = { enumerateDevices: async () => fakeDevices, addEventListener: () => {} }
  try {
    Object.defineProperty(navigator, 'mediaDevices', { value: media, configurable: true })
  } catch (_) {}

  // After the real renderer boots, fake the "playing" look for the screenshot.
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (mode !== 'empty') {
        const bar = document.getElementById('progress-bar')
        const now = document.getElementById('time-now')
        const total = document.getElementById('time-total')
        const sub = document.getElementById('now-sub')
        const btn = document.getElementById('btn-start')
        if (bar) bar.style.width = '42%'
        if (now) now.textContent = '1:24'
        if (total) total.textContent = '3:20'
        if (sub) sub.textContent = 'Playing · ' + (sub.textContent.replace(/^(Playing|Paused) · /, ''))
        if (btn) btn.textContent = '⏸ Pause'
      }
      if (mode === 'toast') {
        const t = document.getElementById('toast')
        if (t) { t.textContent = 'Auto-play next: ON'; t.hidden = false }
      }
    }, 700)
  })
})()
