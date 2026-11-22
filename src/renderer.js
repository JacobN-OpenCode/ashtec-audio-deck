// AshTec Audio Deck - renderer (queue, playback, speakers, configs).
'use strict'

const $ = (id) => document.getElementById(id)

const state = {
  queue: [],        // {id, name, path, pos}
  currentId: null,
  autoPlay: false,
  playing: false,
  devices: [],      // [{deviceId, label}]
  selected: [],     // deviceIds
}

let nextId = 1
let audios = []     // one <audio> per selected speaker; audios[0] is the master
let rafId = null
let toastTimer = null

// ---------- helpers ----------
function toast(msg) {
  const el = $('toast')
  el.textContent = msg
  el.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { el.hidden = true }, 2200)
}

function fileUrl(p) {
  // Windows path -> file:/// URL (encode each segment, keep drive letter)
  let norm = p.replace(/\\/g, '/')
  if (!norm.startsWith('/')) norm = '/' + norm
  return 'file://' + norm.split('/').map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg))).join('/')
}

function baseName(p) {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1].replace(/\.[^.]+$/, '')
}

function sortedQueue() {
  return [...state.queue].sort((a, b) => a.pos - b.pos || a.id - b.id)
}

function currentTrack() {
  return state.queue.find((t) => t.id === state.currentId) || null
}

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function autosave() {
  window.deck.autosave({
    queue: state.queue,
    currentId: state.currentId,
    autoPlay: state.autoPlay,
    selected: state.selected,
    nextId,
  })
}

// ---------- audio engine ----------
// One <audio> per ticked speaker, kept in lockstep by a rAF drift corrector.
function master() { return audios[0] || null }

function stopAll() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = null
  for (const a of audios) {
    a.pause()
    a.removeAttribute('src')
    a.load()
  }
}

async function buildAudios(keepTime) {
  const prevT = keepTime && master() ? master().currentTime : 0
  const wasPlaying = state.playing
  stopAll()
  audios = state.selected.map(() => {
    const a = new Audio()
    a.preload = 'auto'
    return a
  })
  // Set output devices (master first; others follow).
  for (let i = 0; i < audios.length; i++) {
    const id = state.selected[i]
    if (id && id !== 'default' && typeof audios[i].setSinkId === 'function') {
      try { await audios[i].setSinkId(id) } catch (_) { /* device may have vanished */ }
    }
  }
  const track = currentTrack()
  if (track && audios.length) {
    const url = fileUrl(track.path)
    for (const a of audios) a.src = url
    if (wasPlaying || keepTime) {
      await Promise.all(audios.map((a) => new Promise((res) => {
        a.addEventListener('loadedmetadata', () => { a.currentTime = prevT; res() }, { once: true })
        a.addEventListener('error', res, { once: true })
      })))
      if (wasPlaying) await playAll()
    }
  }
  bindMasterEvents()
}

function bindMasterEvents() {
  const m = master()
  if (!m) return
  m.onended = () => {
    if (state.autoPlay) nextTrack(true)
    else { state.playing = false; renderDeck(); stopRaf(); }
  }
  m.onerror = () => toast('Could not play that file')
}

async function playAll() {
  const results = await Promise.all(audios.map((a) => a.play().catch(() => null)))
  state.playing = results[0] !== null
  if (state.playing) startRaf()
  renderDeck()
}

function pauseAll() {
  for (const a of audios) a.pause()
  state.playing = false
  stopRaf()
  renderDeck()
}

