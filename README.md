# starfox.js

<p align="center">
  <img src="assets/logo.png" alt="starfox.js logo" width="320">
</p>

<p align="center">
  <a href="https://github.com/trstnjmn/starfox.js">github.com/trstnjmn/starfox.js</a>
</p>

A small browser-based arcade game inspired by Star Fox, built with [PixiJS](https://pixijs.com/).

**In short:** fly the Arwing with mouse or keyboard, fire with the left mouse button or space bar, dodge the enemies, and collect power-ups.

<p align="center">
  <a href="https://starfox-js.vercel.app" target="_blank">Demo</a>
</p>

---

## Features

- PixiJS rendering via CDN (`index.html`), full-window canvas that fills the whole viewport.
- Start screen to pick a control scheme (mouse or keyboard); can also be changed from the pause menu. The choice is stored in `localStorage`.
- 5 difficulty levels (Very Easy … Extreme) selectable with chevron arrows (start and pause menu). The level controls the spawn rate and the maximum number of collectible lives. Default = level 4 (Hard). Stored in `localStorage` (`starfox_difficulty`).
- Mouse **and** keyboard controls (arrow keys or WASD, space bar to fire).
- The Arwing tilts left/right while flying.
- Enemy spawns that get denser as the difficulty rises.
- Enemy behavior: `ship1`/`ship2` fly sideways and shoot, `rock` rotates and varies in size, `satellite` flies in an orbit, `bork` takes two hits and explodes on the second one with a blast radius.
- Hits on `ship1`/`ship2`/`satellite`: they switch to their damage sprite and tumble downwards (briefly without a hitbox, then collidable again).
- Health/lives system (3 lives) with brief invulnerability after a hit; the Arwing shows the matching damage sprites (`Arwing_damage_1/2.png`), `bork` shows `bork_damaged.png` after the first hit.
- Retro pixel-art power-ups (blocky tiles with a symbol): Rapid Fire (R), Spread Shot (S), Shield (D), and a rare 1UP (cross) for an extra life (max. 5).
- `bork` occasionally teleports to a random new position with a pixel-burst effect (briefly invulnerable). After the **first** hit it teleports away immediately (with its damage sprite) and is invulnerable while doing so.
- All gameplay assets (Arwing, enemies, lasers, power-ups, explosions, shield) are scaled up 25% via `ASSET_SCALE = 1.25`.
- `logo.png` as the browser-tab favicon and as a subtle background watermark in the main and pause menu.
- Warning sound (`warning.mp3`) loops as long as only one life is left (stops on pause/game over/mute).
- Scoreboards per difficulty level (5 of them), top 5 each with **name (max. 5 characters)**, score, and **date** (`localStorage` under `starfox_scores`).
- Retro name entry on the game-over screen (HTML overlay in 8-bit style); Enter saves, the name is remembered in `starfox_name`.
- Big **START** button in the main menu; selecting controls or difficulty in the menu plays a `ui_confirm.mp3` confirmation sound.
- Pause menu with "Resume", "Restart", and "Main Menu"; game-over screen with "Restart" and "Main Menu".
- Mute/unmute toggle for sound.
- Scrolling starfield and screen shake on explosions.
- Music menu (`Music` button in the main menu): lists every track from `assets/sounds/music/` ("Musik 1"–"Musik 5", "Menü Musik") for listening, plus "Stop". An Arwing spins like a vinyl record in the center while music is playing.
- Sound effects (e.g. `level_up.mp3` on power-up, `game_over.mp3` on game over) in `assets/sounds`.
- Main menu: `assets/sounds/music/menu_music.mp3` loops in the background.
- On game start (`startGame`/`restartGame`) `game_start.mp3` plays first. The in-game music only starts **with the player's first shot**: a random starting track is picked from `assets/sounds/music/` (`music_1.mp3`–`music_5.mp3`); the tracks then play **back to back** and loop afterwards.
- All music transitions use a crossfade (fade-out/fade-in, `MUSIC_FADE_MS = 900` in `app.js`); playlist transitions are blended shortly before a track ends.
- After starting/resuming the game, the first click/shot does not fire immediately — only after releasing the fire button (prevents an accidental start shot from the start/resume button).

---

## Quick Start

- **Simple (local):** double-click `index.html` or open it in your browser.
- **Recommended** (better media/audio behavior): start a simple HTTP server in the project folder and open `http://localhost:8000`:

```bash
python3 -m http.server 8000
# or (Node.js)
npx http-server -c-1 .
```

## Requirements

- A modern web browser with JavaScript enabled.
- No further installation needed (PixiJS is loaded via CDN).

---

## Controls

- **Start:** on the start screen pick a control scheme ("Mouse" or "Keyboard") and a difficulty, then click **START** — the choice is saved. The "Music" button also lets you listen to a track.
- **Mouse:** move the ship (Arwing) through the game world (mouse mode only).
- **Keyboard:** arrow keys or WASD (keyboard mode only).
- **Fire:** left mouse button or space bar.
- **Pause:** `P` or `Escape`. From the pause menu you can change the control scheme, restart, or return to the main menu. The game also auto-pauses when the window loses focus.
- **Restart after game over:** `R`, click "Restart", or "Main Menu".
- **Sound:** `M` or click "Sound: ON/OFF".

---

## Project Structure

| File | Purpose |
| --- | --- |
| `index.html` | Simple HTML entry point; loads `gameloop.js`, the PixiJS CDN, and `app.js`. |
| `app.js` | Main game logic: sprites, spawn logic, input (mouse/keyboard), lives, score, power-ups, audio control. |
| `gameloop.js` | Timing/helper functions, keyboard input state, and collision helpers. |
| `styles.css` | Fullscreen layout and retro styles (name-entry overlay, etc.). |
| `assets/` | Images, sound effects, and background music (see below). |
| `README.md` | This document. |

---

## Assets Guide

All game assets live under `assets/`. Most images are designed on a 1080×1080 base; damage variants use 500×500 and are normalized to the base display size at runtime via `swapTextureFitted()`.

### Images (`assets/`)

| File | Used as |
| --- | --- |
| `arwing.png` | The player ship (Arwing). Also used as the spinning record label in the music menu. |
| `Arwing_damage_1.png` | Player sprite at 2 lives. |
| `Arwing_damage_2.png` | Player sprite at 1 life. |
| `ship1.png` / `ship1_damaged.png` | Enemy `ship1` (normal / damaged-crash sprite). |
| `ship2.png` / `ship2_damaged.png` | Enemy `ship2` (normal / damaged-crash sprite). |
| `rock.png` | Enemy `rock` (rotating asteroid, no damage sprite). |
| `satellite.png` / `satellite_damaged.png` | Enemy `satellite` (normal / damaged-crash sprite). |
| `bork.png` / `bork_damaged.png` | Enemy `bork` (normal / damaged sprite). |
| `laser.png` | Projectile for the player and enemies. |
| `explosion.png` | Explosion sprite used for hits and blast effects. |
| `logo.png` | Favicon (`index.html`) and background watermark in the main/pause menu. |
| `starFoxJs.png` | Small "Star Fox JS" logo shown in the in-game HUD. |

### Sound effects (`assets/sounds/`)

| File | Trigger |
| --- | --- |
| `game_start.mp3` | Plays once when a round starts (`startGame`/`restartGame`). |
| `game_over.mp3` | Plays on game over. |
| `level_up.mp3` | Plays when a power-up is collected. |
| `ui_confirm.mp3` | Menu selection confirmation sound. |
| `warning.mp3` | Loops while only one life is left. |
| `laser1.mp3`, `laser2.mp3` | Player/enemy laser shots; also the `bork` teleport sound. |
| `explosion1.mp3`, `explosion2.mp3`, `explosion3.mp3` | Randomly picked small explosion sounds. |
| `explosionMaster.mp3` | Big explosion (e.g. `bork`'s final blast). |
| `game-over.mp3` | Unused (legacy; the hyphenated variant is not referenced). |
| `menu_music.mp3` | Unused legacy copy at the sounds root — the music folder copy is used. |

### Music (`assets/sounds/music/`)

| File | Role |
| --- | --- |
| `menu_music.mp3` | Loops in the main menu (and is previewable in the music menu). |
| `music_1.mp3` … `music_5.mp3` | In-game playlist. One is picked at random on the first shot, then they play back to back and loop. |

**Adding more in-game tracks:** drop `music_6.mp3` (etc.) into `assets/sounds/music/` and add the filename to the `GAME_MUSIC_FILES` array near the top of `app.js`. The music menu builds its buttons automatically from that list.

---

## Developer Notes

- PixiJS is loaded from the CDN in `index.html` (version 7.x). For offline or bundled builds you can install Pixi locally.
- **Audio playback:** browsers usually block autoplay, so the game starts music/sounds from a user gesture. On first load it tries to play the menu music immediately; if the browser blocks it, it starts (and unmutes) on the first interaction. The in-game music starts on the first player shot as a randomly chosen playlist from `assets/sounds/music/` and is blended with a crossfade (`updateMusicFades` in the Pixi `ticker`).
- The game update runs on the Pixi `ticker` (requestAnimationFrame); key input is mirrored into `gameInput` in `gameloop.js`.
- Collisions use AABB via `getBounds()` and work independently of the scene hierarchy (layers `starLayer`, `gameLayer`, `uiLayer`).
- Persistent state is kept in `localStorage`: `starfox_control`, `starfox_difficulty`, `starfox_scores`, `starfox_highscore`, `starfox_name`.

---

## Contributing

- Pull requests are welcome. Please include a short description and reproduction steps for your changes.
- Repository: <https://github.com/trstnjmn/starfox.js>
- Please add a license file (`LICENSE`) — there is currently no license notice.
