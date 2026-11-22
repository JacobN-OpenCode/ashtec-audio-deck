# 🐱 AshTec Audio Deck

A tiny Windows app for shows. Queue up audio files, name them, pick which speakers
they come out of, and press **Start**. Skip tracks, flip on auto-play, save your
whole setup as a config. That's it.

Themed from [ashtec.dino.icu](https://ashtec.dino.icu/).

---

## Install (dead simple)

**Option A — install it (recommended)**

1. Go to **[Releases](../../releases)** and download
   `AshTec-Audio-Deck-Setup-1.0.0.exe`
2. Double-click it → **Install** → done.
3. Open **AshTec Audio Deck** from your Desktop or Start Menu.

**Option B — no install at all**

1. Download `AshTec-Audio-Deck-Portable-1.0.0.exe` from
   **[Releases](../../releases)**.
2. Double-click it. That's the whole app, nothing to install.
   (Good for running it off a USB stick on the show laptop.)

> Windows 10/11 (64-bit). If SmartScreen complains, click
> **More info → Run anyway** (it's a free/community app, unsigned).

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

Pushing a tag like `v1.0.1` triggers the GitHub Action that builds the Windows
installers and attaches them to the release automatically.

MIT licensed. Made for the AshTec crew. 🎭
