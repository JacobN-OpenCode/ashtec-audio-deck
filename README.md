# 🐱 AshTec Audio Deck

A tiny Windows app for shows. Queue up audio files, name them, pick which speakers
they come out of, and press **Start**. Skip tracks, flip on auto-play, save your
whole setup as a config. That's it.

Themed from [ashtec.dino.icu](https://ashtec.dino.icu/).

---

## Install (dead simple)

**Windows**

1. Go to **[Releases](../../releases)** and download
   **`AshTec-Audio-Deck-1.0.0.exe`**
2. Double-click it. That's it — one file, no installer, nothing else to do.

> Windows 10/11 (64-bit). It runs from wherever you keep it (USB stick fine).
> If SmartScreen complains, click **More info → Run anyway** (unsigned free app).

**macOS**

1. Go to **[Releases](../../releases)** and download
   **`AshTec-Audio-Deck-1.0.0.dmg`**
2. Open it and **drag the app onto Applications**.
3. First time only: **right-click the app → Open → Open** (it's unsigned, so
   macOS asks once).

---

## How to use it

1. **Add audio** — click **＋ Add audio files**, or just drag files in from Explorer.
2. **Name it & place it** — click any name to rename, type a number in the left box
   to set its position in the queue, or drag rows to reorder.
3. **Pick speakers** — tick every output you want (e.g. headphones + hall PA).
   Works live, even mid-song.
4. **▶ Start** — plays the top item. **⏭ Skip** moves to the next one.
   **Auto-play next** (top right) keeps the show running unattended.
5. Click any row to load it without playing.

## Saving configs

Type a name (e.g. *HSM Opening*) → **Save**. Your whole setup (queue, names,
order, speakers, auto-play) is stored as a config you can **Load** or **Delete**
any time — handy for different shows on the same laptop.

Configs live at:

```
%APPDATA%\AshTec Audio Deck\configs
```

Your last session is also autosaved, so reopening the app puts everything back.

---

## Building it yourself

```bash
npm install
npm start        # run in dev
npm run dist     # build the Windows installers into dist/
```

Pushing a tag like `v1.0.1` triggers the GitHub Action that builds the
single-file Windows `.exe` and attaches it to the release automatically.

MIT licensed. Made for the AshTec crew. 🎭
