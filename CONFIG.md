# Konfiguration – `game-config.json`

Referenz für **jeden** Wert in `game-config.json`. Was er bewirkt und wie man ihn einstellt.

## Grundlagen

- Die Datei ist **striktes JSON**: keine Kommentare, keine trailing commas.
- Sie wird beim Start geladen und **über die Built-in-Standardwerte gelegt** (`DEFAULT_CONFIG` in `app.js`). Fehlt ein Wert, gilt der Standard – du musst also nicht alles angeben.
- **Muss über HTTP(S) geladen werden** (z. B. lokaler Server). Bei `file://` kann sie nicht geladen werden → es gelten die Standards.
- **Alle Zeitwerte sind Millisekunden (ms).**
- Änderungen greifen nach einem Neuladen der Seite (F5).

Prüfen, ob die Datei gültig ist:

```powershell
node -e "JSON.parse(require('fs').readFileSync('game-config.json','utf8')); console.log('ok')"
```

---

## `tuning` – Grundwerte des Spielgefühls

| Key | Standard | Bedeutung | Einstellen |
| --- | --- | --- | --- |
| `fireCooldownMs` | `165` | Pause zwischen zwei Schüssen. | **Kleiner = schneller feuern.** `100` = sehr schnell, `250` = gemütlich. |
| `rapidFireCooldownMs` | `85` | Schusspause während Rapid Fire. | Muss **kleiner** als `fireCooldownMs` sein. `50` = Maschinengewehr. |
| `laserSpeed` | `0.75` | Fluggeschwindigkeit der Spieler-Laser (Pixel pro ms). | **Größer = schneller** (schwerer zu treffen). `0.5` = träge, `1.2` = flott. |
| `powerupFirstDelayMs` | `6000` | Zeit bis zum **ersten** Power-up nach Rundenstart. | Kleiner = Power-ups früher. |
| `powerupRespawnMinMs` | `8000` | Kürzeste Zeit zwischen zwei Power-up-Spawns. | Kleiner = mehr Power-ups. |
| `powerupRespawnMaxMs` | `14000` | Längste Zeit zwischen zwei Power-up-Spawns. | Muss ≥ `powerupRespawnMinMs` sein; dazwischen wird zufällig gewählt. |
| `speedRampStepMs` | `1000` | Alle X ms wird das Spiel schneller (höhere Spawn-Rate). | Kleiner = schneller schwerer. |
| `speedRampAmount` | `12` | Wie viel ms pro Schritt von der Spawn-Zeit abgezogen werden. | **Größer = schwerer.** |
| `minSpawnMs` | `220` | Untergrenze der Spawn-Zeit – dichter wird es nicht. | Kleiner = maximale Gegnerdichte höher. |

---

## `difficulties` – Auswahl im Menü

Ein Array. **Reihenfolge = Reihenfolge im Menü.** Einträge dürfen hinzugefügt/entfernt werden; das Menü passt sich automatisch an.

| Key | Bedeutung | Einstellen |
| --- | --- | --- |
| `name` | Anzeigename. | Frei wählbar. |
| `spawnMs` | Startabstand zwischen Gegner-Spawns. | **Kleiner = mehr Gegner = schwerer.** |
| `maxLives` | Maximal mögliche Leben (auch Obergrenze für 1UP). | Größer = verzeihender. |

Beispiel – alles leichter machen:

```json
{ "name": "Chill", "spawnMs": 2000, "maxLives": 10 }
```

---

## `enemies` – Gegnertypen

Der **Schlüssel** (z. B. `"ship1"`) ist die interne ID – nicht umbenennen, wenn du die Standardgegner nutzen willst. Neue IDs sind möglich; sie werden automatisch mitgespawnt.

Gemeinsame Felder:

| Feld | Standard | Bedeutung |
| --- | --- | --- |
| `file` | – | Bilddatei. |
| `damaged` | – | Bild nach dem ersten Treffer (optional). |
| `hp` | – | Trefferpunkte bis zur Zerstörung (`1` = ein Schuss). |
| `score` | – | Punkte beim Abschuss. |
| `shoots` | `false` | `true` → Gegner feuert Laser nach unten. |
| `lateral` | `false` | `true` → bewegt sich seitlich hin und her. |
| `orbit` | `false` | `true` → kreist auf einer Bahn (Satellit). |
| `crash` | `false` | `true` → trudelt nach dem Abschuss **schadlos & halbtransparent** nach unten (keine Hitbox mehr). |
| `blast` | `false` | `true` → erzeugt beim Tod eine Explosionswolke mit Schadensradius. |
| `weight` | – | **Relative** Häufigkeit beim Spawnen. |

