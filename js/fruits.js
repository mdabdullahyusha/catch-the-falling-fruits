// =========================================================
// fruits.js - creating, moving, drawing and removing
// falling objects (fruits AND bombs)
// =========================================================

// ---------- 1. Settings ----------
const FRUIT_TYPES = ["🍎", "🍊", "🍌", "🍓"];  // apple, orange, banana, strawberry
const BOMB_TYPE = "💣";
// How often bombs appear depends on the level - see getBombChance() in level.js

// Golden Fruit: a rare, shiny golden apple worth 50 points
const GOLDEN_TYPE = "golden";        // its own sprite-cache key (NOT "🍎")
const GOLDEN_POINTS = 50;            // total points for catching one
const GOLDEN_CHANCE = 0.05;          // 5% of fruit spawns in normal play
const GOLDEN_CHANCE_BONUS = 0.15;    // 15% of fruit spawns during FRUIT RAIN

const OBJECT_SIZE = 48;        // fruits and bombs are drawn this big (canvas pixels)

// Speed and spawn timing depend on the level - see level.js
const SPEED_VARIATION = 0.1;    // each object is up to 10% slower/faster than the level speed
const FIRST_SPAWN_DELAY = 1.0;  // seconds before the first object of a game


// ---------- 2. State ----------
// Everything currently falling. Each object has a "kind":
// "fruit" or "bomb" - that's how we tell them apart.
const fallingObjects = [];

// Spawn timer: counts down (in seconds) to the next object
let timeUntilNextSpawn = FIRST_SPAWN_DELAY;

// Game time used to make the Golden Fruit's glow pulse.
// It only moves while the game is playing, so the glow freezes on pause.
let goldenPulseTime = 0;


// ---------- 3. Helper ----------
// Returns a random decimal number between min and max.
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}


// ---------- 4. Bomb or fruit? ----------
// The ONE place that decides whether the next object is a bomb.
// Roll the dice: Math.random() gives 0 up to 1, so it is below
// getBombChance(level) exactly that often - 10% at level 1, 13% at
// level 2 ... up to 25%. During "FRUIT RAIN!" bonus mode no bombs
// spawn at all (see bonus.js).
function shouldSpawnBomb() {
    if (isBonusActive) {
        return false;
    }
    return Math.random() < getBombChance(level);
}

// Golden or normal fruit? Only asked AFTER the bomb roll has
// decided "fruit", so the bomb chance is never affected.
// - never while a Golden Fruit is already on screen (max one)
// - 5% of fruits normally, 15% during FRUIT RAIN
function shouldSpawnGolden() {
    const goldenOnScreen = fallingObjects.some(function (object) {
        return object.golden;
    });
    if (goldenOnScreen) {
        return false;
    }

    const chance = isBonusActive ? GOLDEN_CHANCE_BONUS : GOLDEN_CHANCE;
    return Math.random() < chance;
}

// Seconds until the next spawn: 0.3 during bonus mode,
// otherwise the level's normal interval (1.4 s at level 1 ... 0.9 s)
function getCurrentSpawnInterval() {
    if (isBonusActive) {
        return BONUS_SPAWN_INTERVAL;
    }
    return getSpawnInterval(level) / 1000;   // ms -> seconds
}


// ---------- 5. Create one falling object ----------
// Nothing limits how many bombs can be falling at once: each spawn
// rolls the dice on its own, so two or more bombs can be on screen.
function spawnObject(canvas) {
    let kind;
    let type;
    let golden = false;
    if (shouldSpawnBomb()) {
        kind = "bomb";
        type = BOMB_TYPE;
    } else if (shouldSpawnGolden()) {
        // Still a "fruit": it is caught, missed and counted like any fruit
        kind = "fruit";
        type = GOLDEN_TYPE;
        golden = true;
    } else {
        kind = "fruit";
        const randomIndex = Math.floor(Math.random() * FRUIT_TYPES.length);
        type = FRUIT_TYPES[randomIndex];
    }

    // x is the CENTER of the object, so keep half an object away
    // from each edge - that way it stays fully inside the canvas
    const halfSize = OBJECT_SIZE / 2;
    const speed = getSpawnSpeed();

    fallingObjects.push({
        kind: kind,     // "fruit" or "bomb"
        type: type,     // the emoji to draw (or "golden")
        golden: golden, // true for a Golden Fruit (worth 50 points)
        x: randomBetween(halfSize, canvas.width - halfSize),
        y: -halfSize,   // start just above the top, so it slides in
        speed: speed,   // pixels per second
        size: OBJECT_SIZE,
        // Spawned during the bonus rain? Then missing it costs nothing.
        // (Fruits from before the bonus keep the normal miss rule.)
        fromBonus: isBonusActive
    });
}

