// =========================================================
// collision.js - checking what the basket caught, and what
// happens next: points for fruit, lost lives for bombs and
// for every 5 missed fruits
// =========================================================

const POINTS_PER_FRUIT = 10;

// ---------- 1. AABB collision test ----------
// Returns true if the object's box and the basket's box overlap.
// Works for fruits and bombs, since both have x, y and size.
function checkCollision(object, basket) {

    // The object's x and y are its CENTER, so turn them into a box
    const half = object.size / 2;
    const objectLeft   = object.x - half;
    const objectRight  = object.x + half;
    const objectTop    = object.y - half;
    const objectBottom = object.y + half;

    // The basket's x and y are already its TOP-LEFT corner
    const basketLeft   = basket.x;
    const basketRight  = basket.x + basket.width;
    const basketTop    = basket.y;
    const basketBottom = basket.y + basket.height;

    // The boxes overlap only if they overlap on BOTH axes
    return objectRight  > basketLeft  &&
           objectLeft   < basketRight &&
           objectBottom > basketTop   &&
           objectTop    < basketBottom;
}


// ---------- 2. Caught a fruit: +10 points ----------
// "index" is the object's position in the fallingObjects array.
function handleFruitCatch(index) {
    // Remove exactly this one fruit - it's gone now, so it
    // can never be caught (or counted) a second time
    const fruit = fallingObjects[index];
    fallingObjects.splice(index, 1);

    // A Golden Fruit is worth 50 in total, a normal fruit 10.
    // The same updateScore() also handles level-ups, best score
    // and FRUIT RAIN milestones - even when +50 crosses one.
    const points = fruit.golden ? GOLDEN_POINTS : POINTS_PER_FRUIT;
    updateScore(points);

    // Show "+10" (or a gold "+50") just above the middle of the basket
    const textColor = fruit.golden ? "#b7791f" : undefined;   // undefined = normal orange
    addFloatingScore("+" + points, basket.x + basket.width / 2, basket.y - 10, textColor);

    if (fruit.golden) {
        spawnCatchEffect(fruit, true);   // bigger, golden sparkle burst
        playSound("golden");
    } else {
        spawnCatchEffect(fruit);         // pop + sparkles
        playSound("catch");
    }
}


// ---------- 3. Losing a life (shared by bombs and missed fruits) ----------
// Takes one life, shows "message" above the basket, plays the bomb
// sound, and ends the game when no lives are left.
function loseLife(message) {
    updateLives(-1);

    // Feedback that doesn't rely on color alone: words + a sound
    // (plus the heart turning into an outline)
    addFloatingScore(message, basket.x + basket.width / 2, basket.y - 10, "#e0435f");
    playSound("bomb");

    if (lives <= 0) {
        endGame();
    }
}


// ---------- 4. Caught a bomb: -1 life ----------
function handleBombCollision(index) {
    // Remove the bomb first so it can only ever cost ONE life
    const bomb = fallingObjects[index];
    fallingObjects.splice(index, 1);

    // An active Shield absorbs this ONE bomb: no life lost, the
    // shield breaks instead (see shield.js). A second bomb in the
    // same frame finds no shield and is handled normally below.
    if (isShieldActive) {
        breakShield();
        return;
    }

    // A ring and a small basket wobble, then the shared life loss
    spawnBombEffect(bomb);
    loseLife("-1 life");
}


// ---------- 4b. Caught a power-up (Shield or Magnet) ----------
// No points - each type switches on its own power (see shield.js / magnet.js)
function handlePowerUpCatch(index) {
    const powerUp = fallingObjects[index];
    fallingObjects.splice(index, 1);

    if (powerUp.type === SHIELD_TYPE) {
        collectShield(powerUp);
    } else if (powerUp.type === MAGNET_TYPE) {
        collectMagnet(powerUp);
    }
}


// ---------- 5. Missed a fruit: every 5th miss costs a life ----------
// Called by fruits.js when a FRUIT falls off the bottom of the canvas.
// (Missed bombs are never reported - missing a bomb is good!)
function handleMissedFruit() {
    // Only count misses in a running game. This also stops extra
    // misses from counting in the same frame the game just ended.
    if (gameState !== "playing") {
        return;
    }

    if (registerMissedFruit()) {
        loseLife(MISSES_PER_LIFE + " missed: -1 life");
    }
}


// ---------- 6. Check every object, once per frame ----------
function checkFruitCatches() {
    // Loop backwards so removing an object doesn't skip the next one
    for (let i = fallingObjects.length - 1; i >= 0; i--) {

        // If the last bomb just ended the game, stop checking -
        // nothing else may change the score or lives
        if (gameState !== "playing") {
            return;
        }

        const object = fallingObjects[i];

        if (checkCollision(object, basket)) {
            if (object.kind === "bomb") {
                handleBombCollision(i);
            } else if (object.kind === "powerup") {
                handlePowerUpCatch(i);
            } else {
                handleFruitCatch(i);
            }
        }
    }
}
