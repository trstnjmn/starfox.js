const app = new PIXI.Application({
    resizeTo: window,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    backgroundColor: 0x05070d
});

const _gameContainer = document.getElementById('game-container') || document.body;
_gameContainer.appendChild(app.view);

const bgLayer = new PIXI.Container();
const starLayer = new PIXI.Container();
const gameLayer = new PIXI.Container();
const uiLayer = new PIXI.Container();
app.stage.addChild(bgLayer, starLayer, gameLayer, uiLayer);

const MARGIN = 26;
const FALL_FACTOR = 0.06;
const ASSET_SCALE = 1.25;
let worldScale = ASSET_SCALE;
let uiScale = 1;

const isTouchDevice = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);

function computeScales() {
    const w = app.screen.width;
    const h = app.screen.height;
    const base = Math.min(w, h);
    worldScale = ASSET_SCALE * Math.max(0.6, Math.min(1, base / 900));
    uiScale = Math.max(0.68, Math.min(1, Math.min(w / 900, h / 760)));
}

const DEFAULT_CONFIG = {
    tuning: {
        fireCooldownMs: 165,
        rapidFireCooldownMs: 85,
        laserSpeed: 0.75,
        powerupFirstDelayMs: 6000,
        powerupRespawnMinMs: 8000,
        powerupRespawnMaxMs: 14000,
        speedRampStepMs: 1000,
        speedRampAmount: 12,
        minSpawnMs: 220
    },
    difficulties: [
        { name: 'Sehr leicht', spawnMs: 1600, maxLives: 8 },
        { name: 'Leicht', spawnMs: 1400, maxLives: 7 },
        { name: 'Normal', spawnMs: 1200, maxLives: 6 },
        { name: 'Schwer', spawnMs: 1000, maxLives: 5 },
        { name: 'Extrem', spawnMs: 800, maxLives: 4 }
    ],
    enemies: {
        ship1: { file: 'assets/ship1.png', damaged: 'assets/ship1_damaged.png', shoots: true, lateral: true, hp: 1, score: 1, crash: true, weight: 30 },
        ship2: { file: 'assets/ship2.png', damaged: 'assets/ship2_damaged.png', shoots: true, lateral: true, hp: 1, score: 1, crash: true, weight: 30 },
        rock: { file: 'assets/rock.png', hp: 1, score: 1, weight: 20 },
        satellite: { file: 'assets/satellite.png', damaged: 'assets/satellite_damaged.png', hp: 1, score: 1, orbit: true, crash: true, weight: 14 },
        bork: { file: 'assets/bork.png', damaged: 'assets/bork_damaged.png', hp: 2, score: 2, blast: true, weight: 6 }
    },
    powerups: {
        weights: { rapid: 30, spread: 25, shield: 20, life: 12, slow: 6, invuln: 4, missile: 3 },
        durationsMs: { rapid: 8000, spread: 8000, slow: 5000, invuln: 4000, missile: 8000 },
        missileIntervalMs: 420,
        slowFactor: 0.45
    },
    levels: [
        { id: 'orbit', name: 'Orbit', advanceScore: 0, spawnMult: 1.0, speedMult: 1.0, starTint: '#ffffff', planetColor: '#3f6d8c' },
        { id: 'asteroids', name: 'Asteroidenfeld', advanceScore: 20, spawnMult: 0.85, speedMult: 1.05, starTint: '#ffd9b3', planetColor: '#8c5a3f' },
        { id: 'satellites', name: 'Satellitenguertel', advanceScore: 50, spawnMult: 0.75, speedMult: 1.1, starTint: '#bfe3ff', planetColor: '#3f8c6d' },
        { id: 'deepspace', name: 'Tiefraum', advanceScore: 90, spawnMult: 0.65, speedMult: 1.15, starTint: '#d9c2ff', planetColor: '#5a3f8c' }
    ],
    achievements: [
        { id: 'first_blood', name: 'Erster Abschuss', desc: 'Zerstoere den ersten Gegner' },
        { id: 'first_powerup', name: 'Versorgt', desc: 'Sammle dein erstes Power-up' },
        { id: 'score_50', name: 'Punktesammler', desc: 'Erreiche 50 Punkte' },
        { id: 'score_150', name: 'Highscorer', desc: 'Erreiche 150 Punkte' },
        { id: 'score_300', name: 'Punktejaeger', desc: 'Erreiche 300 Punkte' },
        { id: 'score_600', name: 'Elite-Pilot', desc: 'Erreiche 600 Punkte' },
        { id: 'score_1000', name: 'Legende', desc: 'Erreiche 1000 Punkte' },
        { id: 'kills_10', name: 'Zehn Abschuesse', desc: 'Zerstoere 10 Gegner' },
        { id: 'kills_25', name: 'Abschussmaschine', desc: 'Zerstoere 25 Gegner' },
        { id: 'kills_50', name: 'Flottenzerstoerer', desc: 'Zerstoere 50 Gegner' },
        { id: 'kills_100', name: 'Massenvernichtung', desc: 'Zerstoere 100 Gegner' },
        { id: 'bork_5', name: 'Bork-Jaeger', desc: 'Zerstoere 5 Borks' },
        { id: 'bork_15', name: 'Bork-Slayer', desc: 'Zerstoere 15 Borks' },
        { id: 'bork_30', name: 'Bork-Legende', desc: 'Zerstoere 30 Borks' },
        { id: 'combo_5', name: 'Serie', desc: '5 Abschuesse in Folge ohne Treffer' },
        { id: 'combo_10', name: 'Unaufhaltsam', desc: '10 Abschuesse in Folge ohne Treffer' },
        { id: 'combo_20', name: 'Kaum zu stoppen', desc: '20 Abschuesse in Folge ohne Treffer' },
        { id: 'shots_100', name: 'Abzugsfreudig', desc: 'Feuere 100 Schuss ab' },
        { id: 'shots_500', name: 'Dauerfeuer', desc: 'Feuere 500 Schuss ab' },
        { id: 'shots_1000', name: 'Feuerwerk', desc: 'Feuere 1000 Schuss ab' },
        { id: 'powerup_10', name: 'Aufgesammelt', desc: 'Sammle 10 Power-ups' },
        { id: 'powerup_25', name: 'Power-Sammler', desc: 'Sammle 25 Power-ups' },
        { id: 'powerup_50', name: 'Power-Junkie', desc: 'Sammle 50 Power-ups' },
        { id: 'all_types', name: 'Bestandsaufnahme', desc: 'Sammle jeden Power-up-Typ' },
        { id: 'shield_save_1', name: 'Schutzengel', desc: 'Ein Schild faengt einen Treffer ab' },
        { id: 'shield_save_5', name: 'Schild-Profi', desc: 'Schilde fangen 5 Treffer ab' },
        { id: 'missile_10', name: 'Raketenphysik', desc: 'Feuere 10 Raketen ab' },
        { id: 'survive_30_nohit', name: 'Konzentration', desc: '30s ohne getroffen zu werden' },
        { id: 'survive_60_nohit', name: 'Unberuehrt', desc: '60s ohne getroffen zu werden' },
        { id: 'survivor_60', name: 'Ueberlebenskuenstler', desc: 'Ueberlebe 60 Sekunden' },
        { id: 'survivor_180', name: 'Durchhaltevermoegen', desc: 'Ueberlebe 180 Sekunden' },
        { id: 'life1_15', name: 'Letztes Aufgebot', desc: 'Ueberlebe 15s mit nur 1 Leben' },
        { id: 'tough_3', name: 'Dickes Fell', desc: 'Kassiere 3 Treffer und kaempfe weiter' },
        { id: 'sector_2', name: 'Entdecker', desc: 'Erreiche Sektor 2' },
        { id: 'sector_3', name: 'Weltenbummler', desc: 'Erreiche Sektor 3' },
        { id: 'sector_4', name: 'Tiefraum-Pilot', desc: 'Erreiche Sektor 4' },
        { id: 'no_hit_sector', name: 'Perfekter Sektor', desc: 'Schliesse einen Sektor ohne Treffer ab' },
        { id: 'no_hit_sector_3', name: 'Sauberer Flug', desc: '3 Sektoren ohne Treffer abschliessen' },
        { id: 'perfect_5', name: 'Makellos', desc: '5 Sektoren ohne Treffer abschliessen' },
        { id: 'levels_cleared_3', name: 'Sektor-Sammler', desc: 'Schliesse 3 Sektoren ab' }
    ]
};

function isPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
}

function deepMerge(base, override) {
    if (Array.isArray(override)) return override.slice();
    if (!isPlainObject(override)) return override;
    const out = isPlainObject(base) ? Object.assign({}, base) : {};
    for (const key of Object.keys(override)) {
        out[key] = isPlainObject(override[key]) ? deepMerge(base ? base[key] : undefined, override[key]) : override[key];
    }
    return out;
}

let CONFIG = deepMerge({}, DEFAULT_CONFIG);

async function loadConfig() {
    try {
        const res = await fetch('game-config.json', { cache: 'no-cache' });
        if (res.ok) {
            const cfg = await res.json();
            CONFIG = deepMerge(DEFAULT_CONFIG, cfg);
        }
    } catch (e) { }
}

let DIFFICULTIES = CONFIG.difficulties;
let ENEMY_KINDS = Object.keys(CONFIG.enemies);
let ENEMY_DEFS = CONFIG.enemies;

function applyConfig() {
    DIFFICULTIES = CONFIG.difficulties;
    ENEMY_DEFS = CONFIG.enemies;
    ENEMY_KINDS = Object.keys(ENEMY_DEFS);
    difficulty = Math.max(1, Math.min(DIFFICULTIES.length, difficulty));
}

let LEVELS = CONFIG.levels;

let difficulty = 4;
try {
    const d = parseInt(localStorage.getItem('starfox_difficulty') || '4', 10);
    if (d >= 1) difficulty = d;
} catch (e) { }
let maxLives = 5;
const HUD_FONT = { fontFamily: 'courier new', fontSize: 22, fill: 0xffffff, fontWeight: 'bold' };

let gameSpeed = 1000;
let score = 0;
let lives = 3;
let highscore = 0;
try { highscore = parseInt(localStorage.getItem('starfox_highscore') || '0', 10) || 0; } catch (e) { }

let gameOver = false;
let gamePaused = false;
let muted = false;
let showStart = true;

let controlMode = null;
try { controlMode = localStorage.getItem('starfox_control'); } catch (e) { controlMode = null; }
if (isTouchDevice) controlMode = 'mouse';

let savedName = '';
try { savedName = (localStorage.getItem('starfox_name') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); } catch (e) { }

let boards = {};
let awaitingName = false;

let mouseX = app.screen.width / 2;
let mouseY = app.screen.height / 2;
let mousePressed = false;

let arwingInvuln = 0;
let arwingBlinkT = 0;
let rapidFireMs = 0;
let spreadShotMs = 0;
let shieldActive = false;
let slowMs = 0;
let invulnMs = 0;
let missileMs = 0;
let missileCooldown = 0;

let spawnAccum = 0;
let diffAccum = 0;
let fireCooldown = 0;
let fireBlocked = false;
let powerupTimer = 6000;

let currentLevel = 0;
let levelBannerT = 0;

let devLevel = 0;
let devInvincible = false;
let devMenuOpen = false;
let devPrevPaused = false;
let devOpenedFromPause = false;
const DEV_MODE = (typeof location !== 'undefined') && new URLSearchParams(location.search).has('dev');

let unlockedAchv = {};
let achvList = [];

function freshStats() {
    return {
        kills: 0,
        borks: 0,
        powerups: 0,
        timeMs: 0,
        hitSinceLevel: false,
        shots: 0,
        hitsTaken: 0,
        shieldsUsed: 0,
        missilesFired: 0,
        noHitMs: 0,
        bestNoHitMs: 0,
        levelsCleared: 0,
        perfectSectors: 0,
        combo: 0,
        bestCombo: 0,
        life1Ms: 0,
        typesCollected: {}
    };
}
let stats = freshStats();

let shakeTime = 0;
let shakeDur = 1;
let shakeMag = 0;

const shipList = [];
const laserList = [];
const enemyLasers = [];
const powerupList = [];
const missileList = [];
const stars = [];

const gameStartSound = new Audio('assets/sounds/game_start.mp3');
gameStartSound.volume = 0.7;

const MUSIC_DIR = 'assets/sounds/music/';
const GAME_MUSIC_FILES = ['music_1.mp3', 'music_2.mp3', 'music_3.mp3', 'music_4.mp3', 'music_5.mp3'];
const MUSIC_BASE_VOLUME = 0.65;
const MUSIC_FADE_MS = 900;

const menuMusic = new Audio(MUSIC_DIR + 'menu_music.mp3');
menuMusic.loop = true;