// Speed for the CURRENT level, with a little random variation so
// objects don't all fall exactly together - but never above MAX_SPEED.
// The speed is stored on the object, so it never changes after
// spawning, even if the level goes up while it is falling.
// Returns pixels per second.
function getSpawnSpeed() {
    const levelSpeed = getFallSpeed(level);
    const variation = randomBetween(1 - SPEED_VARIATION, 1 + SPEED_VARIATION);
    const speedPerFrame = Math.min(levelSpeed * variation, MAX_SPEED);
    return speedPerFrame * FRAMES_PER_SECOND;
}

// A power-up (the Shield) - created by shield.js on its OWN timer,
// so it never takes a fruit/bomb spawn and never changes their chances.
// kind "powerup": not a fruit (missing it costs nothing) and not a bomb.
function spawnPowerUp(canvas, type) {
    const halfSize = OBJECT_SIZE / 2;
    const speed = getSpawnSpeed();

    fallingObjects.push({
        kind: "powerup",
        type: type,
        golden: false,
        x: randomBetween(halfSize, canvas.width - halfSize),
        y: -halfSize,
        speed: speed,
        size: OBJECT_SIZE,
        fromBonus: false
    });
}


// ---------- 6. Update: spawn, fall, clean up ----------
function updateFallingObjects(canvas, deltaTime) {

    // a) Spawn timer: count down, and when it reaches 0 spawn
    //    an object and start the next wait (normal level interval,
    //    or 0.3 s during bonus mode)
    timeUntilNextSpawn -= deltaTime;
    goldenPulseTime += deltaTime;

    if (timeUntilNextSpawn <= 0) {
        spawnObject(canvas);
        // "+=" keeps the little bit of time we went past 0, so the
        // average gap is exactly the interval (with "=" every gap
        // would round up to the next frame - about 5% slow at 0.3 s)
        timeUntilNextSpawn += getCurrentSpawnInterval();
    }

    // b) Move every object down
    for (const object of fallingObjects) {
        object.y += object.speed * deltaTime;
    }

    // c) Remove objects that are completely below the canvas.
    //    A missed FRUIT is counted (every 5th miss costs a life -
    //    see handleMissedFruit() in collision.js), except fruits from
    //    the bonus rain. A missed bomb has no penalty - it just disappears.
    //    We loop BACKWARDS so removing an item doesn't skip the next one.
    for (let i = fallingObjects.length - 1; i >= 0; i--) {
        const object = fallingObjects[i];
        const topOfObject = object.y - object.size / 2;

        if (topOfObject > canvas.height) {
            fallingObjects.splice(i, 1);   // delete 1 item at position i

            if (object.kind === "fruit" && !object.fromBonus) {
                handleMissedFruit();
            }
        }
    }
}


// ---------- 7. Reset (used when restarting) ----------
function resetFallingObjects() {
    fallingObjects.length = 0;              // empty the array (Golden Fruit too)
    timeUntilNextSpawn = FIRST_SPAWN_DELAY; // restart the spawn timer
    goldenPulseTime = 0;
}


// ---------- 8. Sprites (performance) ----------
// Drawing emoji text is slow for the browser. So we draw each emoji
// ONCE onto its own small hidden canvas (a "sprite"), and every frame
// we just copy that picture, which is much faster.
const SPRITE_SIZE = Math.ceil(OBJECT_SIZE * 1.25);   // a bit of room so emoji edges aren't cut off
const GLOW_SIZE = 100;                               // the Golden Fruit's glow is bigger
const spriteCache = {};                              // emoji (or "golden") -> its sprite canvas
const EMOJI_FONT = OBJECT_SIZE + "px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";

function getObjectSprite(type) {
    if (!spriteCache[type]) {
        if (type === GOLDEN_TYPE) {
            spriteCache[type] = createGoldenSprite();
        } else if (type === SHIELD_TYPE) {
            spriteCache[type] = createEmojiSprite("🛡️");   // own key "shield"
        } else {
            spriteCache[type] = createEmojiSprite(type);
        }
    }
    return spriteCache[type];
}

// A normal fruit or bomb: just the emoji
function createEmojiSprite(emoji) {
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;

    const spriteCtx = sprite.getContext("2d");
    spriteCtx.font = EMOJI_FONT;   // emoji fonts for Windows, Mac and Android/Linux
    spriteCtx.textAlign = "center";
    spriteCtx.textBaseline = "middle";
    spriteCtx.fillText(emoji, SPRITE_SIZE / 2, SPRITE_SIZE / 2);
    return sprite;
}

