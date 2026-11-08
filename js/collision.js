// =========================================================
// collision.js - checking what the basket caught
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

    updateScore(POINTS_PER_FRUIT);

    // Show "+10" just above the middle of the basket
    addFloatingScore("+" + POINTS_PER_FRUIT, basket.x + basket.width / 2, basket.y - 10);

    spawnCatchEffect(fruit);   // pop + sparkles
    playSound("catch");
}


// ---------- 3. Caught a bomb: -1 life ----------
function handleBombCollision(index) {
    // Remove the bomb first so it can only ever cost ONE life
    const bomb = fallingObjects[index];
    fallingObjects.splice(index, 1);

    updateLives(-1);

    // Feedback that doesn't rely on color alone: a ring, a small
    // basket wobble, the words "-1 life", and a sound
    spawnBombEffect(bomb);
    addFloatingScore("-1 life", basket.x + basket.width / 2, basket.y - 10, "#e0435f");
    playSound("bomb");

    if (lives <= 0) {
        endGame();
    }
}


// ---------- 4. Check every object, once per frame ----------
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
            } else {
                handleFruitCatch(i);
            }
        }
    }
}