const gameMusicTracks = GAME_MUSIC_FILES.map((file, i) => {
    const el = new Audio(MUSIC_DIR + file);
    el.loop = false;
    return { id: 'g' + i, label: 'Musik ' + (i + 1), el, base: MUSIC_BASE_VOLUME, vol: 0, target: 0 };
});

const menuTrack = { id: 'menu', label: 'Menü Musik', el: menuMusic, base: MUSIC_BASE_VOLUME, vol: 0, target: 0 };

const musicTracks = [...gameMusicTracks, menuTrack];

let musicStarted = false;
let musicMenuOpen = false;
let musicPreviewId = null;
let gamePlayIndex = 0;

function trackById(id) {
    return musicTracks.find(t => t.id === id);
}

function fadeInMusic(id) {
    const chosen = trackById(id);
    if (!chosen) return;
    for (const t of musicTracks) t.target = (t === chosen) ? t.base : 0;
    if (chosen.el.paused) {
        chosen.el.volume = chosen.vol;
        chosen.el.play().catch(() => { });
    }
}

function pauseAllMusic() {
    for (const t of musicTracks) {
        t.target = 0;
        t.vol = 0;
        t.el.volume = 0;
        if (!t.el.paused) t.el.pause();
    }
}

function advanceGameMusic() {
    gamePlayIndex = (gamePlayIndex + 1) % gameMusicTracks.length;
    const t = gameMusicTracks[gamePlayIndex];
    t.el.loop = false;
    fadeInMusic(t.id);
}

function updateMusicFades(dt) {
    for (const t of musicTracks) {
        if (t.vol === t.target) continue;
        const step = (t.base / MUSIC_FADE_MS) * dt;
        if (t.vol < t.target) t.vol = Math.min(t.target, t.vol + step);
        else t.vol = Math.max(t.target, t.vol - step);
        t.el.volume = t.vol;
        if (t.target === 0 && t.vol <= 0.002 && !t.el.paused) t.el.pause();
    }
    maybeAdvanceGameMusic();
}

function maybeAdvanceGameMusic() {
    if (!musicStarted || musicMenuOpen || muted || gamePaused || gameOver || showStart) return;
    if (!gameStartSound.ended && gameStartSound.currentTime > 0) return;
    const el = gameMusicTracks[gamePlayIndex].el;
    if (el.paused || !el.duration) return;
    const remaining = (el.duration - el.currentTime) * 1000;
    if (remaining <= MUSIC_FADE_MS) advanceGameMusic();
}

const MUSIC_DISC_SPIN = (Math.PI * 2) / 1800;

function updateMusicDisc(dt) {
    if (!musicMenuOpen) return;
    const t = musicPreviewId ? trackById(musicPreviewId) : null;
    if (t && !t.el.paused && !muted) musicDisc.rotation += MUSIC_DISC_SPIN * dt;
}

function resumeMusic() {
    if (muted || gameOver || gamePaused || !musicStarted || musicMenuOpen) return;
    if (!gameStartSound.ended && gameStartSound.currentTime > 0) {
        gameStartSound.play().catch(() => { });
        return;
    }
    const t = gameMusicTracks[gamePlayIndex];
    t.el.loop = false;
    fadeInMusic(t.id);
}

function startGameMusic() {
    if (musicStarted) return;
    musicStarted = true;
    gamePlayIndex = random(0, gameMusicTracks.length - 1);
    resumeMusic();
}

function startGameAudio() {
    pauseAllMusic();
    musicStarted = false;
    if (muted) return;
    gameStartSound.currentTime = 0;
    gameStartSound.onended = resumeMusic;
    gameStartSound.play().catch(() => { });
}

function maybePlayMenuMusic() {
    if (muted || !showStart || musicMenuOpen) return;
    if (!menuMusicUnlocked) {
        attemptUnlockMenuMusic();
        return;
    }
    fadeInMusic('menu');
}

let menuMusicUnlocked = false;
let lastMenuAttempt = 0;
const MENU_ACTIVATION_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'keydown', 'keyup', 'touchend', 'touchstart'];

function startMenuMusicNow() {
    if (muted || !showStart || musicMenuOpen) return;
    const el = menuTrack.el;
    menuTrack.target = menuTrack.base;
    menuTrack.vol = menuTrack.base;
    el.muted = false;
    el.volume = menuTrack.base;
    el.play().then(() => {
        menuMusicUnlocked = true;
        startMusicHint.visible = false;
        removeMenuUnlockListeners();
    }).catch(() => {
        startMusicHint.visible = true;
        el.muted = true;
        el.volume = 1;
        el.play().catch(() => { });
    });
}

const MENU_UNLOCK_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'keydown', 'keyup', 'touchend', 'touchstart', 'wheel', 'mousemove', 'pointermove'];

function removeMenuUnlockListeners() {
    for (const ev of MENU_UNLOCK_EVENTS) document.removeEventListener(ev, attemptUnlockMenuMusic);
}

function attemptUnlockMenuMusic(e) {
    if (menuMusicUnlocked) {
        removeMenuUnlockListeners();
        return;
    }
    if (muted || !showStart || musicMenuOpen) return;
    const isActivation = e && MENU_ACTIVATION_EVENTS.indexOf(e.type) !== -1;
    const now = performance.now();
    if (!isActivation && now - lastMenuAttempt < 250) return;
    lastMenuAttempt = now;
    const el = menuTrack.el;
    menuTrack.target = menuTrack.base;
    menuTrack.vol = menuTrack.base;
    el.pause();
    el.muted = false;
    el.volume = menuTrack.base;
    el.play().then(() => {
        menuMusicUnlocked = true;
        startMusicHint.visible = false;
        removeMenuUnlockListeners();
    }).catch(() => {
        el.muted = true;
        el.volume = 1;
        el.play().catch(() => { });
    });
}

function playMusicPreview(id) {
    musicPreviewId = id;
    const t = trackById(id);
    if (t && t !== menuTrack) t.el.loop = true;
    if (!muted) fadeInMusic(id);
    updateMusicMenuState();
}

function stopMusicPreview() {
    pauseAllMusic();
    musicPreviewId = null;
    updateMusicMenuState();
}

function resumeMusicPreview() {
    if (muted || !musicPreviewId) return;
    fadeInMusic(musicPreviewId);
}

function resumeAudio() {
    if (muted) return;
    if (musicMenuOpen) {
        resumeMusicPreview();
        return;
    }
    if (showStart) {
        maybePlayMenuMusic();
        return;
    }
    resumeMusic();
}

function playConfirm() {
    playSound('assets/sounds/ui_confirm.mp3', 0.6);
}

const warningSound = new Audio('assets/sounds/warning.mp3');
warningSound.loop = true;
warningSound.volume = 0.8;
let warningActive = false;

function updateWarningSound() {
    const shouldPlay = lives === 1 && !gameOver && !gamePaused && !showStart && !muted;
    if (shouldPlay) {
        if (!warningActive) {
            warningActive = true;
            try { warningSound.currentTime = 0; } catch (e) { }
        }
        if (warningSound.paused) warningSound.play().catch(() => { });
    } else {
        warningActive = false;
        if (!warningSound.paused) warningSound.pause();
    }
}

function playSound(src, volume = 0.6) {
    if (muted) return;
    const a = new Audio(src);
    a.volume = Math.min(1, Math.max(0, volume));
    a.play().catch(() => { });
}

const logo = PIXI.Sprite.from('assets/starFoxJs.png');
logo.anchor.set(0.5);
logo.scale.set(0.12);
logo.alpha = 0.9;
uiLayer.addChild(logo);

const ARWING_TEXTURES = {
    3: PIXI.Texture.from('assets/arwing.png'),
    2: PIXI.Texture.from('assets/Arwing_damage_1.png'),
    1: PIXI.Texture.from('assets/Arwing_damage_2.png')
};
PIXI.Texture.from('assets/bork_damaged.png');
PIXI.Texture.from('assets/ship1_damaged.png');
PIXI.Texture.from('assets/ship2_damaged.png');
PIXI.Texture.from('assets/satellite_damaged.png');

const arwing = PIXI.Sprite.from('assets/arwing.png');
arwing.anchor.set(0.5);
arwing.rotation = Math.PI;
arwing.x = app.screen.width / 2;
arwing.y = app.screen.height * 0.75;
applyArwingScale();
gameLayer.addChild(arwing);

function swapTextureFitted(sprite, tex) {
    if (!tex || sprite.texture === tex) return;
    const target = sprite.texture.width * sprite.scale.x;
    sprite.texture = tex;
    const apply = () => {
        const w = sprite.texture.width;
        if (w && target) sprite.scale.set(target / w);
    };
    if (sprite.texture.baseTexture.valid) apply();
    else sprite.texture.baseTexture.once('loaded', apply);
}

function updateArwingTexture() {
    const tex = ARWING_TEXTURES[Math.max(1, Math.min(3, lives))];
    swapTextureFitted(arwing, tex);
}

function applyArwingScale() {
    const base = arwing.texture.width || 1080;
    arwing.scale.set((1080 * 0.08 * worldScale) / base);
}

const shieldGfx = new PIXI.Graphics();
shieldGfx.lineStyle(2, 0x66ccff, 0.9).beginFill(0x66ccff, 0.15).drawCircle(0, 0, 46 * ASSET_SCALE).endFill();
shieldGfx.visible = false;
gameLayer.addChild(shieldGfx);

const livesText = new PIXI.Text('Lives: 3', HUD_FONT);
livesText.anchor.set(0, 0);
uiLayer.addChild(livesText);

const scoreText = new PIXI.Text('Score: 0', HUD_FONT);
scoreText.anchor.set(1, 0);
uiLayer.addChild(scoreText);

const highscoreText = new PIXI.Text('Best: 0', HUD_FONT);
highscoreText.anchor.set(1, 0);
uiLayer.addChild(highscoreText);

const soundButton = new PIXI.Text('Sound: ON', HUD_FONT);
soundButton.anchor.set(1, 0);
soundButton.eventMode = 'static';
soundButton.cursor = 'pointer';
soundButton.on('pointerdown', toggleMute);
uiLayer.addChild(soundButton);

const levelText = new PIXI.Text('', { fontFamily: 'courier new', fontSize: 18, fill: 0x9ad0ff, fontWeight: 'bold' });
levelText.anchor.set(0.5, 0);
uiLayer.addChild(levelText);

const powerupText = new PIXI.Text('', { fontFamily: 'courier new', fontSize: 18, fill: 0xffdd66, fontWeight: 'bold' });
powerupText.anchor.set(0.5, 0);
uiLayer.addChild(powerupText);

const bgPlanet = new PIXI.Graphics();
(function buildPlanet() {
    bgPlanet.beginFill(0xffffff).drawCircle(0, 0, 200).endFill();
    bgPlanet.beginFill(0x000000, 0.16).drawCircle(-60, -40, 46).endFill();
    bgPlanet.beginFill(0x000000, 0.12).drawCircle(70, 50, 32).endFill();
    bgPlanet.beginFill(0x000000, 0.10).drawCircle(20, 110, 24).endFill();
})();
bgPlanet.alpha = 0.5;
bgLayer.addChild(bgPlanet);

const startContainer = new PIXI.Container();
const startTitle = new PIXI.Text('STAR FOX JS', {
    fontFamily: 'courier new', fontSize: 72, fill: 0xffffff, fontWeight: 'bold'
});
startTitle.anchor.set(0.5);
const startSubtitle = new PIXI.Text('Steuerung wählen', {
    fontFamily: 'courier new', fontSize: 28, fill: 0x66ccff, fontWeight: 'bold'
});
startSubtitle.anchor.set(0.5);
const startMouseBtn = makeButton('Maus', 0xffffff, () => chooseControl('mouse'));
const startKeyBtn = makeButton('Tastatur', 0xffffff, () => chooseControl('keyboard'));
const startButton = makeBigButton('START', 0x66ff99, () => startGame());
const startMusicBtn = makeButton('Musik', 0x66ccff, () => openMusicMenu());
const startAchvBtn = makeButton('Erfolge', 0xffcc66, () => openAchievementsMenu());
const startHint = new PIXI.Text('Tastatur: Pfeiltasten/WASD · Leertaste feuert · Maus: Zeigen + Klick', {
    fontFamily: 'courier new', fontSize: 18, fill: 0xbbbbbb
});
startHint.anchor.set(0.5);
const startScore = new PIXI.Text('', {
    fontFamily: 'courier new', fontSize: 22, fill: 0xffcc00, fontWeight: 'bold', align: 'center', lineHeight: 28
});
startScore.anchor.set(0.5);
const startMusicHint = new PIXI.Text('Klick oder Taste drücken, um die Musik zu starten', {
    fontFamily: 'courier new', fontSize: 20, fill: 0xffe066, fontWeight: 'bold'
});
startMusicHint.anchor.set(0.5);
startMusicHint.visible = false;
startContainer.addChild(startTitle, startSubtitle, startMouseBtn, startKeyBtn, startButton, startMusicBtn, startAchvBtn, startHint, startScore, startMusicHint);
uiLayer.addChild(startContainer);