// The Golden Fruit: an apple painted gold, plus a white sparkle star.
// Drawn on its OWN canvas, so the normal apple sprite is never changed.
function createGoldenSprite() {
    const sprite = createEmojiSprite("🍎");
    const spriteCtx = sprite.getContext("2d");
    const size = SPRITE_SIZE;

    // "source-atop" paints only where the apple already is,
    // so the gold keeps the apple's shape
    // Bright yellow-gold, painted fully over the apple's shape, so it
    // can't be mistaken for the orange 🍊 (a deeper orange color).
    spriteCtx.globalCompositeOperation = "source-atop";
    const gold = spriteCtx.createLinearGradient(0, 0, size, size);
    gold.addColorStop(0, "#fff59a");
    gold.addColorStop(0.45, "#ffe600");
    gold.addColorStop(1, "#f5cc00");
    spriteCtx.fillStyle = gold;
    spriteCtx.fillRect(0, 0, size, size);

    // A soft white shine (top-left) and a gentle golden shadow
    // (bottom-right) keep it looking round instead of flat
    const shine = spriteCtx.createRadialGradient(size * 0.38, size * 0.42, 0, size * 0.38, size * 0.42, size * 0.28);
    shine.addColorStop(0, "rgba(255, 255, 255, 0.75)");
    shine.addColorStop(1, "rgba(255, 255, 255, 0)");
    spriteCtx.fillStyle = shine;
    spriteCtx.fillRect(0, 0, size, size);

    const shade = spriteCtx.createLinearGradient(size * 0.3, size * 0.3, size, size);
    shade.addColorStop(0, "rgba(205, 165, 0, 0)");
    shade.addColorStop(1, "rgba(205, 165, 0, 0.45)");
    spriteCtx.fillStyle = shade;
    spriteCtx.fillRect(0, 0, size, size);

    // A white 4-point sparkle in the top-right corner - a SHAPE that
    // marks it as special, not just its color
    spriteCtx.globalCompositeOperation = "source-over";
    spriteCtx.globalAlpha = 1;
    drawSparkleStar(spriteCtx, size * 0.76, size * 0.24, size * 0.17);
    return sprite;
}

function drawSparkleStar(context, x, y, radius) {
    const thin = radius * 0.28;
    context.beginPath();
    context.moveTo(x, y - radius);
    context.quadraticCurveTo(x + thin, y - thin, x + radius, y);
    context.quadraticCurveTo(x + thin, y + thin, x, y + radius);
    context.quadraticCurveTo(x - thin, y + thin, x - radius, y);
    context.quadraticCurveTo(x - thin, y - thin, x, y - radius);
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#c98a00";
    context.lineWidth = 1.5;
    context.fill();
    context.stroke();
}

// The soft golden glow behind a Golden Fruit (also drawn only once)
function getGoldenGlowSprite() {
    if (!spriteCache.goldenGlow) {
        const glow = document.createElement("canvas");
        glow.width = GLOW_SIZE;
        glow.height = GLOW_SIZE;

        const glowCtx = glow.getContext("2d");
        const center = GLOW_SIZE / 2;
        const gradient = glowCtx.createRadialGradient(center, center, 0, center, center, center);
        gradient.addColorStop(0, "rgba(255, 215, 0, 0.75)");
        gradient.addColorStop(0.5, "rgba(255, 200, 0, 0.35)");
        gradient.addColorStop(1, "rgba(255, 200, 0, 0)");
        glowCtx.fillStyle = gradient;
        glowCtx.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);

        spriteCache.goldenGlow = glow;
    }
    return spriteCache.goldenGlow;
}

// How strong the glow is right now: a gentle pulse between 0.55 and 1.
// People who turn off animations in their system get a steady glow.
function getGoldenGlowAlpha() {
    if (reduceMotion) {
        return 0.85;
    }
    return 0.775 + 0.225 * Math.sin(goldenPulseTime * 6);
}


// ---------- 9. Draw ----------
function drawFallingObjects(ctx) {
    const half = SPRITE_SIZE / 2;

    // Each sprite is centered around the object's (x, y) point
    for (const object of fallingObjects) {
        if (object.golden) {
            ctx.save();
            ctx.globalAlpha = getGoldenGlowAlpha();
            ctx.drawImage(getGoldenGlowSprite(), object.x - GLOW_SIZE / 2, object.y - GLOW_SIZE / 2);
            ctx.restore();
        } else if (object.kind === "powerup") {
            // Shield Power-up: a steady blue glow behind it (see shield.js)
            ctx.drawImage(getShieldGlowSprite(), object.x - SHIELD_GLOW_SIZE / 2, object.y - SHIELD_GLOW_SIZE / 2);
        }
        ctx.drawImage(getObjectSprite(object.type), object.x - half, object.y - half);
    }
}
