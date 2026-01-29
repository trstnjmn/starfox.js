const app = new PIXI.Application();
const shipList = [];
let gameSpeed = 2000;

// Difficulty progression: decrease gameSpeed by 10 every 1s, min 100 (only when not paused)
gameInterval(function() {
    if (gamePaused) return;
    if (gameSpeed > 100) {
        gameSpeed -= 10;
        // update visible speed
        try { updateSpeedText(); } catch (e) { }
    }
}, 1000);

let score = 0;
let mouseX = 0;
let mouseY = 0;
let mousePressed = false;
let gamePaused = false;
let pauseText = null;
// TODO: set arwingCollisionBox to true to enable collision detection
let arwingCollisionBox = false;

const _gameContainer = document.getElementById('game-container') || document.body;
_gameContainer.appendChild(app.view);

// background Music
const backgrundMusic = new Audio('assets/sounds/background-music.mp3');
backgrundMusic.loop = true;
// Try to autoplay; if browser blocks autoplay, start on first user gesture
backgrundMusic.play().catch(() => {
    // Autoplay blocked by browser — wait for user gesture
});

function startBackgroundMusic() {
    backgrundMusic.play().catch(() => {});
}

// Start music on first user gesture if autoplay was blocked
document.addEventListener('pointerdown', startBackgroundMusic, { once: true });

// Logo
const logo = PIXI.Sprite.from('assets/starFoxJs.png');
logo.scale.set(0.12);
logo.x = 80;
logo.y = 50;
logo.anchor.set(0.5);
app.stage.addChild(logo);

// Arwing (player's ship)
const arwing = PIXI.Sprite.from('assets/arwing.png');
arwing.scale.set(0.08);
arwing.x = app.view.width / 2;
arwing.y = app.view.height / 2;
arwing.anchor.set(0.5);
arwing.rotation = 3.14;
app.stage.addChild(arwing);

// Explosion sprite (for reuse)
const explosion = PIXI.Sprite.from('assets/explosion.png');
    explosion.scale.set(0.04);

// Mouse Events
document.addEventListener('mousemove', (e) => {
    const rect = app.view.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        mousePressed = true;
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        mousePressed = false;
    }
});

// Pause when mouse leaves the canvas, resume when it enters
app.view.addEventListener('mouseenter', () => {
    gamePaused = false;
    backgrundMusic.play();
    arwingCollisionBox = true;
    if (pauseText && app.stage.children.includes(pauseText)) {
        app.stage.removeChild(pauseText);
    }
});
app.view.addEventListener('mouseleave', () => {
    gamePaused = true;
    backgrundMusic.pause();
    arwingCollisionBox = false;
    
app.stage.addChild(logo);
    if (pauseText && !app.stage.children.includes(pauseText)) {
        app.stage.addChild(pauseText);
    }
});

// score display
const scoreText = new PIXI.Text('Score: 0', {
    fontFamily: 'courier new',
    fontSize: 24,
    fill: 0xffffff,
    fontWeight: 'bold'
});
scoreText.x = app.view.width - 180;
scoreText.y = 10;
app.stage.addChild(scoreText);

// Current spawn speed display (left of score)
const speedText = new PIXI.Text('Spawnrate: ' + gameSpeed + 'ms', {
    fontFamily: 'courier new',
    fontSize: 24,
    fill: 0xffffff,
    fontWeight: 'bold'
});
speedText.anchor.set(1, 0);
speedText.x = scoreText.x - 100;
speedText.y = scoreText.y;
app.stage.addChild(speedText);

function updateSpeedText() {
    if (typeof speedText !== 'undefined') {
        speedText.text = 'Spawnrate: ' + gameSpeed + 'ms';
    }
}

// Pause overlay text (hidden until pause)
pauseText = new PIXI.Text('Pause', {
    fontFamily: 'courier new',
    fontSize: 24,
    fill: 0xffffff,
    fontWeight: 'bold'
});
pauseText.anchor.set(0.5);
pauseText.x =  app.view.width / 2;
pauseText.y = scoreText.y + 40;
pauseText.alpha = 1;

// Blinking animation for pauseText
gameInterval(function() {
    if (pauseText && app.stage.children.includes(pauseText)) {
        pauseText.alpha = pauseText.alpha === 1 ? 0.3 : 1;
    }
}, 500);

// Game Over text
const gameOverText = new PIXI.Text('Game Over', {
    fontFamily: 'courier new',
    fontSize: 82,
    fill: 0xffffff,
    fontWeight: 'bold' 
});
gameOverText.x = app.view.width / 2;
gameOverText.y = app.view.height / 2;
gameOverText.anchor.set(0.5);