const musicContainer = new PIXI.Container();
const musicTitle = new PIXI.Text('MUSIK', {
    fontFamily: 'courier new', fontSize: 54, fill: 0xffffff, fontWeight: 'bold'
});
musicTitle.anchor.set(0.5);
const musicSubtitle = new PIXI.Text('Titel anhören', {
    fontFamily: 'courier new', fontSize: 26, fill: 0x66ccff, fontWeight: 'bold'
});
musicSubtitle.anchor.set(0.5);
const musicButtons = musicTracks.map(t => {
    const btn = makeButton(t.label, 0xffffff, () => playMusicPreview(t.id));
    return { id: t.id, btn };
});
const musicStopBtn = makeButton('Stopp', 0xff6666, () => stopMusicPreview());
const musicBackBtn = makeButton('Zurück', 0xffffff, () => closeMusicMenu());
const musicBackHint = new PIXI.Text('Titel läuft in Schleife · Stopp beendet die Wiedergabe', {
    fontFamily: 'courier new', fontSize: 18, fill: 0xbbbbbb
});
musicBackHint.anchor.set(0.5);
musicContainer.addChild(musicTitle, musicSubtitle, musicStopBtn, musicBackBtn, musicBackHint, ...musicButtons.map(e => e.btn));
musicContainer.visible = false;
uiLayer.addChild(musicContainer);

const achvContainer = new PIXI.Container();
const achvTitle = new PIXI.Text('ERFOLGE', {
    fontFamily: 'courier new', fontSize: 54, fill: 0xffffff, fontWeight: 'bold'
});
achvTitle.anchor.set(0.5);
const achvSubtitle = new PIXI.Text('', {
    fontFamily: 'courier new', fontSize: 24, fill: 0xffcc66, fontWeight: 'bold'
});
achvSubtitle.anchor.set(0.5);
const achvBackBtn = makeButton('Zurück', 0xffffff, () => closeAchievementsMenu());
const achvResetBtn = makeButton('Zurücksetzen', 0xff6666, () => onAchvResetClick());
const achvPrevBtn = makeButton('◀', 0x66ccff, () => changeAchvPage(-1));
const achvNextBtn = makeButton('▶', 0x66ccff, () => changeAchvPage(1));
const achvPageLabel = new PIXI.Text('', {
    fontFamily: 'courier new', fontSize: 20, fill: 0xbbbbbb, fontWeight: 'bold'
});
achvPageLabel.anchor.set(0.5);
const achvBackHint = new PIXI.Text('Erfolge werden automatisch gespeichert', {
    fontFamily: 'courier new', fontSize: 18, fill: 0xbbbbbb
});
achvBackHint.anchor.set(0.5);
achvContainer.addChild(achvTitle, achvSubtitle, achvPrevBtn, achvNextBtn, achvPageLabel, achvResetBtn, achvBackBtn, achvBackHint);
achvContainer.visible = false;
uiLayer.addChild(achvContainer);

const startDevBtn = makeButton('DEV', 0x66ff99, () => openDevMenu());
startDevBtn.visible = false;
startContainer.addChild(startDevBtn);

const devContainer = new PIXI.Container();
const devTitle = new PIXI.Text('DEV · LEVELWECHSEL', {
    fontFamily: 'courier new', fontSize: 40, fill: 0x66ff99, fontWeight: 'bold'
});
devTitle.anchor.set(0.5);
const devHint = new PIXI.Text('Taste L schließt dieses Menü', {
    fontFamily: 'courier new', fontSize: 16, fill: 0xbbbbbb
});
devHint.anchor.set(0.5);
let devSectorButtons = [];
let devPowerButtons = [];
const devInvBtn = makeButton('Unverwundbar: AUS', 0xffcc66, () => toggleDevInvincible());
const devClearBtn = makeButton('Gegner löschen', 0xff9999, () => devClearEnemies());
const devCloseBtn = makeButton('Schließen', 0xffffff, () => closeDevMenu());
const devDiffRow = buildDifficultyRow();
devContainer.addChild(devTitle, devHint, devInvBtn, devClearBtn, devCloseBtn, devDiffRow);
devContainer.visible = false;
uiLayer.addChild(devContainer);

function buildDevMenu() {
    devSectorButtons = LEVELS.map((lv, i) => {
        const b = makeButton('SEKTOR ' + (i + 1) + ' · ' + lv.name, 0x66ccff, () => devSelectSector(i));
        b.style.fontSize = 20;
        devContainer.addChild(b);
        return b;
    });
    devPowerButtons = Object.keys(POWERUP_STYLES).map(t => {
        const b = makeButton(POWERUP_LABELS[t] || t, 0xaaaaff, () => { applyPowerup(t); updateHud(); });
        b.style.fontSize = 16;
        devContainer.addChild(b);
        return b;
    });
    updateDevMenu();
}

const POWERUP_LABELS = {
    rapid: 'Rapid', spread: 'Spread', shield: 'Schild', life: '1UP',
    slow: 'Slow', invuln: 'Invuln', missile: 'Rakete'
};

function devSelectSector(i) {
    devLevel = Math.max(0, Math.min(LEVELS.length - 1, i));
    currentLevel = devLevel;
    stats.hitSinceLevel = false;
    applyLevelVisuals();
    updateDevMenu();
    updateStatusHud();
    if (!showStart) showLevelBanner(currentLevel);
    playConfirm();
}

function toggleDevInvincible() {
    devInvincible = !devInvincible;
    updateDevMenu();
    playConfirm();
}

function devClearEnemies() {
    destroyAll(shipList);
    destroyAll(enemyLasers);
    playConfirm();
}

function updateDevMenu() {
    devSectorButtons.forEach((b, i) => {
        b._base = i === currentLevel ? 0x66ff99 : 0x66ccff;
        b.style.fill = b._base;
    });
    devInvBtn.text = 'Unverwundbar: ' + (devInvincible ? 'AN' : 'AUS');
    devInvBtn._base = devInvincible ? 0x66ff99 : 0xffcc66;
    devInvBtn.style.fill = devInvBtn._base;
}

function openDevMenu() {
    if (devMenuOpen) return;
    devMenuOpen = true;
    devPrevPaused = gamePaused;
    devOpenedFromPause = pauseContainer.visible;
    startContainer.visible = false;
    pauseContainer.visible = false;
    musicContainer.visible = false;
    achvContainer.visible = false;
    if (!showStart) gamePaused = true;
    devContainer.visible = true;
    updateDevMenu();
    playConfirm();
    layoutUI();
}

function closeDevMenu() {
    if (!devMenuOpen) return;
    devMenuOpen = false;
    devContainer.visible = false;
    if (showStart) startContainer.visible = true;
    if (!showStart) {
        gamePaused = devPrevPaused;
        pauseContainer.visible = devOpenedFromPause;
    }
    playConfirm();
    layoutUI();
}

function toggleDevMenu() {
    if (devMenuOpen) closeDevMenu();
    else openDevMenu();
}

const pauseContainer = new PIXI.Container();
const pauseTitle = new PIXI.Text('Pause', {
    fontFamily: 'courier new', fontSize: 54, fill: 0xffffff, fontWeight: 'bold'
});
pauseTitle.anchor.set(0.5);
const pauseControlLabel = new PIXI.Text('Steuerung', {
    fontFamily: 'courier new', fontSize: 24, fill: 0x66ccff, fontWeight: 'bold'
});
pauseControlLabel.anchor.set(0.5);
const pauseMouseBtn = makeButton('Maus', 0xffffff, () => chooseControl('mouse'));
const pauseKeyBtn = makeButton('Tastatur', 0xffffff, () => chooseControl('keyboard'));
const pauseResumeBtn = makeButton('Weiter', 0x66ff99, () => setPaused(false));
const pauseRestartBtn = makeButton('Neustart', 0xffcc66, () => restartGame());
const pauseMenuBtn = makeButton('Hauptmenü', 0xff9999, () => goToMainMenu());
const pauseDevBtn = makeButton('DEV', 0x66ff99, () => openDevMenu());
pauseDevBtn.visible = false;
const pauseHint = new PIXI.Text('P / Escape = Weiter', {
    fontFamily: 'courier new', fontSize: 18, fill: 0xbbbbbb
});
pauseHint.anchor.set(0.5);
pauseContainer.addChild(pauseTitle, pauseControlLabel, pauseMouseBtn, pauseKeyBtn, pauseResumeBtn, pauseRestartBtn, pauseMenuBtn, pauseDevBtn, pauseHint);
pauseContainer.visible = false;
uiLayer.addChild(pauseContainer);

if (isTouchDevice) {
    startMouseBtn.text = 'Touch';
    pauseMouseBtn.text = 'Touch';
    startHint.text = 'Ziehen zum Steuern · feuert automatisch';
    pauseHint.text = 'Weiter antippen';
}

const startDiffRow = buildDifficultyRow();
const pauseDiffRow = buildDifficultyRow();
startContainer.addChild(startDiffRow);
pauseContainer.addChild(pauseDiffRow);

const MENU_LOGO_BASE = 1080;

function makeMenuLogoBg() {
    const s = PIXI.Sprite.from('assets/logo.png');
    s.anchor.set(0.5);
    s.alpha = 0.22;
    if (!s.texture.baseTexture.valid) {
        s.texture.baseTexture.once('loaded', () => layoutUI());
    }
    return s;
}
const startLogoBg = makeMenuLogoBg();
const pauseLogoBg = makeMenuLogoBg();
startContainer.addChildAt(startLogoBg, 0);
pauseContainer.addChildAt(pauseLogoBg, 0);

const MUSIC_DISC_BASE = 300;
const musicDisc = new PIXI.Container();
const discGfx = new PIXI.Graphics();
discGfx.beginFill(0x0c0c16, 0.92);
discGfx.lineStyle(6, 0x2a2a3a, 1);
discGfx.drawCircle(0, 0, MUSIC_DISC_BASE / 2);
discGfx.lineStyle(2, 0x33334a, 1);
discGfx.drawCircle(0, 0, MUSIC_DISC_BASE * 0.34);
discGfx.endFill();
const discShip = PIXI.Sprite.from('assets/arwing.png');
discShip.anchor.set(0.5);
discShip.scale.set((MUSIC_DISC_BASE * 0.5) / 1080);
if (!discShip.texture.baseTexture.valid) {
    discShip.texture.baseTexture.once('loaded', () => {
        discShip.scale.set((MUSIC_DISC_BASE * 0.5) / (discShip.texture.width || 1080));
        layoutUI();
    });
}
musicDisc.addChild(discGfx, discShip);
musicDisc.alpha = 0.9;
musicContainer.addChildAt(musicDisc, 0);

const gameOverText = new PIXI.Text('Game Over', {
    fontFamily: 'courier new', fontSize: 82, fill: 0xffffff, fontWeight: 'bold'
});
gameOverText.anchor.set(0.5);

const bestText = new PIXI.Text('Best: 0', {
    fontFamily: 'courier new', fontSize: 32, fill: 0xffcc00, fontWeight: 'bold'
});
bestText.anchor.set(0.5);

const restartButton = new PIXI.Text('Restart', {
    fontFamily: 'courier new', fontSize: 34, fill: 0x66ff99, fontWeight: 'bold'
});
restartButton.anchor.set(0.5);
restartButton.eventMode = 'static';
restartButton.cursor = 'pointer';
restartButton.on('pointerdown', restartGame);
restartButton.on('pointerover', () => restartButton.style.fill = 0xffffff);
restartButton.on('pointerout', () => restartButton.style.fill = 0x66ff99);

const menuButton = new PIXI.Text('Hauptmenü', {
    fontFamily: 'courier new', fontSize: 34, fill: 0xff9999, fontWeight: 'bold'
});
menuButton.anchor.set(0.5);
menuButton.eventMode = 'static';
menuButton.cursor = 'pointer';
menuButton.on('pointerdown', () => goToMainMenu());
menuButton.on('pointerover', () => menuButton.style.fill = 0xffffff);
menuButton.on('pointerout', () => menuButton.style.fill = 0xff9999);

const overScoreText = new PIXI.Text('', {
    fontFamily: 'courier new', fontSize: 20, fill: 0xffffff, align: 'center', lineHeight: 28
});
overScoreText.anchor.set(0.5);

