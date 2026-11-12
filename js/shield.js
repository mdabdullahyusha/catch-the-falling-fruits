// =========================================================
// shield.js - the Shield Power-up
// A 🛡️ falls now and then. Catch it and a blue bubble protects
// the basket: the next bomb you catch costs NO life - the
// shield breaks instead. One shield at a time, no stacking.
// =========================================================

// ---------- 1. Settings ----------
const SHIELD_TYPE = "shield";          // its own sprite-cache key
const SHIELD_FIRST_DELAY = 20;         // seconds of game time before the first Shield
const SHIELD_MIN_INTERVAL = 25;        // then a new one every 25-35 seconds
const SHIELD_MAX_INTERVAL = 35;
const SHIELD_RETRY_DELAY = 3;          // try again soon if one couldn't spawn yet
const SHIELD_GLOW_SIZE = 100;
const SHIELD_TEXT_COLOR = "#1d4ed8";   // blue for "Shield on!" / "Shield saved you!"

// Messages for screen readers (read once each)
const SHIELD_ON_MESSAGE = "Shield on! The next bomb you catch won't cost a life.";
const SHIELD_BROKE_MESSAGE = "Shield broke! It saved you from a bomb.";


// ---------- 2. State ----------
let isShieldActive = false;
let timeUntilNextShield = SHIELD_FIRST_DELAY;
let shieldShimmerTime = 0;             // game time, for the bubble's gentle shimmer

// Page elements
const shieldBadgeElement = document.getElementById("shield-badge");
const shieldStatusElement = document.getElementById("shield-status");


// ---------- 3. Spawning (its OWN timer - separate from fruits and bombs) ----------
// Called once per frame from update() in game.js, only while playing,
// so pause and Game Over freeze this timer too.
function updateShield(canvas, deltaTime) {
    shieldShimmerTime += deltaTime;
    timeUntilNextShield -= deltaTime;

    if (timeUntilNextShield <= 0) {
        if (canSpawnShield()) {
            spawnPowerUp(canvas, SHIELD_TYPE);
            timeUntilNextShield = randomBetween(SHIELD_MIN_INTERVAL, SHIELD_MAX_INTERVAL);
        } else {
            timeUntilNextShield = SHIELD_RETRY_DELAY;
        }
    }
}

// No new Shield while one is already protecting you,
// or while a Shield Power-up is already falling
// (a falling MAGNET does not block it - the two are independent)
function canSpawnShield() {
    if (isShieldActive) {
        return false;
    }
    return !fallingObjects.some(function (object) {
        return object.kind === "powerup" && object.type === SHIELD_TYPE;
    });
}


// ---------- 4. Collecting a Shield ----------
// "powerUp" is the caught object (already removed from the array)
function collectShield(powerUp) {
    const textX = basket.x + basket.width / 2;
    const textY = basket.y - 10;

    // Already protected? Shields don't stack - no points, just a note
    if (isShieldActive) {
        addFloatingScore("Shield already on", textX, textY, SHIELD_TEXT_COLOR);
        return;
    }

    isShieldActive = true;
    shieldBadgeElement.hidden = false;
    shieldStatusElement.textContent = SHIELD_ON_MESSAGE;

    addFloatingScore("Shield on!", textX, textY, SHIELD_TEXT_COLOR);
    spawnShieldPickupEffect(powerUp);
    playSound("shieldUp");
}


// ---------- 5. A bomb hits the shield ----------
// Called by handleBombCollision() instead of losing a life.
// The shield is used up at once, so a SECOND bomb in the same
// frame finds no shield and costs a life as normal.
function breakShield() {
    isShieldActive = false;
    shieldBadgeElement.hidden = true;
    shieldStatusElement.textContent = SHIELD_BROKE_MESSAGE;

    const centerX = basket.x + basket.width / 2;
    const centerY = basket.y + basket.height / 2;
    spawnShieldBreakEffect(centerX, centerY);
    addFloatingScore("Shield saved you!", centerX, basket.y - 10, SHIELD_TEXT_COLOR);
    playSound("shieldBreak");
}