function startRaf() {
  stopRaf()
  const tick = () => {
    const m = master()
    if (m && state.playing) {
      // keep every slave in step with the master
      for (let i = 1; i < audios.length; i++) {
        const a = audios[i]
        if (Math.abs(a.currentTime - m.currentTime) > 0.25) {
          try { a.currentTime = m.currentTime } catch (_) {}
        }
        if (a.paused && !m.paused) a.play().catch(() => {})
      }
      renderProgress()
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}
function stopRaf() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

async function startTrack(id, autoplay) {
  state.currentId = id
  await buildAudios(false)
  renderQueue()
  renderDeck()
  if (autoplay) await playAll()
  autosave()
}

async function toggleStart() {
  if (!state.queue.length) { toast('Add some audio first'); return }
  if (state.playing) { pauseAll(); return }
  if (!currentTrack()) {
    const first = sortedQueue()[0]
    if (first) await startTrack(first.id, true)
    return
  }
  if (!master() || !master().src) await buildAudios(false)
  await playAll()
}

async function nextTrack(autoplay) {
  const list = sortedQueue()
  const idx = list.findIndex((t) => t.id === state.currentId)
  const next = list[idx + 1]
  if (!next) {
    state.playing = false
    stopAll()
    renderDeck()
    renderProgress()
    toast('End of queue')
    return
  }
  await startTrack(next.id, autoplay)
}

// ---------- rendering ----------
function renderQueue() {
  const list = sortedQueue()
  const ul = $('queue')
  ul.innerHTML = ''
  $('queue-empty').style.display = list.length ? 'none' : 'block'

  for (const t of list) {
    const li = document.createElement('li')
    li.className = 'row' + (t.id === state.currentId ? ' current' : '')
    li.draggable = true
    li.dataset.id = t.id

    const pos = document.createElement('input')
    pos.className = 'row-pos'
    pos.type = 'number'
    pos.min = '1'
    pos.max = '999'
    pos.value = t.pos
    pos.title = 'Position in queue'
    pos.addEventListener('change', () => {
      t.pos = Math.max(1, Math.min(999, parseInt(pos.value, 10) || 1))
      renderQueue(); autosave()
    })
    pos.addEventListener('click', (e) => e.stopPropagation())

    const main = document.createElement('div')
    main.className = 'row-main'
    const name = document.createElement('input')
    name.className = 'row-name'
    name.value = t.name
    name.title = 'Click to rename'
    name.addEventListener('input', () => { t.name = name.value; autosave() })
    name.addEventListener('click', (e) => e.stopPropagation())
    const path = document.createElement('div')
    path.className = 'row-path'
    path.textContent = t.path
    path.title = t.path
    main.append(name, path)

    const actions = document.createElement('div')
    actions.className = 'row-actions'
    const play = document.createElement('button')
    play.className = 'btn btn-mini btn-amber'
    play.textContent = '▶'
    play.title = 'Play from here'
    play.addEventListener('click', (e) => { e.stopPropagation(); startTrack(t.id, true) })
    const del = document.createElement('button')
    del.className = 'btn btn-mini danger'
    del.textContent = '✕'
    del.title = 'Remove'
    del.addEventListener('click', (e) => {
      e.stopPropagation()
      state.queue = state.queue.filter((x) => x.id !== t.id)
      if (state.currentId === t.id) { state.currentId = null; stopAll(); state.playing = false }
      renderQueue(); renderDeck(); autosave()
    })
    actions.append(play, del)

    // click row (not its inputs) to load it without autoplay
    li.addEventListener('click', () => startTrack(t.id, false))

    // drag to reorder (rewrites positions in visible order)
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(t.id))
      li.classList.add('dragging')
    })
    li.addEventListener('dragend', () => li.classList.remove('dragging'))
    li.addEventListener('dragover', (e) => e.preventDefault())
    li.addEventListener('drop', (e) => {
      e.preventDefault()
      const draggedId = parseInt(e.dataTransfer.getData('text/plain'), 10)
      if (!draggedId || draggedId === t.id) return
      const order = sortedQueue()
      const from = order.findIndex((x) => x.id === draggedId)
      const to = order.findIndex((x) => x.id === t.id)
      const [moved] = order.splice(from, 1)
      order.splice(to, 0, moved)
      order.forEach((x, i) => { x.pos = i + 1 })
      renderQueue(); autosave()
    })

    li.append(pos, main, actions)
    ul.append(li)
  }
}

function renderDeck() {
  const t = currentTrack()
  $('now-title').textContent = t ? t.name : 'Nothing loaded'
  $('now-sub').textContent = t
    ? (state.playing ? 'Playing' : 'Paused') + ' · ' + t.path
    : 'Add files and press Start';
  $('btn-start').textContent = state.playing ? '⏸ Pause' : '▶ Start';
  $('btn-skip').disabled = !state.queue.length;
  const auto = $('autoplay')
  auto.checked = state.autoPlay
  auto.closest('.autoplay').classList.toggle('on', state.autoPlay)
  renderProgress()
}

function renderProgress() {
  const m = master()
  const pct = m && m.duration ? (m.currentTime / m.duration) * 100 : 0
  $('progress-bar').style.width = pct + '%'
  $('time-now').textContent = fmtTime(m ? m.currentTime : 0)
  $('time-total').textContent = fmtTime(m && isFinite(m.duration) ? m.duration : 0)
}

async function refreshDevices() {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices()
    state.devices = devs.filter((d) => d.kind === 'audiooutput')
  } catch (_) {
    state.devices = []
  }
  // Default selection: keep existing, else default device.
  const ids = state.devices.map((d) => d.deviceId)
  state.selected = state.selected.filter((id) => ids.includes(id))
  if (!state.selected.length) state.selected = ids.includes('default') ? ['default'] : ids.slice(0, 1)
  renderSpeakers()
}

