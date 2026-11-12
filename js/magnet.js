// =========================================================
// magnet.js - the Fruit Magnet power-up
// A 🧲 falls now and then. Catch it and for 5 seconds nearby
// fruits (Golden Fruit too) are pulled sideways toward the basket.
// Bombs and falling power-ups are NEVER pulled.
// =========================================================

// ---------- 1. Settings ----------
const MAGNET_TYPE = "magnet";          // its own sprite-cache key
const MAGNET_FIRST_DELAY = 35;         // seconds of game time before the first Magnet
const MAGNET_MIN_INTERVAL = 40;        // then a new one every 40-50 seconds
const MAGNET_MAX_INTERVAL = 50;
const MAGNET_RETRY_DELAY = 3;          // try again soon if one couldn't spawn yet
const MAGNET_DURATION = 5;             // seconds of GAME time (pausing stops the clock)

const MAGNET_RADIUS = 250;             // pulls fruit within 250 px of the basket center
const MAGNET_MAX_PULL = 360;           // fastest sideways pull, pixels per second
const MAGNET_MIN_STRENGTH = 0.4;       // 40% at the edge of the range, 100% up close

const MAGNET_GLOW_SIZE = 100;
const MAGNET_TEXT_COLOR = "#a21caf";   // magenta for "Magnet on!" / "Magnet off"

// Messages for screen readers (read once each)
const MAGNET_ON_MESSAGE = "Magnet on for 5 seconds! Nearby fruit is pulled toward your basket.";
const MAGNET_OFF_MESSAGE = "Magnet off.";


// ---------- 2. State ----------
let isMagnetActive = false;
let magnetTimeLeft = 0;                // seconds left while active
let timeUntilNextMagnet = MAGNET_FIRST_DELAY;
let magnetLineTime = 0;                // game time, for the moving dashes on the pull lines
let shownMagnetSeconds = 0;            // the number currently in the badge
let shownMagnetProgress = -1;          // the ring value currently shown (0-100)
const pulledFruits = [];               // fruits pulled this frame (for drawing the lines)

// Page elements
const magnetBadgeElement = document.getElementById("magnet-badge");
const magnetSecondsElement = document.getElementById("magnet-seconds");
const magnetStatusElement = document.getElementById("magnet-status");


// ---------- 3. Spawning + countdown (its OWN timer) ----------
// Called once per frame from update() in game.js, only while playing,
// so pause, a hidden tab and Game Over freeze both timers.
function updateMagnet(canvas, deltaTime) {
    // a) Spawn timer - separate from fruits, bombs and the Shield
    timeUntilNextMagnet -= deltaTime;
    if (timeUntilNextMagnet <= 0) {
        if (canSpawnMagnet()) {
            spawnPowerUp(canvas, MAGNET_TYPE);
            timeUntilNextMagnet = randomBetween(MAGNET_MIN_INTERVAL, MAGNET_MAX_INTERVAL);
        } else {
            timeUntilNextMagnet = MAGNET_RETRY_DELAY;
        }
    }

    // b) Countdown while active
    if (isMagnetActive) {
        magnetLineTime += deltaTime;
        magnetTimeLeft -= deltaTime;
        if (magnetTimeLeft <= 0) {
            expireMagnet();
        } else {
            updateMagnetBadge();
        }
    }
}

// No new Magnet while one is active, or while a Magnet is already falling
// (a falling SHIELD does not block it - the two are independent)
function canSpawnMagnet() {
    if (isMagnetActive) {
        return false;
    }
    return !fallingObjects.some(function (object) {
        return object.kind === "powerup" && object.type === MAGNET_TYPE;
    });
}


// ---------- 4. The pull ----------
// Called from update() AFTER objects have fallen and BEFORE catches are
// checked. Only moves fruit SIDEWAYS (x) - falling speed never changes.
function applyMagnetPull(canvas, deltaTime) {
    pulledFruits.length = 0;
    if (!isMagnetActive) {
        return;
    }

    const centerX = basket.x + basket.width / 2;
    const centerY = basket.y + basket.height / 2;
    const basketBottom = basket.y + basket.height;

    for (const object of fallingObjects) {
        // Only fruit (normal and Golden) - never bombs or power-ups
        if (object.kind !== "fruit") {
            continue;
        }
        // Leave fruit that has already dropped past the basket
        if (object.y > basketBottom) {
            continue;
        }

        const dx = centerX - object.x;
        const dy = centerY - object.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > MAGNET_RADIUS) {
            continue;
        }

        // Stronger the closer it is: 40% at the edge, 100% up close
        const closeness = 1 - distance / MAGNET_RADIUS;
        const strength = MAGNET_MIN_STRENGTH + (1 - MAGNET_MIN_STRENGTH) * closeness;
        const step = MAGNET_MAX_PULL * strength * deltaTime;

        // Never overshoot the basket center
        const move = Math.sign(dx) * Math.min(step, Math.abs(dx));
        object.x += move;

        // ...and never leave the canvas
        const half = object.size / 2;
        object.x = Math.min(Math.max(object.x, half), canvas.width - half);

        pulledFruits.push(object);
    }
}