document.addEventListener('mousemove', (e) => {
    const rect = app.view.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (app.screen.width / rect.width);
    mouseY = (e.clientY - rect.top) * (app.screen.height / rect.height);
});

document.addEventListener('mousedown', (e) => { if (e.button === 0) mousePressed = true; });
document.addEventListener('mouseup', (e) => { if (e.button === 0) mousePressed = false; });

let touchDrag = null;

function touchPos(t) {
    const rect = app.view.getBoundingClientRect();
    return {
        x: (t.clientX - rect.left) * (app.screen.width / rect.width),
        y: (t.clientY - rect.top) * (app.screen.height / rect.height)
    };
}

document.addEventListener('touchstart', (e) => {
    if (e.target !== app.view) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const p = touchPos(t);
    touchDrag = { sx: p.x, sy: p.y, ax: arwing.x, ay: arwing.y };
    mouseX = arwing.x;
    mouseY = arwing.y;
    mousePressed = true;
    if (e.cancelable) e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (e.target !== app.view) return;
    const t = e.touches[0];
    if (!t) return;
    const p = touchPos(t);
    if (touchDrag) {
        mouseX = touchDrag.ax + (p.x - touchDrag.sx);
        mouseY = touchDrag.ay + (p.y - touchDrag.sy);
    } else {
        mouseX = p.x;
        mouseY = p.y;
    }
    if (e.cancelable) e.preventDefault();
}, { passive: false });

function endTouch() {
    touchDrag = null;
    mousePressed = false;
}

document.addEventListener('touchend', endTouch, { passive: false });
document.addEventListener('touchcancel', endTouch, { passive: false });

document.addEventListener('keydown', (e) => {
    if (awaitingName) return;
    if (e.key === 'l' || e.key === 'L') { toggleDevMenu(); return; }
    if (devMenuOpen) return;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
    if (e.key === 'm' || e.key === 'M') toggleMute();
    if ((e.key === 'r' || e.key === 'R') && gameOver) restartGame();
});

window.addEventListener('blur', () => { if (!gameOver && !gamePaused && !showStart) setPaused(true); });
window.addEventListener('resize', onResize);

function hits(a, b) {
    const b1 = a.getBounds();
    const b2 = b.getBounds();
    return b1.x < b2.x + b2.width
        && b1.x + b1.width > b2.x
        && b1.y < b2.y + b2.height
        && b1.y + b1.height > b2.y;
}

function destroy(obj, arr) {
    if (arr) {
        const i = arr.indexOf(obj);
        if (i >= 0) arr.splice(i, 1);
    }
    if (obj.parent) obj.parent.removeChild(obj);
    obj.destroy({ children: true });
}

function shake(mag, dur) {
    shakeMag = mag;
    shakeDur = Math.max(1, dur);
    shakeTime = dur;
}

function spawnExplosion(x, y, scale = 0.08) {
    const e = PIXI.Sprite.from('assets/explosion.png');
    e.anchor.set(0.5);
    e.scale.set(scale * worldScale);
    e.x = x;
    e.y = y;
    gameLayer.addChild(e);
    setTimeout(() => {
        if (e.parent) e.parent.removeChild(e);
        e.destroy();
    }, 160);
}

function makeButton(label, color, onClick) {
    const b = new PIXI.Text(label, {
        fontFamily: 'courier new', fontSize: 30, fill: color, fontWeight: 'bold'
    });
    b.anchor.set(0.5);
    b.eventMode = 'static';
    b.cursor = 'pointer';
    b._base = color;
    b.on('pointerover', () => b.style.fill = 0xffffff);
    b.on('pointerout', () => b.style.fill = b._base);
    b.on('pointerdown', onClick);
    return b;
}

function makeBigButton(label, color, onClick) {
    const c = new PIXI.Container();
    const w = 340;
    const h = 82;
    const g = new PIXI.Graphics();
    const t = new PIXI.Text(label, {
        fontFamily: 'courier new', fontSize: 46, fill: color, fontWeight: 'bold', letterSpacing: 6
    });
    t.anchor.set(0.5);

    const paint = (hover) => {
        g.clear();
        g.lineStyle(4, hover ? 0xffffff : color, 1);
        g.beginFill(hover ? 0x14202c : 0x0a0f16, 0.92);
        g.drawRect(-w / 2, -h / 2, w, h);
        g.endFill();
        t.style.fill = hover ? 0xffffff : color;
    };

    c.addChild(g, t);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerover', () => paint(true));
    c.on('pointerout', () => paint(false));
    c.on('pointerdown', onClick);
    paint(false);
    return c;
}

function setButtonState(btn, selected) {
    btn._base = selected ? 0x66ff99 : 0xffffff;
    btn.style.fill = btn._base;
}

function updateControlButtons() {
    setButtonState(startMouseBtn, controlMode === 'mouse');
    setButtonState(startKeyBtn, controlMode === 'keyboard');
    setButtonState(pauseMouseBtn, controlMode === 'mouse');
    setButtonState(pauseKeyBtn, controlMode === 'keyboard');
    pauseControlLabel.text = 'Steuerung: ' + (controlMode === 'keyboard' ? 'Tastatur' : (isTouchDevice ? 'Touch' : 'Maus'));
}

function chooseControl(mode) {
    controlMode = mode;
    try { localStorage.setItem('starfox_control', mode); } catch (e) { }
    updateControlButtons();
    playConfirm();
}

function updateMusicMenuState() {
    for (const entry of musicButtons) {
        const active = musicPreviewId === entry.id;
        entry.btn._base = active ? 0x66ff99 : 0xffffff;
        entry.btn.style.fill = entry.btn._base;
    }
}

function openMusicMenu() {
    musicMenuOpen = true;
    startContainer.visible = false;
    achvContainer.visible = false;
    musicContainer.visible = true;
    musicPreviewId = 'menu';
    if (!muted) fadeInMusic('menu');
    updateMusicMenuState();
    playConfirm();
    layoutUI();
}

function closeMusicMenu() {
    musicPreviewId = null;
    musicMenuOpen = false;
    musicContainer.visible = false;
    achvContainer.visible = false;
    startContainer.visible = true;
    maybePlayMenuMusic();
    updateMusicMenuState();
    playConfirm();
    layoutUI();
}

function currentDifficulty() {
    return DIFFICULTIES[Math.max(1, Math.min(DIFFICULTIES.length, difficulty)) - 1];
}

function buildDifficultyRow() {
    const c = new PIXI.Container();
    const arrowFont = { fontFamily: 'courier new', fontSize: 34, fill: 0xffffff, fontWeight: 'bold' };

    const left = new PIXI.Text('◀', arrowFont);
    left.anchor.set(0.5);
    left.eventMode = 'static';
    left.cursor = 'pointer';
    left.on('pointerover', () => { if (difficulty > 1) left.style.fill = 0x66ff99; });
    left.on('pointerout', () => left.style.fill = 0xffffff);
    left.on('pointerdown', () => changeDifficulty(-1));

    const right = new PIXI.Text('▶', arrowFont);
    right.anchor.set(0.5);
    right.eventMode = 'static';
    right.cursor = 'pointer';
    right.on('pointerover', () => { if (difficulty < DIFFICULTIES.length) right.style.fill = 0x66ff99; });
    right.on('pointerout', () => right.style.fill = 0xffffff);
    right.on('pointerdown', () => changeDifficulty(1));

    const label = new PIXI.Text('', {
        fontFamily: 'courier new', fontSize: 26, fill: 0xffcc00, fontWeight: 'bold'
    });
    label.anchor.set(0.5);

    const desc = new PIXI.Text('', {
        fontFamily: 'courier new', fontSize: 16, fill: 0xbbbbbb
    });
    desc.anchor.set(0.5);

    left.x = -180;
    right.x = 180;
    left.y = 0;
    right.y = 0;
    desc.y = 28;

    c.addChild(left, right, label, desc);
    c._left = left;
    c._right = right;
    c._label = label;
    c._desc = desc;
    return c;
}

function updateDifficultyUI() {
    const d = currentDifficulty();
    for (const row of [startDiffRow, pauseDiffRow, devDiffRow]) {
        row._label.text = 'Stufe ' + difficulty + ' · ' + d.name;
        row._desc.text = 'Spawn: ' + d.spawnMs + ' ms · Max. Leben: ' + d.maxLives;
        row._left.alpha = difficulty > 1 ? 1 : 0.3;
        row._right.alpha = difficulty < DIFFICULTIES.length ? 1 : 0.3;
    }
}

function applyDifficulty() {
    const d = currentDifficulty();
    maxLives = d.maxLives;
    if (lives > maxLives) lives = maxLives;
    gameSpeed = d.spawnMs;
    updateDifficultyUI();
    updateScoreboardTexts();
    updateHud();
}

function changeDifficulty(delta) {
    difficulty = Math.max(1, Math.min(DIFFICULTIES.length, difficulty + delta));
    try { localStorage.setItem('starfox_difficulty', String(difficulty)); } catch (e) { }
    applyDifficulty();
    playConfirm();
}

function loadBoards() {
    try {
        const raw = JSON.parse(localStorage.getItem('starfox_scores') || '{}');
        if (raw && !Array.isArray(raw) && typeof raw === 'object') return raw;
        if (Array.isArray(raw) && raw.length) {
            const legacy = raw.slice(0, 5).map(v => ({ n: '---', s: v, d: '' }));
            return { [difficulty]: legacy };
        }
    } catch (e) { }
    return {};
}

function boardFor(level) {
    const list = boards[level];
    return Array.isArray(list) ? list : [];
}

function todayStr() {
    const dt = new Date();
    const p = n => String(n).padStart(2, '0');
    return p(dt.getDate()) + '.' + p(dt.getMonth() + 1) + '.' + dt.getFullYear();
}

function padName(n) {
    return (n || '---').toString().toUpperCase().slice(0, 5).padEnd(5, ' ');
}

function saveEntry(level, name, value) {
    const list = boardFor(level).slice();
    list.push({ n: (name || 'AAA').toUpperCase().slice(0, 5), s: value, d: todayStr() });
    list.sort((a, b) => b.s - a.s);
    boards[level] = list.slice(0, 5);
    try { localStorage.setItem('starfox_scores', JSON.stringify(boards)); } catch (e) { }
}

function scoreboardText(level) {
    const list = boardFor(level);
    const head = 'SCOREBOARD · STUFE ' + level;
    if (!list.length) return head + '\n– keine Einträge –';
    const rows = list.map((e, i) =>
        (i + 1) + '. ' + padName(e.n) + '  ' + String(e.s).padStart(4, ' ') + '  ' + (e.d || '--.--.----'));
    return head + '\n' + rows.join('\n');
}

function updateScoreboardTexts() {
    startScore.text = scoreboardText(difficulty);
}

const nameEntryEl = document.createElement('div');
nameEntryEl.id = 'name-entry';
const neTitle = document.createElement('div');
neTitle.className = 'ne-title';
neTitle.textContent = 'NEW HIGHSCORE';
const neSub = document.createElement('div');
neSub.className = 'ne-sub';
neSub.textContent = 'NAME EINGEBEN (MAX. 5)';
const nameInput = document.createElement('input');
nameInput.id = 'name-input';
nameInput.maxLength = 5;
nameInput.autocomplete = 'off';
nameInput.spellcheck = false;
const neHint = document.createElement('div');
neHint.className = 'ne-hint';
neHint.textContent = 'ENTER = SPEICHERN';
nameEntryEl.append(neTitle, neSub, nameInput, neHint);
_gameContainer.appendChild(nameEntryEl);

nameInput.addEventListener('input', () => {
    nameInput.value = nameInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
});
nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitName();
    }
});

function showNameEntry() {
    awaitingName = true;
    nameInput.value = savedName;
    nameEntryEl.style.display = 'flex';
    setTimeout(() => { nameInput.focus(); nameInput.select(); }, 30);
}

function hideNameEntry() {
    nameEntryEl.style.display = 'none';
}