// ---------- 6. Reset (used when restarting) ----------
function resetShield() {
    isShieldActive = false;
    timeUntilNextShield = SHIELD_FIRST_DELAY;
    shieldShimmerTime = 0;
    shieldBadgeElement.hidden = true;
    shieldStatusElement.textContent = "";   // cleared quietly - nothing to announce
}


// ---------- 7. Drawing ----------
// Soft blue glow behind a falling Shield Power-up (drawn once, then reused)
function getShieldGlowSprite() {
    if (!spriteCache.shieldGlow) {
        const glow = document.createElement("canvas");
        glow.width = SHIELD_GLOW_SIZE;
        glow.height = SHIELD_GLOW_SIZE;

        const glowCtx = glow.getContext("2d");
        const center = SHIELD_GLOW_SIZE / 2;
        const gradient = glowCtx.createRadialGradient(center, center, 0, center, center, center);
        gradient.addColorStop(0, "rgba(96, 165, 250, 0.7)");
        gradient.addColorStop(0.5, "rgba(96, 165, 250, 0.3)");
        gradient.addColorStop(1, "rgba(96, 165, 250, 0)");
        glowCtx.fillStyle = gradient;
        glowCtx.fillRect(0, 0, SHIELD_GLOW_SIZE, SHIELD_GLOW_SIZE);

        spriteCache.shieldGlow = glow;
    }
    return spriteCache.shieldGlow;
}

// How strong the bubble's edge is right now: a gentle shimmer,
// or steady for people who turn off animations in their system
function getShieldBubbleAlpha() {
    if (reduceMotion) {
        return 0.8;
    }
    return 0.7 + 0.2 * Math.sin(shieldShimmerTime * 4);
}

const SHIELD_BUBBLE_LINE = 3;          // thickness of the bubble's blue edge
const SHIELD_BUBBLE_MARGIN = SHIELD_BUBBLE_LINE / 2 + 1;   // keep the edge fully on the canvas

// Where the bubble goes and how big it is, so that the WHOLE bubble
// (including its edge line) always stays inside the canvas.
// - top: a little above the basket rim
// - bottom: just under the basket, but never past the canvas bottom
// - wide enough to cover the basket rim corners
// Near the left/right walls the bubble slides inward a little
// instead of being cut off.
function getShieldBubbleShape(canvasWidth, canvasHeight) {
    const top = basket.y - 18;
    const bottom = Math.min(basket.y + basket.height + 12, canvasHeight - SHIELD_BUBBLE_MARGIN);
    const radiusY = (bottom - top) / 2;
    const radiusX = basket.width * 0.67;

    const basketCenterX = basket.x + basket.width / 2;
    const minX = radiusX + SHIELD_BUBBLE_MARGIN;
    const maxX = canvasWidth - radiusX - SHIELD_BUBBLE_MARGIN;
    const centerX = Math.min(Math.max(basketCenterX, minX), maxX);

    return { centerX: centerX, centerY: top + radiusY, radiusX: radiusX, radiusY: radiusY };
}

// The see-through blue bubble over the basket (only while active).
// Drawn after the basket, inside the same wobble shift, so it moves with it.
function drawShieldBubble(ctx) {
    if (!isShieldActive) {
        return;
    }

    const shape = getShieldBubbleShape(ctx.canvas.width, ctx.canvas.height);
    const centerX = shape.centerX;
    const centerY = shape.centerY;
    const radiusX = shape.radiusX;
    const radiusY = shape.radiusY;

    ctx.save();

    // Light blue inside, so fruit behind it stays visible
    const fill = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radiusX);
    fill.addColorStop(0, "rgba(147, 197, 253, 0.10)");
    fill.addColorStop(1, "rgba(96, 165, 250, 0.30)");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue edge that shimmers
    ctx.globalAlpha = getShieldBubbleAlpha();
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = SHIELD_BUBBLE_LINE;
    ctx.stroke();

    // A small white shine, so it reads as a bubble
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX * 0.8, radiusY * 0.8, 0, Math.PI * 1.15, Math.PI * 1.45);
    ctx.stroke();

    ctx.restore();
}