// ---------- 5. Collect / expire / reset ----------
// "powerUp" is the caught object (already removed from the array)
function collectMagnet(powerUp) {
    const textX = basket.x + basket.width / 2;
    const textY = basket.y - 10;

    magnetTimeLeft = MAGNET_DURATION;   // a new pickup always gives the full 5 seconds
    spawnMagnetPickupEffect(powerUp);

    // Already on? Just top the time back up to 5 s (no new announcement)
    if (isMagnetActive) {
        addFloatingScore("Magnet back to 5s", textX, textY, MAGNET_TEXT_COLOR);
        updateMagnetBadge();
        return;
    }

    isMagnetActive = true;
    magnetLineTime = 0;
    magnetBadgeElement.hidden = false;
    updateMagnetBadge();
    magnetStatusElement.textContent = MAGNET_ON_MESSAGE;

    addFloatingScore("Magnet on!", textX, textY, MAGNET_TEXT_COLOR);
    playSound("magnetOn");
}

function expireMagnet() {
    isMagnetActive = false;
    magnetTimeLeft = 0;
    pulledFruits.length = 0;
    hideMagnetBadge();
    magnetStatusElement.textContent = MAGNET_OFF_MESSAGE;

    spawnMagnetEndEffect(basket.x + basket.width / 2, basket.y + basket.height / 2);
    addFloatingScore("Magnet off", basket.x + basket.width / 2, basket.y - 10, MAGNET_TEXT_COLOR);
    playSound("magnetOff");
}

// New game: everything back to the start, quietly
function resetMagnet() {
    isMagnetActive = false;
    magnetTimeLeft = 0;
    timeUntilNextMagnet = MAGNET_FIRST_DELAY;
    magnetLineTime = 0;
    pulledFruits.length = 0;
    hideMagnetBadge();
    magnetStatusElement.textContent = "";
}


// ---------- 6. The badge (top-left corner of the Lives box) ----------
// A ring that empties over 5 s, and the seconds left in a little tab.
// The page is only touched when something visible changes.
function updateMagnetBadge() {
    const seconds = Math.max(1, Math.ceil(magnetTimeLeft));
    if (seconds !== shownMagnetSeconds) {
        shownMagnetSeconds = seconds;
        magnetSecondsElement.textContent = seconds;
        magnetBadgeElement.setAttribute("aria-label", "Magnet active, " + seconds + " seconds left");
    }

    // Ring: smooth (100 steps), or whole seconds only with reduced motion
    let progress;
    if (reduceMotion) {
        progress = Math.round((seconds / MAGNET_DURATION) * 100);
    } else {
        progress = Math.round((magnetTimeLeft / MAGNET_DURATION) * 100);
    }
    if (progress !== shownMagnetProgress) {
        shownMagnetProgress = progress;
        magnetBadgeElement.style.setProperty("--magnet-progress", progress / 100);
    }
}

function hideMagnetBadge() {
    magnetBadgeElement.hidden = true;
    shownMagnetSeconds = 0;
    shownMagnetProgress = -1;
}


// ---------- 7. Drawing ----------
// Soft magenta glow behind a falling Magnet (drawn once, then reused)
function getMagnetGlowSprite() {
    if (!spriteCache.magnetGlow) {
        const glow = document.createElement("canvas");
        glow.width = MAGNET_GLOW_SIZE;
        glow.height = MAGNET_GLOW_SIZE;

        const glowCtx = glow.getContext("2d");
        const center = MAGNET_GLOW_SIZE / 2;
        const gradient = glowCtx.createRadialGradient(center, center, 0, center, center, center);
        gradient.addColorStop(0, "rgba(232, 121, 249, 0.7)");
        gradient.addColorStop(0.5, "rgba(232, 121, 249, 0.3)");
        gradient.addColorStop(1, "rgba(232, 121, 249, 0)");
        glowCtx.fillStyle = gradient;
        glowCtx.fillRect(0, 0, MAGNET_GLOW_SIZE, MAGNET_GLOW_SIZE);

        spriteCache.magnetGlow = glow;
    }
    return spriteCache.magnetGlow;
}

// Thin magenta "pull lines" from the basket to each fruit being pulled.
// The dashes move along the line - or stay still with reduced motion.
function drawMagnetLines(ctx) {
    if (!isMagnetActive || pulledFruits.length === 0) {
        return;
    }

    const fromX = basket.x + basket.width / 2;
    const fromY = basket.y + 8;

    ctx.save();
    ctx.strokeStyle = "rgba(192, 38, 211, 0.45)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = reduceMotion ? 0 : -magnetLineTime * 40;

    for (const fruit of pulledFruits) {
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(fruit.x, fruit.y);
        ctx.stroke();
    }
    ctx.restore();
}
