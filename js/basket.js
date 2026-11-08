// =========================================================
// basket.js - everything about the player's basket
// (its data, how it moves, how it is drawn, and its controls)
// =========================================================

// ---------- 1. The basket object ----------
// All sizes are in canvas pixels (the canvas is 800 x 500).
const basket = {
    x: 0,          // left edge (set properly in initBasket)
    y: 0,          // top edge  (set properly in initBasket)
    width: 120,
    height: 70,
    speed: 480,    // keyboard speed in pixels per SECOND

    // Where the mouse/finger wants the basket to be (null = not dragging)
    targetX: null
};

// Which movement keys are being held down right now
const keys = {
    left: false,
    right: false
};

// Is the mouse button / finger currently pressed on the canvas?
let isDragging = false;


// ---------- 2. Starting position ----------
// Puts the basket in the middle, near the bottom of the canvas.
// Also used when restarting the game.
function initBasket(canvas) {
    basket.x = (canvas.width - basket.width) / 2;
    basket.y = canvas.height - basket.height - 15;
    basket.targetX = null;   // forget any old mouse/touch target
}


// ---------- 3. Update (movement + boundaries) ----------
// Called once per frame. "deltaTime" is the time since the last
// frame in seconds, so movement is the same speed on every screen.
function updateBasket(canvas, deltaTime) {

    // a) Keyboard movement
    if (keys.left) {
        basket.x -= basket.speed * deltaTime;
        basket.targetX = null;   // keyboard takes over from the mouse
    }
    if (keys.right) {
        basket.x += basket.speed * deltaTime;
        basket.targetX = null;
    }

    // b) Mouse / touch movement:
    // move a part of the way toward the target each frame.
    // This "easing" makes the basket glide instead of jumping.
    if (basket.targetX !== null) {
        const distance = basket.targetX - basket.x;
        basket.x += distance * 0.3;
    }

    // c) Boundary detection: never leave the canvas
    const maxX = canvas.width - basket.width;

    if (basket.x < 0) {
        basket.x = 0;
    }
    if (basket.x > maxX) {
        basket.x = maxX;
    }

    // Always stay near the bottom (only x ever changes)
    basket.y = canvas.height - basket.height - 15;
}


// ---------- 4. Draw ----------
// Draws a cartoon basket using only canvas shapes.
function drawBasket(ctx) {
    const x = basket.x;
    const y = basket.y;
    const w = basket.width;
    const h = basket.height;

    const rimHeight = 16;
    const bodyTop = y + rimHeight / 2;
    const inset = 12;   // how much narrower the bottom is than the top

    ctx.save();

    // a) Soft shadow on the "ground"
    ctx.fillStyle = "rgba(36, 59, 83, 0.15)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 6, w / 2.2, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // b) Basket body: a trapezoid (wider at the top)
    // (a small helper, because we need this shape twice: to fill and to outline)
    function traceBody() {
        ctx.beginPath();
        ctx.moveTo(x + 4, bodyTop);
        ctx.lineTo(x + w - 4, bodyTop);
        ctx.lineTo(x + w - inset, y + h);
        ctx.lineTo(x + inset, y + h);
        ctx.closePath();
    }

    traceBody();
    ctx.fillStyle = "#f4a940";
    ctx.fill();

    // c) Woven pattern, clipped so it stays inside the body
    ctx.save();
    ctx.clip();

    // horizontal bands
    ctx.fillStyle = "#e08e2b";
    for (let bandY = bodyTop + 10; bandY < y + h; bandY += 16) {
        ctx.fillRect(x, bandY, w, 7);
    }

    // vertical strips
    ctx.strokeStyle = "#c9761f";
    ctx.lineWidth = 3;
    for (let stripX = x + 18; stripX < x + w; stripX += 20) {
        ctx.beginPath();
        ctx.moveTo(stripX, bodyTop);
        ctx.lineTo(stripX, y + h);
        ctx.stroke();
    }
    ctx.restore();

    // d) Dark outline around the body
    // Trace the body shape again first - otherwise stroke() would draw
    // the last weave strip, which showed as a stray line on the right.
    traceBody();
    ctx.strokeStyle = "#a85f16";
    ctx.lineWidth = 3;
    ctx.stroke();

    // e) Rounded rim on top
    ctx.beginPath();
    ctx.roundRect(x, y, w, rimHeight, 8);
    ctx.fillStyle = "#ff9f43";
    ctx.fill();
    ctx.strokeStyle = "#a85f16";
    ctx.stroke();

    // f) Little shine on the rim
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 4, w * 0.35, 4, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fill();

    // g) A cute red bow on the front
    const bowX = x + w / 2;
    const bowY = bodyTop + 18;
    ctx.fillStyle = "#ff5c7a";
    ctx.beginPath();
    ctx.ellipse(bowX - 9, bowY, 9, 6, -0.4, 0, Math.PI * 2);
    ctx.ellipse(bowX + 9, bowY, 9, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bowX, bowY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#e0435f";
    ctx.fill();

    ctx.restore();
}


// ---------- 5. Controls ----------

// Converts a mouse/touch position on the screen into canvas pixels.
// The canvas is drawn at 800px wide, but CSS may show it smaller,
// so we scale the position by (real width / shown width).
function getCanvasX(canvas, clientX) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    return (clientX - rect.left) * scaleX;
}

// Sets the target so the basket's CENTER follows the pointer.
function moveBasketToPointer(canvas, clientX) {
    const pointerX = getCanvasX(canvas, clientX);
    basket.targetX = pointerX - basket.width / 2;
}

function setupBasketControls(canvas) {

    // --- Keyboard ---
    document.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
            keys.left = true;
        }
        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
            keys.right = true;
        }

        // Stop the arrow keys from scrolling the page
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
        }
    });

    document.addEventListener("keyup", function (event) {
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
            keys.left = false;
        }
        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
            keys.right = false;
        }
    });

    // If the window loses focus while a key is held, the "keyup"
    // never arrives - so release all keys to stop the basket.
    window.addEventListener("blur", function () {
        keys.left = false;
        keys.right = false;
    });

    // --- Mouse + touch (Pointer Events handle both) ---
    canvas.addEventListener("pointerdown", function (event) {
        isDragging = true;
        // Keep receiving moves even if the pointer leaves the canvas
        canvas.setPointerCapture(event.pointerId);
        moveBasketToPointer(canvas, event.clientX);
    });

    canvas.addEventListener("pointermove", function (event) {
        if (isDragging) {
            moveBasketToPointer(canvas, event.clientX);
        }
    });

    function stopDragging() {
        isDragging = false;
    }
    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);
}
