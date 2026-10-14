# starfox.js

Ein kleines, browserbasiertes Arcade-Spiel inspiriert von Star Fox, umgesetzt mit PixiJS.

Kurz: Steuere das Arwing mit Maus oder Tastatur, feuere mit linker Maustaste bzw. Leertaste, weiche den Gegnern aus und sammle Power-ups.

Features
- PixiJS-Rendering über CDN (`index.html`), Vollbild-Canvas über die ganze Fenstergröße.
- Startbildschirm zur Wahl der Steuerung (Maus oder Tastatur); im Pause-Menü änderbar, Wahl wird in `localStorage` gespeichert.
- Maus- **und** Tastatursteuerung (Pfeiltasten oder WASD, Leertaste zum Feuern).
- Der Arwing neigt sich beim Fliegen nach links/rechts.
- Gegner-Spawns mit steigender Schwierigkeit.
- Gegner-Verhalten: `ship1`/`ship2` fliegen seitlich und feuern, `rock` rotiert und ist unterschiedlich groß, `satellite` fliegt kreisend, `bork` braucht zwei Treffer und explodiert beim zweiten mit Schadensradius.
- Treffer auf `ship1`/`ship2`/`satellite`: Sie wechseln auf ihr Damage-Sprite und stürzen taumelnd nach unten (kurzzeitig ohne Hitbox, danach wieder kollidierbar).
- Health-/Leben-System (3 Leben) mit kurzer Unverwundbarkeit nach einem Treffer; der Arwing zeigt passende Schadens-Sprites (`Arwing_damage_1/2.png`), `bork` nach dem ersten Treffer `bork_damaged.png`.
- Power-ups im Retro-Pixel-Look (blockige Kacheln mit Symbol): Rapid Fire (R), Spread-Shot (S), Schild (D) und ein seltenes 1UP (Kreuz) für ein Extraleben (max. 5).
- `bork` teleportiert sich gelegentlich zufällig an eine neue Position, mit Pixel-Burst-Effekt (kurzzeitig unantastbar). Nach dem **ersten** Treffer teleportiert er sich sofort weg (mit Schadens-Sprite) und ist währenddessen unverwundbar.
- Alle Spiel-Assets (Arwing, Gegner, Laser, Power-ups, Explosionen, Schild) werden über `ASSET_SCALE = 1.25` um 25 % größer dargestellt.
- `logo.png` als Favicon im Browser-Tab und als dezentes Hintergrund-Wasserzeichen im Haupt- und Pause-Menü.
- Warnsound (`warning.mp3`) läuft in Dauerschleife, solange nur noch ein Leben übrig ist (stoppt bei Pause/Game Over/Stumm).
- Scoreboard mit den Top 5 (`localStorage`), Game-Over-Screen und Restart-Button.
- Mute-/Unmute-Toggle für Sound.
- Scrollender Sternenhimmel und Screen-Shake bei Explosionen.
- Soundeffekte & Hintergrundmusik (Assets in `assets/sounds`).

Schnellstart
- Lokal öffnen (einfach): Doppelklicke `index.html` oder öffne sie im Browser.
- Empfohlen (besseres Verhalten bei Medien/Audio): Starte einen einfachen HTTP-Server im Projektordner und öffne dann `http://localhost:8000`:

```bash
python3 -m http.server 8000
# oder (Node.js)
npx http-server -c-1 .
```

Voraussetzungen
- Moderner Webbrowser mit aktiviertem JavaScript.
- Keine weiteren Installationen nötig (PixiJS wird via CDN geladen).

Bedienung / Steuerung
- Start: Auf dem Startbildschirm „Maus" oder „Tastatur" wählen — die Wahl wird gespeichert.
- Maus: Bewege das Schiff (Arwing) durch die Spielwelt (nur im Maus-Modus).
- Tastatur: Pfeiltasten oder WASD (nur im Tastatur-Modus).
- Feuern: Linke Maustaste oder Leertaste.
- Pause: `P` oder `Escape`. Im Pause-Menü kann die Steuerung gewechselt werden. Das Spiel pausiert außerdem automatisch, wenn das Fenster den Fokus verliert.
- Neustart nach Game Over: `R` oder Klick auf „Restart".
- Sound: `M` oder Klick auf „Sound: ON/OFF".

Projektstruktur (wichtigste Dateien)
- `index.html` – Einfacher HTML-Entrypoint; lädt `gameloop.js`, PixiJS-CDN und `app.js`.
- `app.js` – Hauptspiel-Logik: Sprites, Spawn-Logik, Input (Maus/Tastatur), Leben, Score, Power-ups, Soundsteuerung.
- `gameloop.js` – Timing-, Hilfsfunktionen, Keyboard-Input-State und Kollisionsabfragen.
- `assets/` – Bilder (`arwing.png`, `ship1.png`, `ship2.png`, `rock.png`, `satellite.png`, `bork.png`) und Sounds (`assets/sounds/*`).

Entwicklerhinweise
- PixiJS wird aus dem CDN in `index.html` geladen (Version 7.x). Für Offline- oder gebündelte Builds kann man Pixi lokal installieren.
- Audiowiedergabe: Browser blockieren häufig Autoplay; deshalb startet `app.js` die Hintergrundmusik und registriert zusätzlich ein `pointerdown`-Event, um die Musik bei der ersten Nutzerinteraktion zu starten.
- Spiel-Update läuft über den Pixi-`ticker` (requestAnimationFrame), Tasteneingaben werden in `gameloop.js` in `gameInput` gespiegelt.
- Kollisionen nutzen AABB über `getBounds()` und funktionieren unabhängig von der Szenen-Hierarchie (Layer `starLayer`, `gameLayer`, `uiLayer`).

Mitwirken
- Pull Requests sind willkommen. Füge eine kurze Beschreibung und Reproduktionsschritte für Änderungen hinzu.
- Bitte eine Lizenzdatei (`LICENSE`) ergänzen — momentan ist kein Lizenzhinweis enthalten.

Viel Spaß beim Entwickeln und Spielen!
