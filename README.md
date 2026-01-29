# starfox.js

Ein kleines, browserbasiertes Arcade-Spiel inspiriert von Star Fox, umgesetzt mit PixiJS.

Kurz: Bewege das Raumschiff mit der Maus, feuere mit der linken Maustaste und weiche herabstürzenden Gegnern aus.

Features
- PixiJS-Rendering über CDN (`index.html`).
- Mausgesteuerte Spielerbewegung und Laser-Schüsse.
- Gegner-Spawns mit steigender Schwierigkeit (Spawnrate nimmt mit der Zeit zu).
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
- Maus: Bewege das Schiff (Arwing) durch die Spielwelt.
- Linke Maustaste: Feuer (Laser). Es gibt ein kleines Cooldown zwischen Schüssen.
- Pause: Das Spiel pausiert automatisch, wenn die Maus das Canvas verlässt; beim Wiedereintreten wird es fortgesetzt.
- Tastatur: Es gibt Key-Handler (Pfeiltasten, Leertaste) im `gameloop.js`, die Funktionen sind aber noch unimplementiert.

Projektstruktur (wichtigste Dateien)
- `index.html` – Einfacher HTML-Entrypoint; lädt `gameloop.js`, PixiJS-CDN und `app.js`.
- `app.js` – Hauptspiel-Logik: Erstellen von Sprites, Spawn-Logik, Input (Maus), Score, Soundsteuerung.
- `gameloop.js` – Timing-, Hilfsfunktionen und Kollisionsabfragen (`gameInterval`, `waitForCollision`, `isColliding`).
- `assets/` – Bilder (`arwing.png`, `ship1.png` ..) und Sounds (`assets/sounds/*`).

Entwicklerhinweise
- PixiJS wird aus dem CDN in `index.html` geladen (Version 7.x). Für Offline- oder gebündelte Builds kann man Pixi lokal installieren.
- Audiowiedergabe: Browser blockieren häufig Autoplay; deshalb versucht `app.js` die Hintergrundmusik zu starten und registriert zusätzlich ein `pointerdown`-Event, um die Musik bei der ersten Nutzerinteraktion zu starten.
- Kollisionsprüfung: Die Variable `arwingCollisionBox` ist initial auf `false` gesetzt, onmouseenter des Canvas wird sie auf `true` gesetzt — Collision-Handling ist also an Cursor-Interaktion gebunden. Falls du Kollisionen immer aktiv haben willst, setze `arwingCollisionBox = true` in `app.js`.
- Unbenutzte/Platzhalter-Funktionen: In `gameloop.js` sind `leftKeyPressed`, `rightKeyPressed`, `upKeyPressed`, `downKeyPressed`, `spaceKeyPressed` nur Platzhalter; hier kannst du Keyboard-Support implementieren.
- Performance: Aktuell werden viele setInterval-basierte Timer verwendet. Für bessere Performance könntest du auf `requestAnimationFrame` und Delta-Zeit-Berechnung umstellen.

Verbesserungsvorschläge
- Responsive Canvas: Aktuell wird die Canvas-Größe nicht dynamisch an das Fenster angepasst. Eine Resize-Handler-Implementierung würde die Spielbarkeit auf verschiedenen Auflösungen verbessern.
- Touch-Unterstützung: Für mobile Geräte Touch-Events ergänzen (z.B. Touchmove + Touchstart als Ersatz für Maus).
- UI: Menü, Highscore Speicherung (localStorage), Lives/Health-System, Schwierigkeitsauswahl.
- Tests & Linting: Einfache `package.json` mit Linter/Formatter für Beiträge hinzufügen.

Mitwirken
- Pull Requests sind willkommen. Füge eine kurze Beschreibung und Reproduktionsschritte für Änderungen hinzu.
- Bitte eine Lizenzdatei (`LICENSE`) ergänzen — momentan ist kein Lizenzhinweis enthalten.

Kontakt
- Repo: lokales Projekt (du kannst diesen README-Text anpassen oder erweitern).

Viel Spaß beim Entwickeln und Spielen!