function commitName() {
    if (!awaitingName) return;
    awaitingName = false;
    const name = (nameInput.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'AAA';
    savedName = name;
    try { localStorage.setItem('starfox_name', name); } catch (e) { }
    saveEntry(difficulty, name, score);
    hideNameEntry();
}

function submitName() {
    if (!awaitingName) return;
    commitName();
    finishGameOver();
}

function refreshHudVisibility() {
    livesText.visible = !showStart;
    scoreText.visible = !showStart;
    highscoreText.visible = !showStart;
    levelText.visible = !showStart;
    powerupText.visible = !showStart;
    logo.visible = !showStart;
}

function startGame() {
    showStart = false;
    startContainer.visible = false;
    musicContainer.visible = false;
    musicMenuOpen = false;
    musicPreviewId = null;
    gameOver = false;
    gamePaused = false;
    fireBlocked = true;
    applyDifficulty();
    mouseX = arwing.x;
    mouseY = arwing.y;
    startGameAudio();
    refreshHudVisibility();
    layoutUI();
}

function initStars() {
    const count = Math.round((app.screen.width * app.screen.height) / 8000);
    for (let i = 0; i < count; i++) {
        const s = new PIXI.Graphics();
        const size = Math.random() * 1.6 + 0.4;
        s.beginFill(0xffffff).drawCircle(0, 0, size).endFill();
        s.alpha = Math.random() * 0.6 + 0.3;
        s.x = Math.random() * app.screen.width;
        s.y = Math.random() * app.screen.height;
        s._speed = Math.random() * 0.12 + 0.03;
        starLayer.addChild(s);
        stars.push(s);
    }
}

function updateStars(dt) {
    const w = app.screen.width;
    const h = app.screen.height;
    for (const s of stars) {
        s.y += s._speed * dt;
        if (s.y > h + 2) {
            s.y = -2;
            s.x = Math.random() * w;
        }
    }
}

function toggleMute() {
    muted = !muted;
    soundButton.text = 'Sound: ' + (muted ? 'OFF' : 'ON');
    soundButton.style.fill = muted ? 0x888888 : 0xffffff;
    if (muted) {
        pauseAllMusic();
        gameStartSound.pause();
    } else {
        resumeAudio();
    }
}

function setPaused(paused) {
    if (gameOver || showStart) return;
    gamePaused = paused;
    if (paused) {
        pauseAllMusic();
        gameStartSound.pause();
        updateControlButtons();
        pauseContainer.visible = true;
    } else {
        pauseContainer.visible = false;
        fireBlocked = true;
        resumeAudio();
    }
    layoutUI();
}

function togglePause() {
    setPaused(!gamePaused);
}

function moveArwing(dt) {
    let tilt = 0;

    if (controlMode === 'keyboard') {
        let dx = 0;
        let dy = 0;
        if (gameInput.left) dx -= 1;
        if (gameInput.right) dx += 1;
        if (gameInput.up) dy -= 1;
        if (gameInput.down) dy += 1;
        const len = Math.hypot(dx, dy) || 1;
        const speed = 0.55;
        arwing.x += (dx / len) * speed * dt;
        arwing.y += (dy / len) * speed * dt;
        tilt = dx;
    } else {
        const beforeX = arwing.x;
        arwing.x += (mouseX - arwing.x) * 0.16;
        arwing.y += (mouseY - arwing.y) * 0.16;
        tilt = Math.max(-1, Math.min(1, (arwing.x - beforeX) * 0.08));
    }

    arwing.x = Math.max(MARGIN, Math.min(app.screen.width - MARGIN, arwing.x));
    arwing.y = Math.max(MARGIN, Math.min(app.screen.height - MARGIN, arwing.y));

    const targetRotation = Math.PI + tilt * 0.5;
    arwing.rotation += (targetRotation - arwing.rotation) * 0.2;
}

function spawnShip() {
    const weights = {};
    for (const k of ENEMY_KINDS) weights[k] = (ENEMY_DEFS[k].weight || 1);
    const kind = weightedPick(weights);
    const def = ENEMY_DEFS[kind];
    const lvl = LEVELS[currentLevel] || LEVELS[0];
    const speedMult = lvl.speedMult || 1;
    const ship = PIXI.Sprite.from(def.file);
    ship.anchor.set(0.5);
    ship.scale.set(kind === 'rock' ? random(4, 11) * worldScale / 100 : 0.07 * worldScale);
    if (kind === 'rock') ship.spinSpeed = (random(0, 1) ? 1 : -1) * random(5, 20) / 10000;
    ship.x = random(30, Math.max(31, app.screen.width - 30));
    ship.y = -30;
    ship.kind = kind;
    ship.hp = def.hp;
    ship.damagedFile = def.damaged || null;
    ship.crash = !!def.crash;
    ship.crashing = false;
    ship.shoots = !!def.shoots;
    ship.canBlast = !!def.blast;
    ship.scoreValue = def.score;
    ship.vy = random(2, 5) * FALL_FACTOR * speedMult;
    if (def.lateral) {
        ship.vx = (random(0, 1) ? 1 : -1) * random(1, 3) * FALL_FACTOR * speedMult;
        ship.targetVx = ship.vx;
        ship.wanderTimer = random(400, 1400);
    } else {
        ship.vx = 0;
    }
    ship.shootTimer = random(1000, 2600);
    if (kind === 'bork') ship.teleportTimer = random(900, 2000);

    if (def.orbit) {
        const radius = random(50, 120);
        const minC = radius + 30;
        const maxC = Math.max(minC, app.screen.width - radius - 30);
        ship.vy = random(1, 2) * FALL_FACTOR * speedMult;
        ship.orbitRadius = radius;
        ship.centerX = random(minC, maxC);
        ship.orbitAngle = random(0, 628) / 100;
        ship.orbitSpeed = random(15, 30) / 10000 * speedMult;
        ship.x = ship.centerX + Math.cos(ship.orbitAngle) * radius;
        ship.vx = 0;
    }

    gameLayer.addChild(ship);
    shipList.push(ship);
}

function updateShips(dt) {
    if (slowMs > 0) dt *= CONFIG.powerups.slowFactor;
    for (let i = shipList.length - 1; i >= 0; i--) {
        const s = shipList[i];
        if (!s.teleporting) s.y += s.vy * dt;

        if (s.crashing) {
            s.dyingT = (s.dyingT || 0) + dt;
            s.alpha = Math.max(0.3, 1 - s.dyingT / 250);
            s.vy = Math.min(s.vy + 0.0004 * dt, 0.7);
            s.rotation += s.spinSpeed * dt;
            s.wobblePhase += s.wobbleFreq * dt;
            s.x += Math.sin(s.wobblePhase) * s.wobbleAmp * dt;
            if (s.x < 20) s.x = 20;
            if (s.x > app.screen.width - 20) s.x = app.screen.width - 20;
        } else if (s.kind === 'rock') {
            s.rotation += s.spinSpeed * dt;
        } else if (s.kind === 'satellite') {
            s.orbitAngle += s.orbitSpeed * dt;
            s.x = s.centerX + Math.cos(s.orbitAngle) * s.orbitRadius;
        } else if (s.kind === 'ship1' || s.kind === 'ship2') {
            s.wanderTimer -= dt;
            if (s.wanderTimer <= 0) {
                s.targetVx = (random(0, 1) ? 1 : -1) * random(1, 3) * FALL_FACTOR;
                s.wanderTimer = random(600, 1800);
            }
            s.vx += (s.targetVx - s.vx) * Math.min(1, dt * 0.0015);
            s.x += s.vx * dt;
            if (s.x < 30) { s.x = 30; s.vx = Math.abs(s.vx); s.targetVx = Math.abs(s.targetVx); }
            if (s.x > app.screen.width - 30) { s.x = app.screen.width - 30; s.vx = -Math.abs(s.vx); s.targetVx = -Math.abs(s.targetVx); }

            const tiltTarget = Math.max(-1, Math.min(1, s.vx * 3)) * 0.5;
            s.rotation += (tiltTarget - s.rotation) * 0.12;
        } else if (s.kind === 'bork') {
            if (!s.teleporting) {
                s.teleportTimer -= dt;
                if (s.teleportTimer <= 0) {
                    s.teleportTimer = random(1100, 2600);
                    borkTeleport(s);
                }
            }
        } else if (s.vx) {
            s.x += s.vx * dt;
            if (s.x < 30) { s.x = 30; s.vx = Math.abs(s.vx); }
            if (s.x > app.screen.width - 30) { s.x = app.screen.width - 30; s.vx = -Math.abs(s.vx); }
        }

        if (s.damaged) {
            s.blinkT = (s.blinkT || 0) + dt;
            s.tint = Math.floor(s.blinkT / 250) % 2 === 0 ? 0xff4444 : 0xffffff;
        }

        if (s.shoots && s.y > 0 && s.y < app.screen.height - 40) {
            s.shootTimer -= dt;
            if (s.shootTimer <= 0) {
                fireEnemyLaser(s);
                s.shootTimer = random(1200, 2600);
            }
        }

        if (s.y > app.screen.height + 40) {
            destroy(s, shipList);
            continue;
        }

        if (!gameOver && !s.crashing && (s.noHitT || 0) <= 0 && hits(s, arwing)) {
            destroy(s, shipList);
            if (arwingInvuln <= 0) onPlayerHit();
        }
    }
}

function fireEnemyLaser(ship) {
    const l = PIXI.Sprite.from('assets/laser.png');
    l.anchor.set(0.5);
    l.scale.set(0.03 * worldScale);
    l.x = ship.x;
    l.y = ship.y + 22;
    l.vx = 0;
    l.vy = 0.4;
    l.rotation = Math.PI;
    gameLayer.addChild(l);
    enemyLasers.push(l);
    playSound('assets/sounds/laser' + random(1, 2) + '.mp3', 0.25);
}

function updateEnemyLasers(dt) {
    if (slowMs > 0) dt *= CONFIG.powerups.slowFactor;
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        const l = enemyLasers[i];
        l.y += l.vy * dt;
        l.x += l.vx * dt;

        if (l.y > app.screen.height + 30) {
            destroy(l, enemyLasers);
            continue;
        }

        if (!gameOver && hits(l, arwing)) {
            destroy(l, enemyLasers);
            if (arwingInvuln <= 0) onPlayerHit();
        }
    }
}

function fireLaser() {
    startGameMusic();
    stats.shots++;
    playSound('assets/sounds/laser' + random(1, 2) + '.mp3', 0.5);
    const spread = spreadShotMs > 0;
    const angles = spread ? [-0.22, 0, 0.22] : [0];
    const speed = CONFIG.tuning.laserSpeed;

    for (const a of angles) {
        const laser = PIXI.Sprite.from('assets/laser.png');
        laser.anchor.set(0.5);
        laser.scale.set(0.03 * worldScale);
        laser.x = arwing.x + a * 80;
        laser.y = arwing.y - 26;
        laser.vx = Math.sin(a) * speed;
        laser.vy = -Math.cos(a) * speed;
        laser.rotation = Math.atan2(laser.vy, laser.vx) + Math.PI / 2;
        gameLayer.addChild(laser);
        laserList.push(laser);
    }

    if (missileMs > 0 && missileCooldown <= 0) {
        missileCooldown = CONFIG.powerups.missileIntervalMs;
        spawnHomingMissile();
    }
}

function findNearestShip(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const s of shipList) {
        if (s.destroyed || s.teleporting) continue;
        const d = Math.hypot(s.x - x, s.y - y);
        if (d < bestD) { bestD = d; best = s; }
    }
    return best;
}

function spawnHomingMissile() {
    const m = PIXI.Sprite.from('assets/laser.png');
    m.anchor.set(0.5);
    m.scale.set(0.04 * worldScale);
    m.tint = 0xff8844;
    m.x = arwing.x;
    m.y = arwing.y - 30;
    m.speed = 0.6;
    m.vx = 0;
    m.vy = -m.speed;
    m.target = findNearestShip(m.x, m.y);
    gameLayer.addChild(m);
    missileList.push(m);
    stats.missilesFired++;
    playSound('assets/sounds/laser1.mp3', 0.35);
}

function updateMissiles(dt) {
    for (let i = missileList.length - 1; i >= 0; i--) {
        const m = missileList[i];
        if (!m.target || m.target.destroyed || !m.target.parent) m.target = findNearestShip(m.x, m.y);

        const cur = Math.atan2(m.vy, m.vx);
        let na = cur;
        if (m.target) {
            const want = Math.atan2(m.target.y - m.y, m.target.x - m.x);
            let da = want - cur;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            na = cur + Math.max(-0.16, Math.min(0.16, da));
        }
        m.vx = Math.cos(na) * m.speed;
        m.vy = Math.sin(na) * m.speed;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.rotation = na + Math.PI / 2;

        if (m.y < -40 || m.y > app.screen.height + 40 || m.x < -40 || m.x > app.screen.width + 40) {
            destroy(m, missileList);
            continue;
        }

        for (let j = shipList.length - 1; j >= 0; j--) {
            if (shipList[j].crashing) continue;
            if (hits(m, shipList[j])) {
                hitShip(shipList[j]);
                spawnExplosion(m.x, m.y, 0.06);
                destroy(m, missileList);
                break;
            }
        }
    }
}

