// =========================================================
// fruits.js - creating, moving, drawing and removing
// falling objects (fruits AND bombs)
// =========================================================

// ---------- 1. Settings ----------
const FRUIT_TYPES = ["🍎", "🍊", "🍌", "🍓"];  // apple, orange, banana, strawberry
const BOMB_TYPE = "💣";
// How often bombs appear depends on the level - see getBombChance() in level.js

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


// ---------- 3. Helper ----------
// Returns a random decimal number between min and max.
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}


// ---------- 4. Bomb or fruit? ----------
// The ONE place that decides whether the next object is a bomb.
// Roll the dice: Math.random() gives 0 up to 1, so it is below
// getBombChance(level) exactly that often - 10% at level 1, 13% at
// level 2 ... up to 25%. (A future Bonus Mode, where bombs must not
// spawn, only needs to add its check here.)
function shouldSpawnBomb() {
    return Math.random() < getBombChance(level);
}


// ---------- 5. Create one falling object ----------
// Nothing limits how many bombs can be falling at once: each spawn
// rolls the dice on its own, so two or more bombs can be on screen.
function spawnObject(canvas) {
    let kind;
    let type;
    if (shouldSpawnBomb()) {
        kind = "bomb";
        type = BOMB_TYPE;
    } else {
        kind = "fruit";
        const randomIndex = Math.floor(Math.random() * FRUIT_TYPES.length);
        type = FRUIT_TYPES[randomIndex];
    }

    // x is the CENTER of the object, so keep half an object away
    // from each edge - that way it stays fully inside the canvas
    const halfSize = OBJECT_SIZE / 2;

    // Speed for the CURRENT level, with a little random variation so
    // objects don't all fall exactly together - but never above MAX_SPEED.
    // The speed is stored on the object, so it never changes after
    // spawning, even if the level goes up while it is falling.
    const levelSpeed = getFallSpeed(level);
    const variation = randomBetween(1 - SPEED_VARIATION, 1 + SPEED_VARIATION);
    const speedPerFrame = Math.min(levelSpeed * variation, MAX_SPEED);

    fallingObjects.push({
        kind: kind,     // "fruit" or "bomb"
        type: type,     // the emoji to draw
        x: randomBetween(halfSize, canvas.width - halfSize),
        y: -halfSize,   // start just above the top, so it slides in
        speed: speedPerFrame * FRAMES_PER_SECOND,   // pixels per second
        size: OBJECT_SIZE
    });
}


// ---------- 6. Update: spawn, fall, clean up ----------
function updateFallingObjects(canvas, deltaTime) {

    // a) Spawn timer: count down, and when it reaches 0 spawn
    //    an object and start the next wait for the current level
    //    (1400 ms at level 1, getting shorter - see level.js)
    timeUntilNextSpawn -= deltaTime;

    if (timeUntilNextSpawn <= 0) {
        spawnObject(canvas);
        timeUntilNextSpawn = getSpawnInterval(level) / 1000;   // ms -> seconds
    }

    // b) Move every object down
    for (const object of fallingObjects) {
        object.y += object.speed * deltaTime;
    }

    // c) Remove objects that are completely below the canvas.
    //    Missing something has no penalty - it just disappears.
    //    We loop BACKWARDS so removing an item doesn't skip the next one.
    for (let i = fallingObjects.length - 1; i >= 0; i--) {
        const object = fallingObjects[i];
        const topOfObject = object.y - object.size / 2;

        if (topOfObject > canvas.height) {
            fallingObjects.splice(i, 1);   // delete 1 item at position i
        }
    }
}


// ---------- 7. Reset (used when restarting) ----------
function resetFallingObjects() {
    fallingObjects.length = 0;              // empty the array
    timeUntilNextSpawn = FIRST_SPAWN_DELAY; // restart the spawn timer
}


// ---------- 8. Sprites (performance) ----------
// Drawing emoji text is slow for the browser. So we draw each emoji
// ONCE onto its own small hidden canvas (a "sprite"), and every frame
// we just copy that picture, which is much faster.
const SPRITE_SIZE = Math.ceil(OBJECT_SIZE * 1.25);   // a bit of room so emoji edges aren't cut off
const spriteCache = {};                              // emoji -> its sprite canvas

function getObjectSprite(type) {
    if (!spriteCache[type]) {
        const sprite = document.createElement("canvas");
        sprite.width = SPRITE_SIZE;
        sprite.height = SPRITE_SIZE;

        const spriteCtx = sprite.getContext("2d");
        // Emoji fonts for Windows, Mac and Android/Linux
        spriteCtx.font = OBJECT_SIZE + "px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";
        spriteCtx.textAlign = "center";
        spriteCtx.textBaseline = "middle";
        spriteCtx.fillText(type, SPRITE_SIZE / 2, SPRITE_SIZE / 2);

        spriteCache[type] = sprite;
    }
    return spriteCache[type];
}


// ---------- 9. Draw ----------
function drawFallingObjects(ctx) {
    const half = SPRITE_SIZE / 2;

    // Each sprite is centered around the object's (x, y) point
    for (const object of fallingObjects) {
        ctx.drawImage(getObjectSprite(object.type), object.x - half, object.y - half);
    }
}