Jeder Gegner darf nur die Felder setzen, die er braucht.

| ID | Besonderheit |
| --- | --- |
| `ship1` / `ship2` | `shoots`, `lateral`, `crash` – seitlich fliegend, schießend, trudeln beim Abschuss. |
| `rock` | nur `hp`/`score`/`weight` – rotierender Asteroid, kein Schuss/Trefferbild. |
| `satellite` | `orbit`, `crash` – kreist. |
| `bork` | `hp: 2`, `blast` – zwei Treffer, explodiert mit Radius, teleportiert gelegentlich. |

**`weight` ist relativ:** `ship1` mit `30` erscheint etwa 5× so oft wie `bork` mit `6`. Summe und Verhältnis der Gewichte bestimmen die Häufigkeit. Gewicht `0` = nie spawnen.

---

## `powerups` – Power-up-System

`weights` – **relative** Häufigkeit pro Typ (wie bei Gegnern):

| Typ | Standard | Bedeutung |
| --- | --- | --- |
| `rapid` | `30` | Rapid Fire (schneller feuern). |
| `spread` | `25` | Spread Shot (3-fach-Schuss). |
| `shield` | `20` | Schild (fängt einen Treffer ab). |
| `life` | `12` | 1UP (Extra-Leben, bis `maxLives`). |
| `slow` | `6` | Time-Slow (Gegner verlangsamen). |
| `invuln` | `4` | Invincibility (kurz unverwundbar). |
| `missile` | `3` | Homing Missiles (zielsuchende Raketen). |

`durationsMs` – Wirkdauer der zeitlich begrenzten Effekte (`shield` ist dauerhaft bis zum ersten Treffer):

| Key | Standard |
| --- | --- |
| `rapid` | `8000` |
| `spread` | `8000` |
| `slow` | `5000` |
| `invuln` | `4000` |
| `missile` | `8000` |

Weitere Felder:

| Key | Standard | Bedeutung | Einstellen |
| --- | --- | --- | --- |
| `missileIntervalMs` | `420` | Abstand zwischen Raketenstarts bei aktivem Raketen-Power-up. | Kleiner = mehr Raketen gleichzeitig. |
| `slowFactor` | `0.45` | Zeitfaktor bei Time-Slow (`1` = normal). | Kleiner = stärker (Gegner langsamer). |

---

## `levels` – Sektoren / Missionen

Ein Array in Reihenfolge. `advanceScore` = Punkte, die man erreichen muss, um diesen Sektor zu **betreten**; der Sektor mit `0` ist der Start. Neue Sektoren einfach anhängen mit höherem `advanceScore`.

| Key | Bedeutung | Einstellen |
| --- | --- | --- |
| `id` | Interne ID. | Eindeutig halten. |
| `name` | Anzeigename (HUD + Banner). | Frei wählbar. |
| `advanceScore` | Punkte zum Betreten. | Größer = später erreichbar. |
| `spawnMult` | Multiplikator auf die Spawn-Zeit. | **`<1` = mehr Gegner/schwerer.** |
| `speedMult` | Multiplikator auf Gegnergeschwindigkeit. | **`>1` = schneller.** |
| `starTint` | Farbton des Sternenfelds (`#rrggbb`). | Beliebige Hex-Farbe. |
| `planetColor` | Farbe des Hintergrundplaneten (`#rrggbb`). | Beliebige Hex-Farbe. |

---

## `achievements` – Erfolge

Ein Array aus `{ "id", "name", "desc" }`.

- `id` verknüpft den Erfolg mit der **Freischalt-Logik** in `app.js` im Objekt `ACHIEVEMENT_CHECKS`.
- Nur IDs, die dort existieren, können ausgelöst werden. **Eine neue `id` ohne passenden Eintrag in `ACHIEVEMENT_CHECKS` wird nie freigeschaltet.**
- `name` (auch im Toast) und `desc` (im Erfolge-Menü) sind reiner Text und dürfen frei geändert werden, ohne Einfluss auf die Freischaltung.

Neuen Erfolg hinzufügen:

1. Eintrag hier ergänzen, z. B. `{ "id": "score_2000", "name": "Ueberpilot", "desc": "Erreiche 2000 Punkte" }`
2. In `app.js` in `ACHIEVEMENT_CHECKS` eine Bedingung ergänzen:
   `score_2000: s => s.score >= 2000,`

Ohne Schritt 2 bleibt der Erfolg dauerhaft gesperrt.