function handleFiring(dt) {
    if (fireBlocked) {
        if (!mousePressed && !gameInput.fire) fireBlocked = false;
        return;
    }
    fireCooldown -= dt;
    if (!(mousePressed || gameInput.fire) || fireCooldown > 0) return;
    fireCooldown = rapidFireMs > 0 ? CONFIG.tuning.rapidFireCooldownMs : CONFIG.tuning.fireCooldownMs;
    fireLaser();
}

function updateLasers(dt) {
    for (let i = laserList.length - 1; i >= 0; i--) {
        const l = laserList[i];
        l.x += l.vx * dt;
        l.y += l.vy * dt;

        if (l.y < -30 || l.x < -30 || l.x > app.screen.width + 30) {
            destroy(l, laserList);
            continue;
        }

        for (let j = shipList.length - 1; j >= 0; j--) {
            if (shipList[j].crashing) continue;
            if (hits(l, shipList[j])) {
                hitShip(shipList[j]);
                destroy(l, laserList);
                break;
            }
        }
    }
}

function hitShip(ship) {
    if (ship.crashing || ship.teleporting) return;

    if (ship.crash) {
        ship.crashing = true;
        ship.shoots = false;
        ship.dyingT = 0;
        ship.spinSpeed = (random(0, 1) ? 1 : -1) * random(3, 8) / 10000;
        ship.wobbleAmp = random(2, 4) * FALL_FACTOR;
        ship.wobbleFreq = random(2, 5) / 1000;
        ship.wobblePhase = random(0, 628) / 100;
        if (ship.damagedFile) swapTextureFitted(ship, PIXI.Texture.from(ship.damagedFile));
        spawnExplosion(ship.x, ship.y, 0.08);
        playSound('assets/sounds/explosion' + random(1, 3) + '.mp3', 0.5);
        shake(6, 160);
        score += ship.scoreValue || 1;
        updateHud();
        return;
    }

    if (ship.hp > 1) {
        ship.hp--;
        if (ship.damagedFile) swapTextureFitted(ship, PIXI.Texture.from(ship.damagedFile));
        ship.damaged = true;
        ship.blinkT = 0;
        playSound('assets/sounds/explosion1.mp3', 0.4);
        if (ship.kind === 'bork') borkTeleport(ship);
        return;
    }
    onShipKilled(ship);
}

function onShipKilled(ship) {
    const big = !!ship.canBlast;
    spawnExplosion(ship.x, ship.y, big ? 0.14 : 0.08);
    playSound('assets/sounds/explosion' + random(1, 3) + '.mp3', 0.6);
    shake(big ? 12 : 7, big ? 260 : 180);
    const x = ship.x;
    const y = ship.y;
    destroy(ship, shipList);
    if (big && !gameOver) spawnBlast(x, y, 95 * worldScale);
    score += ship.scoreValue || 1;
    stats.kills++;
    if (big) stats.borks++;
    stats.combo++;
    if (stats.combo > stats.bestCombo) stats.bestCombo = stats.combo;
    updateHud();
    checkAchievements();
}

function spawnBlast(x, y, radius) {
    const ring = new PIXI.Graphics();
    ring.lineStyle(3, 0xff6600, 0.9).beginFill(0xff6600, 0.25).drawCircle(0, 0, radius).endFill();
    ring.x = x;
    ring.y = y;
    ring.scale.set(0.2);
    gameLayer.addChild(ring);

    let t = 0;
    const grow = () => {
        t += 0.08;
        ring.scale.set(0.2 + t * 0.8);
        ring.alpha = Math.max(0, 1 - t);
        if (t < 1) requestAnimationFrame(grow);
        else {
            if (ring.parent) ring.parent.removeChild(ring);
            ring.destroy();
        }
    };
    requestAnimationFrame(grow);

    if (!gameOver && Math.hypot(arwing.x - x, arwing.y - y) <= radius && arwingInvuln <= 0) {
        onPlayerHit();
    }
}

function teleportBurst(x, y, color) {
    const g = new PIXI.Graphics();
    g.x = x;
    g.y = y;
    gameLayer.addChild(g);

    const parts = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + random(0, 60) / 100;
        parts.push({ a, d: random(12, 34), s: random(2, 4) });
    }

    const start = performance.now();
    const dur = 360;
    const step = () => {
        const t = Math.min(1, (performance.now() - start) / dur);
        g.clear();
        g.lineStyle(2, color, 1 - t);
        g.drawRect(-10 - t * 34, -10 - t * 34, 20 + t * 68, 20 + t * 68);
        g.beginFill(color, 1 - t);
        for (const p of parts) {
            const dist = p.d * (0.15 + t);
            const px = Math.cos(p.a) * dist;
            const py = Math.sin(p.a) * dist;
            g.drawRect(px - p.s, py - p.s, p.s * 2, p.s * 2);
        }
        g.endFill();
        if (t < 1) requestAnimationFrame(step);
        else {
            if (g.parent) g.parent.removeChild(g);
            g.destroy();
        }
    };
    requestAnimationFrame(step);
}

function borkTeleport(ship) {
    if (ship.teleporting || ship.destroyed) return;
    ship.teleporting = true;
    ship.noHitT = 700;

    const baseScale = ship.scale.x;
    const ox = ship.x;
    const oy = ship.y;
    const nx = random(60, Math.max(61, app.screen.width - 60));
    const ny = random(60, Math.max(61, app.screen.height * 0.55));

    playSound('assets/sounds/laser2.mp3', 0.35);
    teleportBurst(ox, oy, 0x66ccff);

    const dur = 200;
    const start = performance.now();
    const vanish = () => {
        if (ship.destroyed) return;
        const t = Math.min(1, (performance.now() - start) / dur);
        ship.scale.set(baseScale * (1 - t));
        ship.alpha = 1 - t;
        if (t < 1) { requestAnimationFrame(vanish); return; }

        ship.x = nx;
        ship.y = ny;
        teleportBurst(nx, ny, 0xffffff);

        const startIn = performance.now();
        const appear = () => {
            if (ship.destroyed) return;
            const u = Math.min(1, (performance.now() - startIn) / dur);
            ship.scale.set(baseScale * u);
            ship.alpha = u;
            if (u < 1) { requestAnimationFrame(appear); return; }
            ship.scale.set(baseScale);
            ship.alpha = 1;
            ship.teleporting = false;
        };
        requestAnimationFrame(appear);
    };
    requestAnimationFrame(vanish);
}

function powerupPixel() {
    return Math.max(2, Math.round(3 * worldScale));
}
const POWERUP_SYMBOLS = {
    rapid: ['####.', '#...#', '####.', '#..#.', '#...#'],
    spread: ['.####', '#....', '.###.', '....#', '####.'],
    shield: ['####.', '#...#', '#...#', '#...#', '####.'],
    life: ['..#..', '..#..', '#####', '..#..', '..#..'],
    slow: ['#####', '#...#', '.###.', '#...#', '#####'],
    invuln: ['..#..', '.###.', '#####', '.#.#.', '#...#'],
    missile: ['...#.', '..###', '#####', '..###', '...#.']
};

const POWERUP_STYLES = {
    rapid: { color: 0xffcc00 },
    spread: { color: 0x00ccff },
    shield: { color: 0x66ff99 },
    life: { color: 0xff4466 },
    slow: { color: 0xaa66ff },
    invuln: { color: 0x66ffdd },
    missile: { color: 0xff8844 }
};

function weightedPick(weights) {
    const keys = Object.keys(weights);
    let total = 0;
    for (const k of keys) total += (weights[k] || 0);
    if (total <= 0) return keys[0];
    let r = Math.random() * total;
    for (const k of keys) {
        r -= (weights[k] || 0);
        if (r <= 0) return k;
    }
    return keys[keys.length - 1];
}

function mixColor(a, b, t) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

function buildPixelPowerup(color, symbol) {
    const g = new PIXI.Graphics();
    const n = 9;
    const px = powerupPixel();
    const dark = 0x101018;
    const light = mixColor(color, 0xffffff, 0.55);
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            if ((x === 0 || x === n - 1) && (y === 0 || y === n - 1)) continue;
            let col;
            if (x === 0 || y === 0 || x === n - 1 || y === n - 1) col = dark;
            else if (x === 1 || y === 1) col = light;
            else col = color;
            g.beginFill(col).drawRect(x * px, y * px, px, px).endFill();
        }
    }
    for (let y = 0; y < symbol.length; y++) {
        for (let x = 0; x < symbol[y].length; x++) {
            if (symbol[y][x] === '#') {
                g.beginFill(0xffffff).drawRect((2 + x) * px, (2 + y) * px, px, px).endFill();
            }
        }
    }
    g.pivot.set(n * px / 2, n * px / 2);
    return g;
}

function spawnPowerup() {
    const type = weightedPick(CONFIG.powerups.weights);
    const style = POWERUP_STYLES[type] || POWERUP_STYLES.rapid;
    const symbol = POWERUP_SYMBOLS[type] || POWERUP_SYMBOLS.rapid;
    const c = new PIXI.Container();
    c.addChild(buildPixelPowerup(style.color, symbol));
    c.powerType = type;
    c.x = random(40, Math.max(41, app.screen.width - 40));
    c.y = -30;
    c.vy = 0.13;
    gameLayer.addChild(c);
    powerupList.push(c);
}

function applyPowerup(type) {
    const dur = CONFIG.powerups.durationsMs;
    if (type === 'rapid') rapidFireMs = dur.rapid;
    else if (type === 'spread') spreadShotMs = dur.spread;
    else if (type === 'shield') shieldActive = true;
    else if (type === 'slow') slowMs = dur.slow;
    else if (type === 'invuln') invulnMs = dur.invuln;
    else if (type === 'missile') missileMs = dur.missile;
    else if (type === 'life') {
        lives = Math.min(maxLives, lives + 1);
        updateHud();
    }
    stats.powerups++;
    stats.typesCollected[type] = true;
    checkAchievements();
}

function updatePowerups(dt) {
    for (let i = powerupList.length - 1; i >= 0; i--) {
        const p = powerupList[i];
        p.y += p.vy * dt;
        p.blinkT = (p.blinkT || 0) + dt;
        p.alpha = Math.floor(p.blinkT / 300) % 2 === 0 ? 1 : 0.55;

        if (p.y > app.screen.height + 30) {
            destroy(p, powerupList);
            continue;
        }

        if (!gameOver && hits(p, arwing)) {
            applyPowerup(p.powerType);
            spawnExplosion(p.x, p.y, 0.06);
            playSound('assets/sounds/level_up.mp3', 0.6);
            destroy(p, powerupList);
        }
    }
}

function parseHexColor(str, fallback) {
    if (typeof str !== 'string') return fallback;
    const v = parseInt(str.replace('#', ''), 16);
    return isNaN(v) ? fallback : v;
}

function applyLevelVisuals() {
    const lv = LEVELS[currentLevel] || LEVELS[0];
    starLayer.tint = parseHexColor(lv.starTint, 0xffffff);
    bgPlanet.tint = parseHexColor(lv.planetColor, 0x3f6d8c);
}

function checkLevelAdvance() {
    let target = currentLevel;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (score >= (LEVELS[i].advanceScore || 0)) { target = i; break; }
    }
    if (target > currentLevel) {
        stats.levelsCleared++;
        if (!stats.hitSinceLevel) stats.perfectSectors++;
        currentLevel = target;
        stats.hitSinceLevel = false;
        applyLevelVisuals();
        showLevelBanner(currentLevel);
        checkAchievements();
    }
}

function showLevelBanner(level) {
    const lv = LEVELS[level] || LEVELS[0];
    const t = new PIXI.Text('SEKTOR ' + (level + 1) + ' · ' + lv.name, {
        fontFamily: 'courier new', fontSize: 46, fill: 0xffffff, fontWeight: 'bold'
    });
    t.anchor.set(0.5);
    t.x = app.screen.width / 2;
    t.y = app.screen.height * 0.32;
    t.scale.set(uiScale);
    uiLayer.addChild(t);
    playSound('assets/sounds/level_up.mp3', 0.6);
    const start = performance.now();
    const dur = 1800;
    const step = () => {
        const p = (performance.now() - start) / dur;
        t.alpha = p < 0.15 ? p / 0.15 : (p > 0.7 ? Math.max(0, (1 - p) / 0.3) : 1);
        if (p < 1) requestAnimationFrame(step);
        else { if (t.parent) t.parent.removeChild(t); t.destroy(); }
    };
    requestAnimationFrame(step);
}