function renderSpeakers() {
  const box = $('speakers')
  box.innerHTML = ''
  if (!state.devices.length) {
    box.innerHTML = '<div class="empty-hint">No output devices found.</div>'
    return
  }
  for (const d of state.devices) {
    const label = document.createElement('label')
    label.className = 'speaker'
    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = state.selected.includes(d.deviceId)
    cb.addEventListener('change', async () => {
      if (cb.checked) state.selected.push(d.deviceId)
      else state.selected = state.selected.filter((x) => x !== d.deviceId)
      if (!state.selected.length) { state.selected = [d.deviceId]; cb.checked = true; toast('Keep at least one speaker'); return }
      await buildAudios(true)   // apply live, keep position
      autosave()
    })
    const txt = document.createElement('span')
    const isDefault = d.deviceId === 'default'
    txt.textContent = isDefault ? 'Default output' : (d.label || 'Speaker ' + d.deviceId.slice(0, 6))
    const sub = document.createElement('span')
    sub.className = 'dev-sub'
    sub.textContent = isDefault ? ' (whatever Windows is set to)' : ''
    txt.append(sub)
    label.append(cb, txt)
    box.append(label)
  }
}

// ---------- configs ----------
async function refreshConfigs() {
  const names = await window.deck.listConfigs()
  const ul = $('configs')
  ul.innerHTML = ''
  if (!names.length) {
    const li = document.createElement('li')
    li.className = 'none'
    li.textContent = 'No saved configs yet.'
    ul.append(li)
    return
  }
  for (const n of names) {
    const li = document.createElement('li')
    const span = document.createElement('span')
    span.textContent = n
    const actions = document.createElement('span')
    actions.className = 'cfg-actions'
    const load = document.createElement('button')
    load.className = 'btn btn-mini btn-amber'
    load.textContent = 'Load'
    load.addEventListener('click', async () => {
      const data = await window.deck.loadConfig(n)
      if (!data) { toast('Could not load that config'); return }
      await applyConfig(data)
      toast(`Loaded "${n}"`)
    })
    const del = document.createElement('button')
    del.className = 'btn btn-mini danger'
    del.textContent = 'Delete'
    del.addEventListener('click', async () => {
      await window.deck.deleteConfig(n)
      refreshConfigs()
      toast(`Deleted "${n}"`)
    })
    actions.append(load, del)
    li.append(span, actions)
    ul.append(li)
  }
}

async function applyConfig(data) {
  stopAll()
  state.playing = false
  state.queue = Array.isArray(data.queue) ? data.queue : []
  state.queue.forEach((t) => { t.id = nextId++ })
  state.currentId = null
  state.autoPlay = !!data.autoPlay
  state.selected = Array.isArray(data.selected) ? data.selected : []
  await refreshDevices()
  await buildAudios(false)
  renderQueue(); renderDeck()
  autosave()
}

// ---------- file adding ----------
async function addPaths(paths) {
  const existing = new Set(state.queue.map((t) => t.path))
  let added = 0
  for (const p of paths) {
    if (!p || existing.has(p)) continue
    state.queue.push({ id: nextId++, name: baseName(p), path: p, pos: state.queue.length + 1 })
    existing.add(p)
    added++
  }
  if (added) {
    if (!state.currentId) {
      const first = sortedQueue()[0]
      if (first) state.currentId = first.id
    }
    await buildAudios(false)
    renderQueue(); renderDeck(); autosave()
    toast(`Added ${added} file${added > 1 ? 's' : ''}`)
  } else if (paths.length) {
    toast('Already in the queue')
  }
}

// ---------- wiring ----------
$('add-files').addEventListener('click', async () => {
  const paths = await window.deck.pickAudioFiles()
  addPaths(paths)
})

$('btn-start').addEventListener('click', toggleStart)
$('btn-skip').addEventListener('click', () => nextTrack(state.playing && state.autoPlay ? true : state.playing))
$('autoplay').addEventListener('change', (e) => {
  state.autoPlay = e.target.checked
  renderDeck(); autosave()
  toast(state.autoPlay ? 'Auto-play next: ON' : 'Auto-play next: OFF')
})

$('btn-save').addEventListener('click', async () => {
  const name = $('config-name').value.trim()
  if (!name) { toast('Give the config a name first'); return }
  const saved = await window.deck.saveConfig(name, {
    queue: state.queue, autoPlay: state.autoPlay, selected: state.selected,
  })
  $('config-name').value = ''
  refreshConfigs()
  toast(`Saved "${saved}"`)
})

// drag & drop files from Explorer
;['dragover', 'drop'].forEach((ev) => document.body.addEventListener(ev, (e) => e.preventDefault()))
document.body.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer.files || [])
  const paths = files.map((f) => window.deck.pathForFile(f)).filter(Boolean)
  if (paths.length) addPaths(paths)
})

// ---------- boot ----------
;(async function boot() {
  const saved = await window.deck.autosaveLoad()
  if (saved && Array.isArray(saved.queue)) {
    state.queue = saved.queue
    state.currentId = saved.currentId ?? null
    state.autoPlay = !!saved.autoPlay
    state.selected = Array.isArray(saved.selected) ? saved.selected : []
    nextId = saved.nextId || (Math.max(0, ...state.queue.map((t) => t.id)) + 1)
  }
  await refreshDevices()
  await buildAudios(false)
  renderQueue(); renderDeck(); refreshConfigs()
  // pick up newly plugged-in speakers
  navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
})()
