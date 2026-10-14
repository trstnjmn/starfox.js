const app = new PIXI.Application({
    resizeTo: window,
    antialias: true,
    backgroundColor: 0x05070d
});

const _gameContainer = document.getElementById('game-container') || document.body;
_gameContainer.appendChild(app.view);

const starLayer = new PIXI.Container();
const gameLayer = new PIXI.Container();
const uiLayer = new PIXI.Container();
app.stage.addChild(starLayer, gameLayer, uiLayer);

const MARGIN = 26;
const FALL_FACTOR = 0.06;
const ASSET_SCALE = 1.25;

const DIFFICULTIES = [
    { name: 'Sehr leicht', spawnMs: 1600, maxLives: 8 },
    { name: 'Leicht', spawnMs: 1400, maxLives: 7 },
    { name: 'Normal', spawnMs: 1200, maxLives: 6 },
    { name: 'Schwer', spawnMs: 1000, maxLives: 5 },
    { name: 'Extrem', spawnMs: 800, maxLives: 4 }
];
let difficulty = 4;
try {
    const d = parseInt(localStorage.getItem('starfox_difficulty') || '4', 10);
    if (d >= 1 && d <= 5) difficulty = d;
} catch (e) { }
let maxLives = 5;
const HUD_FONT = { fontFamily: 'courier new', fontSize: 22, fill: 0xffffff, fontWeight: 'bold' };

const ENEMY_KINDS = ['ship1', 'ship2', 'rock', 'satellite', 'bork'];
const ENEMY_DEFS = {
    ship1: { file: 'assets/ship1.png', damaged: 'assets/ship1_damaged.png', shoots: true, lateral: true, hp: 1, score: 1, crash: true },
    ship2: { file: 'assets/ship2.png', damaged: 'assets/ship2_damaged.png', shoots: true, lateral: true, hp: 1, score: 1, crash: true },
    rock: { file: 'assets/rock.png', hp: 1, score: 1 },
    satellite: { file: 'assets/satellite.png', damaged: 'assets/satellite_damaged.png', hp: 1, score: 1, orbit: true, crash: true },
    bork: { file: 'assets/bork.png', damaged: 'assets/bork_damaged.png', hp: 2, score: 2, blast: true }
};

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

let savedName = '';
try { savedName = (localStorage.getItem('starfox_name') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); } catch (e) { }

let boards = loadBoards();
let awaitingName = false;

let mouseX = app.screen.width / 2;
let mouseY = app.screen.height / 2;
let mousePressed = false;

let arwingInvuln = 0;
let arwingBlinkT = 0;
let rapidFireMs = 0;
let spreadShotMs = 0;
let shieldActive = false;

let spawnAccum = 0;
let diffAccum = 0;
let fireCooldown = 0;
let fireBlocked = false;
let powerupTimer = 6000;

let shakeTime = 0;
let shakeDur = 1;
let shakeMag = 0;

const shipList = [];
const laserList = [];
const enemyLasers = [];
const powerupList = [];
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
arwing.scale.set(0.08 * ASSET_SCALE);
arwing.rotation = Math.PI;
arwing.x = app.screen.width / 2;
arwing.y = app.screen.height * 0.75;
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
startContainer.addChild(startTitle, startSubtitle, startMouseBtn, startKeyBtn, startButton, startMusicBtn, startHint, startScore, startMusicHint);
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
const pauseHint = new PIXI.Text('P / Escape = Weiter', {
    fontFamily: 'courier new', fontSize: 18, fill: 0xbbbbbb
});
pauseHint.anchor.set(0.5);
pauseContainer.addChild(pauseTitle, pauseControlLabel, pauseMouseBtn, pauseKeyBtn, pauseResumeBtn, pauseRestartBtn, pauseMenuBtn, pauseHint);
pauseContainer.visible = false;
uiLayer.addChild(pauseContainer);

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