function updateStatusHud() {
    const parts = [];
    if (rapidFireMs > 0) parts.push('RAPID ' + Math.ceil(rapidFireMs / 1000) + 's');
    if (spreadShotMs > 0) parts.push('SPREAD ' + Math.ceil(spreadShotMs / 1000) + 's');
    if (slowMs > 0) parts.push('SLOW ' + Math.ceil(slowMs / 1000) + 's');
    if (invulnMs > 0) parts.push('INVULN ' + Math.ceil(invulnMs / 1000) + 's');
    if (missileMs > 0) parts.push('RAKETEN ' + Math.ceil(missileMs / 1000) + 's');
    if (shieldActive) parts.push('SCHILD');
    const s = parts.join('   ');
    if (powerupText.text !== s) powerupText.text = s;

    const lv = LEVELS[currentLevel] || LEVELS[0];
    const ls = 'SEKTOR ' + (currentLevel + 1) + ' · ' + lv.name;
    if (levelText.text !== ls) levelText.text = ls;
}

function loadAchievements() {
    try {
        const raw = JSON.parse(localStorage.getItem('starfox_achievements') || '{}');
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
    } catch (e) { }
    return {};
}

function saveAchievements() {
    try { localStorage.setItem('starfox_achievements', JSON.stringify(unlockedAchv)); } catch (e) { }
}

function tryUnlock(id) {
    if (unlockedAchv[id]) return;
    unlockedAchv[id] = true;
    saveAchievements();
    const def = CONFIG.achievements.find(a => a.id === id);
    showToast('ERFOLG: ' + (def ? def.name : id));
    updateAchievementsMenu();
}

const ACHIEVEMENT_CHECKS = {
    first_blood: () => stats.kills >= 1,
    first_powerup: () => stats.powerups >= 1,
    score_50: () => score >= 50,
    score_150: () => score >= 150,
    score_300: () => score >= 300,
    score_600: () => score >= 600,
    score_1000: () => score >= 1000,
    kills_10: () => stats.kills >= 10,
    kills_25: () => stats.kills >= 25,
    kills_50: () => stats.kills >= 50,
    kills_100: () => stats.kills >= 100,
    bork_5: () => stats.borks >= 5,
    bork_15: () => stats.borks >= 15,
    bork_30: () => stats.borks >= 30,
    combo_5: () => stats.bestCombo >= 5,
    combo_10: () => stats.bestCombo >= 10,
    combo_20: () => stats.bestCombo >= 20,
    shots_100: () => stats.shots >= 100,
    shots_500: () => stats.shots >= 500,
    shots_1000: () => stats.shots >= 1000,
    powerup_10: () => stats.powerups >= 10,
    powerup_25: () => stats.powerups >= 25,
    powerup_50: () => stats.powerups >= 50,
    all_types: () => Object.keys(POWERUP_STYLES).every(t => stats.typesCollected[t]),
    shield_save_1: () => stats.shieldsUsed >= 1,
    shield_save_5: () => stats.shieldsUsed >= 5,
    missile_10: () => stats.missilesFired >= 10,
    survive_30_nohit: () => stats.bestNoHitMs >= 30000,
    survive_60_nohit: () => stats.bestNoHitMs >= 60000,
    survivor_60: () => stats.timeMs >= 60000,
    survivor_180: () => stats.timeMs >= 180000,
    life1_15: () => stats.life1Ms >= 15000,
    tough_3: () => stats.hitsTaken >= 3 && lives > 0 && !gameOver,
    sector_2: () => currentLevel >= 1,
    sector_3: () => currentLevel >= 2,
    sector_4: () => currentLevel >= 3,
    no_hit_sector: () => stats.perfectSectors >= 1,
    no_hit_sector_3: () => stats.perfectSectors >= 3,
    perfect_5: () => stats.perfectSectors >= 5,
    levels_cleared_3: () => stats.levelsCleared >= 3
};

function checkAchievements() {
    for (const id in ACHIEVEMENT_CHECKS) {
        if (!unlockedAchv[id] && ACHIEVEMENT_CHECKS[id]()) tryUnlock(id);
    }
}

function showToast(text) {
    const t = new PIXI.Text(text, {
        fontFamily: 'courier new', fontSize: 24, fill: 0xffdd44, fontWeight: 'bold'
    });
    t.anchor.set(0.5);
    t.x = app.screen.width / 2;
    t.y = app.screen.height * 0.2;
    t.scale.set(uiScale);
    uiLayer.addChild(t);
    const start = performance.now();
    const dur = 3000;
    const baseY = app.screen.height * 0.2;
    const step = () => {
        const p = (performance.now() - start) / dur;
        t.alpha = p < 0.12 ? p / 0.12 : (p > 0.75 ? Math.max(0, (1 - p) / 0.25) : 1);
        t.y = baseY - Math.min(1, p) * 24;
        if (p < 1) requestAnimationFrame(step);
        else { if (t.parent) t.parent.removeChild(t); t.destroy(); }
    };
    requestAnimationFrame(step);
}

const ACHV_PER_PAGE = 8;
let achvPage = 0;
let achvResetArmed = false;

function totalAchvPages() {
    return Math.max(1, Math.ceil(CONFIG.achievements.length / ACHV_PER_PAGE));
}

function buildAchievementsMenu() {
    achvList = CONFIG.achievements.map(def => {
        const name = new PIXI.Text('', { fontFamily: 'courier new', fontSize: 22, fill: 0xffffff, fontWeight: 'bold' });
        name.anchor.set(0.5);
        const desc = new PIXI.Text(def.desc, { fontFamily: 'courier new', fontSize: 14, fill: 0x999999 });
        desc.anchor.set(0.5);
        achvContainer.addChild(name, desc);
        return { def, name, desc };
    });
    updateAchievementsMenu();
}

function changeAchvPage(delta) {
    const next = Math.max(0, Math.min(totalAchvPages() - 1, achvPage + delta));
    if (next === achvPage) return;
    achvPage = next;
    updateAchievementsMenu();
    playConfirm();
}

function disarmAchvReset() {
    achvResetArmed = false;
    achvResetBtn.text = 'Zurücksetzen';
    achvResetBtn._base = 0xff6666;
    achvResetBtn.style.fill = 0xff6666;
}

function onAchvResetClick() {
    if (!achvResetArmed) {
        achvResetArmed = true;
        achvResetBtn.text = 'Sicher? Nochmal';
        achvResetBtn._base = 0xff2222;
        achvResetBtn.style.fill = 0xff2222;
        playConfirm();
        return;
    }
    disarmAchvReset();
    resetAchievements();
}

function resetAchievements() {
    unlockedAchv = {};
    saveAchievements();
    achvPage = 0;
    updateAchievementsMenu();
    showToast('Erfolge zurückgesetzt');
    playConfirm();
}

function updateAchievementsMenu() {
    const total = CONFIG.achievements.length;
    const pages = totalAchvPages();
    achvPage = Math.max(0, Math.min(pages - 1, achvPage));
    const start = achvPage * ACHV_PER_PAGE;

    achvList.forEach((row, i) => {
        const idx = start + i;
        const inPage = i < ACHV_PER_PAGE && idx < total;
        row.name.visible = inPage;
        row.desc.visible = inPage;
        if (!inPage) return;
        const got = !!unlockedAchv[row.def.id];
        row.name.text = (got ? '[x] ' : '[ ] ') + row.def.name;
        row.name.style.fill = got ? 0x66ff99 : 0x888888;
        row.desc.text = row.def.desc;
        row.desc.style.fill = got ? 0xbbbbbb : 0x555555;
    });

    const done = CONFIG.achievements.filter(a => unlockedAchv[a.id]).length;
    achvSubtitle.text = done + ' / ' + total + ' freigeschaltet';
    const multi = pages > 1;
    achvPrevBtn.visible = multi;
    achvNextBtn.visible = multi;
    achvPageLabel.visible = multi;
    achvPageLabel.text = 'Seite ' + (achvPage + 1) + ' / ' + pages;
    achvPrevBtn._base = achvPage > 0 ? 0x66ccff : 0x445566;
    achvPrevBtn.style.fill = achvPrevBtn._base;
    achvNextBtn._base = achvPage < pages - 1 ? 0x66ccff : 0x445566;
    achvNextBtn.style.fill = achvNextBtn._base;
}

function openAchievementsMenu() {
    achvContainer.visible = true;
    startContainer.visible = false;
    musicContainer.visible = false;
    disarmAchvReset();
    updateAchievementsMenu();
    playConfirm();
    layoutUI();
}

function closeAchievementsMenu() {
    achvContainer.visible = false;
    startContainer.visible = true;
    playConfirm();
    layoutUI();
}

function onPlayerHit() {
    if (devInvincible || arwingInvuln > 0 || invulnMs > 0 || gameOver) return;

    if (shieldActive) {
        shieldActive = false;
        stats.shieldsUsed++;
        arwingInvuln = 800;
        spawnExplosion(arwing.x, arwing.y, 0.1);
        playSound('assets/sounds/explosion1.mp3', 0.5);
        shake(8, 200);
        return;
    }

    lives--;
    stats.hitSinceLevel = true;
    stats.hitsTaken++;
    stats.combo = 0;
    stats.noHitMs = 0;
    updateHud();
    spawnExplosion(arwing.x, arwing.y, 0.12);
    playSound('assets/sounds/explosionMaster.mp3', 0.7);
    shake(16, 400);

    if (lives <= 0) {
        gameOverSequence();
    } else {
        arwingInvuln = 1600;
    }
    updateWarningSound();
}

function gameOverSequence() {
    gameOver = true;
    arwing.visible = false;
    powerupText.text = '';
    levelText.visible = false;
    pauseAllMusic();
    gameStartSound.pause();
    playSound('assets/sounds/game_over.mp3', 0.8);

    if (score > highscore) {
        highscore = score;
        try { localStorage.setItem('starfox_highscore', String(highscore)); } catch (e) { }
    }

    bestText.text = 'Best: ' + highscore;
    if (!gameOverText.parent) uiLayer.addChild(gameOverText);
    if (!bestText.parent) uiLayer.addChild(bestText);

    if (score > 0) {
        showNameEntry();
    } else {
        finishGameOver();
    }
    layoutUI();
}

function finishGameOver() {
    overScoreText.text = scoreboardText(difficulty);
    if (!overScoreText.parent) uiLayer.addChild(overScoreText);
    if (!restartButton.parent) uiLayer.addChild(restartButton);
    if (!menuButton.parent) uiLayer.addChild(menuButton);
    layoutUI();
}

function resetRoundState() {
    commitName();
    destroyAll(shipList);
    destroyAll(laserList);
    destroyAll(enemyLasers);
    destroyAll(powerupList);
    destroyAll(missileList);

    score = 0;
    lives = 3;
    gameOver = false;
    gamePaused = false;
    gameSpeed = currentDifficulty().spawnMs;
    spawnAccum = 0;
    diffAccum = 0;
    arwingInvuln = 1000;
    rapidFireMs = 0;
    spreadShotMs = 0;
    shieldActive = false;
    slowMs = 0;
    invulnMs = 0;
    missileMs = 0;
    missileCooldown = 0;
    shieldGfx.visible = false;
    fireCooldown = 0;
    fireBlocked = true;
    powerupTimer = CONFIG.tuning.powerupFirstDelayMs;

    currentLevel = Math.max(0, Math.min(LEVELS.length - 1, devLevel));
    applyLevelVisuals();
    stats = freshStats();

    arwing.visible = true;
    arwing.alpha = 1;
    arwing.tint = 0xffffff;
    arwingBlinkT = 0;
    arwing.rotation = Math.PI;
    arwing.x = app.screen.width / 2;
    arwing.y = app.screen.height * 0.75;
    mouseX = arwing.x;
    mouseY = arwing.y;

    pauseContainer.visible = false;

    if (gameOverText.parent) uiLayer.removeChild(gameOverText);
    if (bestText.parent) uiLayer.removeChild(bestText);
    if (overScoreText.parent) uiLayer.removeChild(overScoreText);
    if (restartButton.parent) uiLayer.removeChild(restartButton);
    if (menuButton.parent) uiLayer.removeChild(menuButton);
}

function restartGame() {
    resetRoundState();
    showStart = false;
    startContainer.visible = false;
    musicContainer.visible = false;
    musicMenuOpen = false;
    musicPreviewId = null;

    refreshHudVisibility();
    updateHud();
    updateScoreboardTexts();
    startGameAudio();
    layoutUI();
}

function goToMainMenu() {
    resetRoundState();
    pauseAllMusic();
    gameStartSound.pause();
    musicStarted = false;
    musicPreviewId = null;
    musicMenuOpen = false;
    musicContainer.visible = false;
    startContainer.visible = true;
    showStart = true;

    refreshHudVisibility();
    updateHud();
    updateScoreboardTexts();
    updateControlButtons();
    updateMusicMenuState();
    maybePlayMenuMusic();
    layoutUI();
}

function destroyAll(arr) {
    while (arr.length) {
        const o = arr.pop();
        if (o.parent) o.parent.removeChild(o);
        o.destroy({ children: true });
    }
}

