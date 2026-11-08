// =========================================================
// effects.js - small visual effects
// - fruit "pop" (the caught fruit grows and fades)
// - a few sparkles
// - a soft ring + tiny basket wobble when a bomb is caught
// Every effect lives less than half a second and is then removed.
// =========================================================

const POP_DURATION = 0.3;        // seconds
const SPARKLE_DURATION = 0.45;
const RING_DURATION = 0.4;
const WOBBLE_DURATION = 0.3;

const SPARKLE_COUNT = 6;
const SPARKLE_COLORS = ["#ffd93d", "#ff9f43", "#ffffff", "#ff8fab"];

// People who turn off animations in their system get no wobble
const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const pops = [];       // { type, x, y, age }
const sparkles = [];   // { x, y, speedX, speedY, color, age }
const rings = [];      // { x, y, color, age }
let wobbleTimeLeft = 0;


// ---------- 1. Starting effects ----------
function spawnCatchEffect(object) {
    pops.push({ type: object.type, x: object.x, y: object.y, age: 0 });
    rings.push({ x: object.x, y: object.y, color: "#ffd93d", age: 0 });

    // Sparkles fly out in a circle, evenly spaced
    for (let i = 0; i < SPARKLE_COUNT; i++) {
        const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
        const speed = 120 + Math.random() * 60;
        sparkles.push({
            x: object.x,
            y: object.y,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
            age: 0
        });
    }
}

function spawnBombEffect(object) {
    rings.push({ x: object.x, y: object.y, color: "#e0435f", age: 0 });

    if (!reduceMotion) {
        wobbleTimeLeft = WOBBLE_DURATION;
    }
}


// ---------- 2. Update ----------
// Ages every effect and removes the finished ones.
// (Backwards loops, so removing doesn't skip anything.)
function updateEffects(deltaTime) {
    for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].age += deltaTime;
        if (pops[i].age >= POP_DURATION) pops.splice(i, 1);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].age += deltaTime;
        if (rings[i].age >= RING_DURATION) rings.splice(i, 1);
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.age += deltaTime;
        s.x += s.speedX * deltaTime;
        s.y += s.speedY * deltaTime;
        s.speedY += 300 * deltaTime;   // a little gravity
        if (s.age >= SPARKLE_DURATION) sparkles.splice(i, 1);
    }

    if (wobbleTimeLeft > 0) {
        wobbleTimeLeft = Math.max(0, wobbleTimeLeft - deltaTime);
    }
}

// How far (in pixels) to shift the basket sideways right now.
// A small side-to-side wiggle that fades out.
function getBasketWobbleOffset() {
    if (wobbleTimeLeft <= 0) {
        return 0;
    }
    const strength = wobbleTimeLeft / WOBBLE_DURATION;   // 1 -> 0
    return Math.sin(wobbleTimeLeft * 50) * 5 * strength;
}


// ---------- 3. Draw ----------
function drawEffects(ctx) {
    ctx.save();

    // Rings: grow and fade
    ctx.lineWidth = 4;
    for (const ring of rings) {
        const progress = ring.age / RING_DURATION;   // 0 -> 1
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = ring.color;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, 20 + progress * 30, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Pops: the caught fruit grows to 1.5x size and fades
    for (const pop of pops) {
        const progress = pop.age / POP_DURATION;
        const scale = 1 + progress * 0.5;
        const sprite = getObjectSprite(pop.type);
        const size = sprite.width * scale;
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(sprite, pop.x - size / 2, pop.y - size / 2, size, size);
    }

    // Sparkles: small dots that shrink and fade
    for (const s of sparkles) {
        const progress = s.age / SPARKLE_DURATION;
        ctx.globalAlpha = 1 - progress;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 5 * (1 - progress) + 1, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}


// ---------- 4. Reset (used when restarting) ----------
function resetEffects() {
    pops.length = 0;
    sparkles.length = 0;
    rings.length = 0;
    wobbleTimeLeft = 0;
}