// ship spawning (uses accumulator so spawn rate follows `gameSpeed` dynamically)
let _spawnTimer = 0;
gameInterval(function() {
    if (gamePaused) return;
    // accumulate time (GAMELOOPJS_SPEED is the ms per tick)
    _spawnTimer += GAMELOOPJS_SPEED;
    if (_spawnTimer < gameSpeed) return;
    _spawnTimer = 0;

    const ship = PIXI.Sprite.from('assets/ship' + random(1, 5) + '.png');
    ship.scale.set(0.07);
    ship.x = random(20, 680);
    ship.y = -25;
    app.stage.addChild(ship);
    shipList.push(ship);
    flyDown(ship, random(3, 6));

    waitForCollision(ship, arwing).then(function() {
        if (arwingCollisionBox) {
            backgrundMusic.pause();
            const explosionSound = new Audio('assets/sounds/explosionMaster.mp3');
            explosionSound.play();
            app.stage.removeChild(arwing);
            app.stage.addChild(gameOverText);
            // hide speed display on game over
            if (typeof speedText !== 'undefined' && app.stage.children.includes(speedText)) {
                app.stage.removeChild(speedText);
            }
            scoreText.x = app.view.width / 2 - 50;
            scoreText.y = app.view.height / 2 + 50;
            stopGame (); 
            const gameOverMusic = new Audio('assets/sounds/game-over.mp3');
            gameOverMusic.play();
        }
    });
}, GAMELOOPJS_SPEED);

// Arwing follwows mouse
gameInterval(function() {
    if (gamePaused) return;
    // Smooth movement towards mouse position
    const speed = 8;
    const dx = mouseX - arwing.x;
    const dy = mouseY - arwing.y;
    
    if (Math.abs(dx) > 0.5) arwing.x += dx * 0.15;
    if (Math.abs(dy) > 0.5) arwing.y += dy * 0.15;
    
    // playfield boundaries
    arwing.x = Math.max(20, Math.min(app.view.width - 20, arwing.x));
    arwing.y = Math.max(20, Math.min(app.view.height - 20, arwing.y));
}, GAMELOOPJS_SPEED);

// Background white particles falling from top to bottom
gameInterval(function() {
    if (gamePaused) return;
    const particle = new PIXI.Graphics();
    particle.beginFill(0xffffff);
    particle.drawCircle(0, 0, 2);
    particle.endFill();
    particle.x = random(0, app.view.width);
    particle.y = -10;
    app.stage.addChild(particle);

    // small random speed
    const speed = Math.random() * 2 + 0.5; // 0.5 - 2.5
    flyDown(particle, speed, 2000);

    // remove after 4s to avoid stage growth
    setTimeout(() => {
        if (app.stage.children.includes(particle)) {
            app.stage.removeChild(particle);
        }
    }, 4000);

}, 150);

// Laser with Mouse click
let lastLaserTime = 0;
let nextLaser = 1;


gameInterval(function() {
    // If a pause flag exists, respect it
    if (typeof gamePaused !== 'undefined' && gamePaused) return;

    if (mousePressed && Date.now() - lastLaserTime > 200) {
        const laserSound = new Audio('assets/sounds/laser' + random(1, 2) + '.mp3');
        laserSound.play();

        const laser = PIXI.Sprite.from('assets/laser.png');
        laser.scale.set(0.03);

        // Use the active arwing sprite)
        if (typeof arwing !== 'undefined') {
            laser.y = arwing.y - 24;
            if (nextLaser === 1) {
                laser.x = arwing.x - 22;
            } else {
                laser.x = arwing.x;
            }
        } else {
            // fallback to center
            laser.x = app.view.width / 2;
            laser.y = app.view.height / 2;
        }

        app.stage.addChild(laser);
        flyUp(laser, 5);

        waitForCollision(laser, shipList).then(([laser, ship]) => {
            // remove the laser if it's still on stage
            if (app.stage.children.includes(laser)) {
                app.stage.removeChild(laser);
            }

            // create a dedicated explosion sprite for this collision
            const explosionSound = new Audio('assets/sounds/explosion' + random(1, 3) + '.mp3');
            explosionSound.play();
            const explosionSprite = PIXI.Sprite.from('assets/explosion.png');
            explosionSprite.scale.set(0.08);
            explosionSprite.x = ship.x;
            explosionSprite.y = ship.y;
            app.stage.addChild(explosionSprite);

            // remove the ship immediately
            if (app.stage.children.includes(ship)) {
                app.stage.removeChild(ship);
            }

            // keep explosion visible for 500ms then remove
            setTimeout(() => {
                if (app.stage.children.includes(explosionSprite)) {
                    app.stage.removeChild(explosionSprite);
                }
            }, 150);

            // update score
            score++;
            scoreText.text = 'Score: ' + score;
        });

        // toggle laser position for visual variation
        nextLaser = nextLaser === 1 ? 2 : 1;
        lastLaserTime = Date.now();
    }
}, GAMELOOPJS_SPEED);