function updateHud() {
    scoreText.text = 'Score: ' + score;
    livesText.text = 'Lives: ' + Math.max(0, lives);
    highscoreText.text = 'Best: ' + highscore;
    updateArwingTexture();
}

function layoutUI() {
    const w = app.screen.width;
    const h = app.screen.height;
    const cx = w / 2;
    const cy = h / 2;

    computeScales();

    logo.x = 90;
    logo.y = 46;
    livesText.x = 20;
    livesText.y = 82;
    scoreText.x = w - 20;
    scoreText.y = 12;
    highscoreText.x = w - 20;
    highscoreText.y = 44;
    soundButton.x = w - 20;
    soundButton.y = 76;

    const menuLogoSize = Math.min(w, h) * 0.85;
    for (const bg of [startLogoBg, pauseLogoBg]) {
        const tw = bg.texture.width || MENU_LOGO_BASE;
        bg.scale.set(menuLogoSize / tw);
        bg.x = cx;
        bg.y = cy;
    }

    musicDisc.scale.set(Math.min(w, h) / 900);
    musicDisc.x = cx;
    musicDisc.y = cy;

    startTitle.x = cx;
    startTitle.y = h * 0.15;
    startSubtitle.x = cx;
    startSubtitle.y = h * 0.15 + 52;
    startMouseBtn.y = h * 0.31;
    startKeyBtn.y = h * 0.31;
    if (isTouchDevice) {
        startMouseBtn.x = cx;
        startKeyBtn.visible = false;
    } else {
        startMouseBtn.x = cx - 120;
        startKeyBtn.x = cx + 120;
        startKeyBtn.visible = true;
    }
    startDiffRow.x = cx;
    startDiffRow.y = h * 0.42;
    startButton.x = cx;
    startButton.y = h * 0.545;
    startMusicBtn.x = cx - 92;
    startMusicBtn.y = h * 0.64;
    startAchvBtn.x = cx + 92;
    startAchvBtn.y = h * 0.64;
    startHint.x = cx;
    startHint.y = h * 0.72;
    startMusicHint.x = cx;
    startMusicHint.y = h * 0.80;
    startScore.x = cx;
    startScore.y = h * 0.875;

    levelText.x = cx;
    levelText.y = 12;
    powerupText.x = cx;
    powerupText.y = 40;

    musicTitle.x = cx;
    musicTitle.y = cy - 205;
    musicSubtitle.x = cx;
    musicSubtitle.y = cy - 152;
    musicButtons.forEach((entry, i) => {
        entry.btn.x = cx;
        entry.btn.y = cy - 95 + i * 46;
    });
    musicStopBtn.x = cx;
    musicStopBtn.y = cy - 95 + musicButtons.length * 46;
    musicBackBtn.x = cx;
    musicBackBtn.y = musicStopBtn.y + 58;
    musicBackHint.x = cx;
    musicBackHint.y = musicStopBtn.y + 100;

    achvTitle.x = cx;
    achvTitle.y = cy - 230;
    achvSubtitle.x = cx;
    achvSubtitle.y = cy - 188;
    achvList.forEach((row, i) => {
        const slot = i % ACHV_PER_PAGE;
        const y = cy - 145 + slot * 34;
        row.name.x = cx;
        row.name.y = y;
        row.desc.x = cx;
        row.desc.y = y + 15;
    });
    const achvNavY = cy - 145 + ACHV_PER_PAGE * 34 + 14;
    achvPrevBtn.x = cx - 110;
    achvPrevBtn.y = achvNavY;
    achvNextBtn.x = cx + 110;
    achvNextBtn.y = achvNavY;
    achvPageLabel.x = cx;
    achvPageLabel.y = achvNavY;
    achvResetBtn.x = cx - 110;
    achvResetBtn.y = achvNavY + 52;
    achvBackBtn.x = cx + 110;
    achvBackBtn.y = achvNavY + 52;
    achvBackHint.x = cx;
    achvBackHint.y = achvNavY + 94;

    devTitle.x = cx;
    devTitle.y = cy - 250;
    const devStart = cy - 195;
    devSectorButtons.forEach((b, i) => {
        b.x = cx;
        b.y = devStart + i * 34;
    });
    const devAfterSectors = devStart + Math.max(1, devSectorButtons.length) * 34;
    const nPow = devPowerButtons.length;
    devPowerButtons.forEach((b, i) => {
        const step = Math.min(96, w * 0.7 / Math.max(1, nPow - 1));
        b.x = cx + (i - (nPow - 1) / 2) * step;
        b.y = devAfterSectors + 8;
    });
    const devAfterPower = devAfterSectors + 46;
    devDiffRow.x = cx;
    devDiffRow.y = devAfterPower + 26;
    devInvBtn.x = cx;
    devInvBtn.y = devDiffRow.y + 70;
    devClearBtn.x = cx - 110;
    devClearBtn.y = devInvBtn.y + 50;
    devCloseBtn.x = cx + 110;
    devCloseBtn.y = devInvBtn.y + 50;
    devHint.x = cx;
    devHint.y = devCloseBtn.y + 42;

    startDevBtn.visible = DEV_MODE;
    if (DEV_MODE) {
        startDevBtn.x = 60;
        startDevBtn.y = h - 34;
    }

    pauseTitle.x = cx;
    pauseTitle.y = cy - 190;
    pauseControlLabel.x = cx;
    pauseControlLabel.y = cy - 135;
    pauseMouseBtn.y = cy - 88;
    pauseKeyBtn.y = cy - 88;
    if (isTouchDevice) {
        pauseMouseBtn.x = cx;
        pauseKeyBtn.visible = false;
    } else {
        pauseMouseBtn.x = cx - 120;
        pauseKeyBtn.x = cx + 120;
        pauseKeyBtn.visible = true;
    }
    pauseDiffRow.x = cx;
    pauseDiffRow.y = cy - 28;
    pauseResumeBtn.x = cx;
    pauseResumeBtn.y = cy + 45;
    pauseRestartBtn.x = cx;
    pauseRestartBtn.y = cy + 103;
    pauseMenuBtn.x = cx;
    pauseMenuBtn.y = cy + 161;
    pauseHint.x = cx;
    pauseHint.y = cy + 216;

    pauseDevBtn.visible = DEV_MODE;
    if (DEV_MODE) {
        pauseDevBtn.x = 60;
        pauseDevBtn.y = h - 34;
    }

    gameOverText.x = cx;
    gameOverText.y = cy - 210 * uiScale;
    bestText.x = cx;
    bestText.y = cy - 165 * uiScale;
    overScoreText.x = cx;
    overScoreText.y = cy + 55 * uiScale;
    restartButton.x = cx;
    restartButton.y = cy + 185 * uiScale;
    menuButton.x = cx;
    menuButton.y = cy + 240 * uiScale;

    for (const c of [startContainer, musicContainer, pauseContainer, achvContainer, devContainer]) {
        c.pivot.set(cx, cy);
        c.position.set(cx, cy);
        c.scale.set(uiScale);
    }

    logo.scale.set(0.12 * uiScale);
    for (const t of [livesText, scoreText, highscoreText, soundButton, levelText, powerupText, gameOverText, bestText, overScoreText, restartButton, menuButton]) {
        t.scale.set(uiScale);
    }

    applyArwingScale();
    shieldGfx.scale.set(worldScale / ASSET_SCALE);
}

function onResize() {
    layoutUI();
    positionPlanet(false);
    for (const s of stars) {
        if (s.x > app.screen.width) s.x = Math.random() * app.screen.width;
        if (s.y > app.screen.height) s.y = Math.random() * app.screen.height;
    }
    arwing.x = Math.min(arwing.x, app.screen.width - MARGIN);
    arwing.y = Math.min(arwing.y, app.screen.height - MARGIN);
    for (const s of shipList) {
        if (s.x > app.screen.width - 30) s.x = app.screen.width - 30;
    }
}

function update(dt) {
    const tune = CONFIG.tuning;
    stats.timeMs += dt;
    stats.noHitMs += dt;
    if (stats.noHitMs > stats.bestNoHitMs) stats.bestNoHitMs = stats.noHitMs;
    if (lives === 1) stats.life1Ms += dt;

    diffAccum += dt;
    if (diffAccum >= tune.speedRampStepMs) {
        diffAccum -= tune.speedRampStepMs;
        if (gameSpeed > tune.minSpawnMs) gameSpeed = Math.max(tune.minSpawnMs, gameSpeed - tune.speedRampAmount);
    }

    if (arwingInvuln > 0) arwingInvuln -= dt;
    if (rapidFireMs > 0) rapidFireMs = Math.max(0, rapidFireMs - dt);
    if (spreadShotMs > 0) spreadShotMs = Math.max(0, spreadShotMs - dt);
    if (slowMs > 0) slowMs = Math.max(0, slowMs - dt);
    if (invulnMs > 0) invulnMs = Math.max(0, invulnMs - dt);
    if (missileMs > 0) missileMs = Math.max(0, missileMs - dt);
    if (missileCooldown > 0) missileCooldown = Math.max(0, missileCooldown - dt);
    arwing.alpha = ((arwingInvuln > 0 || invulnMs > 0) && Math.floor((arwingInvuln || invulnMs) / 90) % 2 === 0) ? 0.35 : 1;

    if (lives === 1) {
        arwingBlinkT += dt;
        arwing.tint = Math.floor(arwingBlinkT / 250) % 2 === 0 ? 0xff4444 : 0xffffff;
    } else {
        arwingBlinkT = 0;
        arwing.tint = 0xffffff;
    }

    shieldGfx.x = arwing.x;
    shieldGfx.y = arwing.y;
    shieldGfx.visible = shieldActive;

    moveArwing(dt);
    handleFiring(dt);
    updateShips(dt);
    updateLasers(dt);
    updateEnemyLasers(dt);
    updateMissiles(dt);
    updatePowerups(dt);

    const lvl = LEVELS[currentLevel] || LEVELS[0];
    const spawnThreshold = Math.max(80, gameSpeed * (lvl.spawnMult || 1));
    spawnAccum += dt;
    if (spawnAccum >= spawnThreshold) {
        spawnAccum = 0;
        spawnShip();
    }

    powerupTimer -= dt;
    if (powerupTimer <= 0) {
        spawnPowerup();
        powerupTimer = random(tune.powerupRespawnMinMs, tune.powerupRespawnMaxMs);
    }

    checkLevelAdvance();
    checkAchievements();
    updateStatusHud();
}

function updateShake(dt) {
    if (shakeTime <= 0) {
        gameLayer.x = 0;
        gameLayer.y = 0;
        return;
    }
    shakeTime -= dt;
    const k = Math.max(0, shakeTime / shakeDur) * shakeMag;
    gameLayer.x = (Math.random() * 2 - 1) * k;
    gameLayer.y = (Math.random() * 2 - 1) * k;
}

function updateShieldSprite() {
    shieldGfx.x = arwing.x;
    shieldGfx.y = arwing.y;
}

function positionPlanet(reset) {
    const w = app.screen.width;
    const h = app.screen.height;
    const base = Math.min(w, h) * 0.55;
    bgPlanet.scale.set(base / 200);
    if (reset) {
        bgPlanet.x = w * 0.78;
        bgPlanet.y = h * 0.28;
    }
}

function updatePlanet(dt) {
    bgPlanet.y += 0.02 * dt;
    const size = 200 * bgPlanet.scale.y;
    if (bgPlanet.y - size > app.screen.height) {
        bgPlanet.y = -size;
        bgPlanet.x = app.screen.width * random(30, 80) / 100;
    }
}

app.ticker.add((delta) => {
    const dt = Math.min(delta, 4) * (1000 / 60);
    updateStars(dt);
    updatePlanet(dt);
    updateShake(dt);
    updateShieldSprite();
    updateMusicFades(dt);
    updateMusicDisc(dt);
    if (!gameOver && !gamePaused && !showStart) update(dt);
    updateWarningSound();
});

async function init() {
    await loadConfig();
    applyConfig();
    LEVELS = CONFIG.levels;
    boards = loadBoards();
    unlockedAchv = loadAchievements();
    buildAchievementsMenu();
    buildDevMenu();
    applyLevelVisuals();
    positionPlanet(true);
    initStars();
    applyDifficulty();
    updateStars(0);
    updateControlButtons();
    updateMusicMenuState();
    refreshHudVisibility();
    layoutUI();
    startMenuMusicNow();
    setTimeout(() => {
        if (!muted && showStart && !menuMusicUnlocked) startMusicHint.visible = true;
    }, 1000);
    for (const ev of MENU_UNLOCK_EVENTS) document.addEventListener(ev, attemptUnlockMenuMusic);
}

init();