document.addEventListener('keydown', (e) => {
    if (awaitingName) return;
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
    e.scale.set(scale * ASSET_SCALE);
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
    pauseControlLabel.text = 'Steuerung: ' + (controlMode === 'keyboard' ? 'Tastatur' : 'Maus');
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
    startContainer.visible = true;
    maybePlayMenuMusic();
    updateMusicMenuState();
    playConfirm();
    layoutUI();
}

function currentDifficulty() {
    return DIFFICULTIES[Math.max(1, Math.min(5, difficulty)) - 1];
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
    right.on('pointerover', () => { if (difficulty < 5) right.style.fill = 0x66ff99; });
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
    for (const row of [startDiffRow, pauseDiffRow]) {
        row._label.text = 'Stufe ' + difficulty + ' · ' + d.name;
        row._desc.text = 'Spawn: ' + d.spawnMs + ' ms · Max. Leben: ' + d.maxLives;
        row._left.alpha = difficulty > 1 ? 1 : 0.3;
        row._right.alpha = difficulty < 5 ? 1 : 0.3;
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
    difficulty = Math.max(1, Math.min(5, difficulty + delta));
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
    const kind = ENEMY_KINDS[random(0, ENEMY_KINDS.length - 1)];
    const def = ENEMY_DEFS[kind];
    const ship = PIXI.Sprite.from(def.file);
    ship.anchor.set(0.5);
    ship.scale.set(kind === 'rock' ? random(4, 11) * ASSET_SCALE / 100 : 0.07 * ASSET_SCALE);
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
    ship.vy = random(2, 5) * FALL_FACTOR;
    if (def.lateral) {
        ship.vx = (random(0, 1) ? 1 : -1) * random(1, 3) * FALL_FACTOR;
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
        ship.vy = random(1, 2) * FALL_FACTOR;
        ship.orbitRadius = radius;
        ship.centerX = random(minC, maxC);
        ship.orbitAngle = random(0, 628) / 100;
        ship.orbitSpeed = random(15, 30) / 10000;
        ship.x = ship.centerX + Math.cos(ship.orbitAngle) * radius;
        ship.vx = 0;
    }

    gameLayer.addChild(ship);
    shipList.push(ship);
}

function updateShips(dt) {
    for (let i = shipList.length - 1; i >= 0; i--) {
        const s = shipList[i];
        if (!s.teleporting) s.y += s.vy * dt;

        if (s.crashing) {
            s.vy = Math.min(s.vy + 0.0012 * dt, 1.6);
            s.rotation += s.spinSpeed * dt;
            s.wobblePhase += s.wobbleFreq * dt;
            s.x += Math.sin(s.wobblePhase) * s.wobbleAmp * dt;
            if (s.x < 20) s.x = 20;
            if (s.x > app.screen.width - 20) s.x = app.screen.width - 20;
            if (s.noHitT > 0) s.noHitT -= dt;
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

        if (!gameOver && (s.noHitT || 0) <= 0 && hits(s, arwing)) {
            destroy(s, shipList);
            if (arwingInvuln <= 0) onPlayerHit();
        }
    }
}

function fireEnemyLaser(ship) {
    const l = PIXI.Sprite.from('assets/laser.png');
    l.anchor.set(0.5);
    l.scale.set(0.03 * ASSET_SCALE);
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
    playSound('assets/sounds/laser' + random(1, 2) + '.mp3', 0.5);
    const spread = spreadShotMs > 0;
    const angles = spread ? [-0.22, 0, 0.22] : [0];
    const speed = 0.75;

    for (const a of angles) {
        const laser = PIXI.Sprite.from('assets/laser.png');
        laser.anchor.set(0.5);
        laser.scale.set(0.03 * ASSET_SCALE);
        laser.x = arwing.x + a * 80;
        laser.y = arwing.y - 26;
        laser.vx = Math.sin(a) * speed;
        laser.vy = -Math.cos(a) * speed;
        laser.rotation = Math.atan2(laser.vy, laser.vx) + Math.PI / 2;
        gameLayer.addChild(laser);
        laserList.push(laser);
    }
}

function handleFiring(dt) {
    if (fireBlocked) {
        if (!mousePressed && !gameInput.fire) fireBlocked = false;
        return;
    }
    fireCooldown -= dt;
    if (!(mousePressed || gameInput.fire) || fireCooldown > 0) return;
    fireCooldown = rapidFireMs > 0 ? 85 : 165;
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
        ship.noHitT = 450;
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
    if (big && !gameOver) spawnBlast(x, y, 95 * ASSET_SCALE);
    score += ship.scoreValue || 1;
    updateHud();
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

const POWERUP_PIXEL = Math.round(3 * ASSET_SCALE);
const POWERUP_SYMBOLS = {
    rapid: ['####.', '#...#', '####.', '#..#.', '#...#'],
    spread: ['.####', '#....', '.###.', '....#', '####.'],
    shield: ['####.', '#...#', '#...#', '#...#', '####.'],
    life: ['..#..', '..#..', '#####', '..#..', '..#..']
};

function mixColor(a, b, t) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

function buildPixelPowerup(color, symbol) {
    const g = new PIXI.Graphics();
    const n = 9;
    const dark = 0x101018;
    const light = mixColor(color, 0xffffff, 0.55);
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            if ((x === 0 || x === n - 1) && (y === 0 || y === n - 1)) continue;
            let col;
            if (x === 0 || y === 0 || x === n - 1 || y === n - 1) col = dark;
            else if (x === 1 || y === 1) col = light;
            else col = color;
            g.beginFill(col).drawRect(x * POWERUP_PIXEL, y * POWERUP_PIXEL, POWERUP_PIXEL, POWERUP_PIXEL).endFill();
        }
    }
    for (let y = 0; y < symbol.length; y++) {
        for (let x = 0; x < symbol[y].length; x++) {
            if (symbol[y][x] === '#') {
                g.beginFill(0xffffff).drawRect((2 + x) * POWERUP_PIXEL, (2 + y) * POWERUP_PIXEL, POWERUP_PIXEL, POWERUP_PIXEL).endFill();
            }
        }
    }
    g.pivot.set(n * POWERUP_PIXEL / 2, n * POWERUP_PIXEL / 2);
    return g;
}

function spawnPowerup() {
    const defs = [
        { type: 'rapid', color: 0xffcc00, symbol: POWERUP_SYMBOLS.rapid },
        { type: 'spread', color: 0x00ccff, symbol: POWERUP_SYMBOLS.spread },
        { type: 'shield', color: 0x66ff99, symbol: POWERUP_SYMBOLS.shield }
    ];
    const def = random(0, 99) < 15
        ? { type: 'life', color: 0xff4466, symbol: POWERUP_SYMBOLS.life }
        : defs[random(0, defs.length - 1)];
    const c = new PIXI.Container();
    c.addChild(buildPixelPowerup(def.color, def.symbol));
    c.powerType = def.type;
    c.x = random(40, Math.max(41, app.screen.width - 40));
    c.y = -30;
    c.vy = 0.13;
    gameLayer.addChild(c);
    powerupList.push(c);
}

function applyPowerup(type) {
    if (type === 'rapid') rapidFireMs = 8000;
    else if (type === 'spread') spreadShotMs = 8000;
    else if (type === 'shield') shieldActive = true;
    else if (type === 'life') {
        lives = Math.min(maxLives, lives + 1);
        updateHud();
    }
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

function onPlayerHit() {
    if (arwingInvuln > 0 || gameOver) return;

    if (shieldActive) {
        shieldActive = false;
        arwingInvuln = 800;
        spawnExplosion(arwing.x, arwing.y, 0.1);
        playSound('assets/sounds/explosion1.mp3', 0.5);
        shake(8, 200);
        return;
    }

    lives--;
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
    shieldGfx.visible = false;
    fireCooldown = 0;
    fireBlocked = true;
    powerupTimer = 6000;

    arwing.visible = true;
    arwing.alpha = 1;
    arwing.tint = 0xffffff;
    arwingBlinkT = 0;
    arwing.rotation = Math.PI;
    arwing.x = app.screen.width / 2;
    arwing.y = app.screen.height * 0.75;

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
    startMouseBtn.x = cx - 120;
    startMouseBtn.y = h * 0.31;
    startKeyBtn.x = cx + 120;
    startKeyBtn.y = h * 0.31;
    startDiffRow.x = cx;
    startDiffRow.y = h * 0.42;
    startButton.x = cx;
    startButton.y = h * 0.545;
    startMusicBtn.x = cx;
    startMusicBtn.y = h * 0.64;
    startHint.x = cx;
    startHint.y = h * 0.72;
    startMusicHint.x = cx;
    startMusicHint.y = h * 0.80;
    startScore.x = cx;
    startScore.y = h * 0.875;

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
    musicBackBtn.y = h - 96;
    musicBackHint.x = cx;
    musicBackHint.y = h - 48;

    pauseTitle.x = cx;
    pauseTitle.y = cy - 190;
    pauseControlLabel.x = cx;
    pauseControlLabel.y = cy - 135;
    pauseMouseBtn.x = cx - 120;
    pauseMouseBtn.y = cy - 88;
    pauseKeyBtn.x = cx + 120;
    pauseKeyBtn.y = cy - 88;
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

    gameOverText.x = cx;
    gameOverText.y = cy - 235;
    bestText.x = cx;
    bestText.y = cy - 182;
    overScoreText.x = cx;
    overScoreText.y = cy + 40;
    restartButton.x = cx;
    restartButton.y = cy + 205;
    menuButton.x = cx;
    menuButton.y = cy + 268;
}

function onResize() {
    layoutUI();
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
    diffAccum += dt;
    if (diffAccum >= 1000) {
        diffAccum -= 1000;
        if (gameSpeed > 220) gameSpeed -= 12;
    }

    if (arwingInvuln > 0) arwingInvuln -= dt;
    if (rapidFireMs > 0) rapidFireMs = Math.max(0, rapidFireMs - dt);
    if (spreadShotMs > 0) spreadShotMs = Math.max(0, spreadShotMs - dt);
    arwing.alpha = (arwingInvuln > 0 && Math.floor(arwingInvuln / 90) % 2 === 0) ? 0.35 : 1;

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
    updatePowerups(dt);

    spawnAccum += dt;
    if (spawnAccum >= gameSpeed) {
        spawnAccum = 0;
        spawnShip();
    }

    powerupTimer -= dt;
    if (powerupTimer <= 0) {
        spawnPowerup();
        powerupTimer = random(8000, 14000);
    }
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

app.ticker.add((delta) => {
    const dt = Math.min(delta, 4) * (1000 / 60);
    updateStars(dt);
    updateShake(dt);
    updateShieldSprite();
    updateMusicFades(dt);
    updateMusicDisc(dt);
    if (!gameOver && !gamePaused && !showStart) update(dt);
    updateWarningSound();
});

initStars();
applyDifficulty();
updateStars(0);
updateControlButtons();
updateMusicMenuState();
refreshHudVisibility();
layoutUI();
startMenuMusicNow();
for (const ev of MENU_UNLOCK_EVENTS) document.addEventListener(ev, attemptUnlockMenuMusic);
