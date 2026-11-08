// Catch the Falling Fruits - main game script
// Canvas setup, game states (start / pause / game over / restart),
// and the one animation loop.
// (basket.js = basket, fruits.js = fruits + bombs, lives.js = lives,
//  collision.js = catching, score.js = score + best score + "+10" texts,
//  level.js = levels, difficulty, progress bar, "LEVEL UP!",
//  sound.js = sound effects, effects.js = pops, sparkles, wobble)

// ---------- Canvas setup ----------
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// ---------- Page elements ----------
const gameOverPanel = document.getElementById("game-over-panel");
const finalScoreElement = document.getElementById("final-score");
const finalBestScoreElement = document.getElementById("final-best-score");
const newBestElement = document.getElementById("new-best");
const playAgainButton = document.getElementById("play-again-btn");
const startButton = document.getElementById("start-btn");
const pauseButton = document.getElementById("pause-btn");
const restartButton = document.getElementById("restart-btn");

// ---------- Game state ----------
// "ready"    - before the first game, waiting for Start
// "playing"  - the game is running
// "paused"   - frozen, waiting for Resume
// "gameover" - frozen, Game Over panel is showing
// Only "playing" lets things move, spawn and collide.
let gameState = "ready";

// The best score when this game began - used for "New Best Score!"
let bestScoreAtStart = bestScore;

// Put the basket in its starting spot and turn on its controls
initBasket(canvas);
setupBasketControls(canvas);


// ---------- Buttons follow the state ----------
// Start only works before the first game; Pause only while a game is on.
function updateControlButtons() {
    startButton.disabled = gameState !== "ready";
    pauseButton.disabled = gameState !== "playing" && gameState !== "paused";

    if (gameState === "paused") {
        pauseButton.textContent = "▶ Resume";
    } else {
        pauseButton.textContent = "⏸ Pause";
    }
}


// ---------- Start / Restart ----------
// Resets everything except the best score and starts playing.
// The animation loop is NOT restarted - the one loop keeps running.
function restartGame() {
    resetScore();
    resetLevel();                   // back to level 1 (best score untouched)
    resetLives();
    resetFallingObjects();          // removes all fruits + bombs, resets spawn timer
    floatingScores.length = 0;      // clear any "+10" texts
    resetEffects();                 // clear pops, sparkles, wobble
    initBasket(canvas);

    bestScoreAtStart = bestScore;
    gameState = "playing";
    gameOverPanel.hidden = true;
    updateControlButtons();
}


// ---------- Pause / Resume ----------
function pauseGame() {
    if (gameState === "playing") {
        gameState = "paused";
        updateControlButtons();
    }
}

function resumeGame() {
    if (gameState === "paused") {
        gameState = "playing";
        updateControlButtons();
    }
}

function togglePause() {
    if (gameState === "playing") {
        pauseGame();
    } else if (gameState === "paused") {
        resumeGame();
    }
}


// ---------- Game over ----------
function endGame() {
    gameState = "gameover";
    updateControlButtons();

    // Fill in the panel and show it
    finalScoreElement.textContent = score;
    finalBestScoreElement.textContent = bestScore;
    newBestElement.hidden = !(score > bestScoreAtStart);
    gameOverPanel.hidden = false;

    // Play after the bomb sound has had a moment
    playSound("gameOver", 0.25);

    // Let keyboard players press Enter/Space to play again
    playAgainButton.focus();
}


// ---------- Event listeners (added once, never duplicated) ----------
startButton.addEventListener("click", restartGame);
restartButton.addEventListener("click", restartGame);
playAgainButton.addEventListener("click", restartGame);
pauseButton.addEventListener("click", togglePause);

// Keyboard shortcut: P pauses / resumes
document.addEventListener("keydown", function (event) {
    if (event.key === "p" || event.key === "P") {
        togglePause();
    }
});

// Switching tabs or minimizing the window pauses the game,
// so the player never loses lives while they're away.
// They come back to a "Paused" screen and press Resume when ready.
document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
        pauseGame();
    }
});

updateControlButtons();


// ---------- Update: change positions ----------
function update(deltaTime) {
    // Only a running game moves. Ready, paused and game over are frozen.
    if (gameState !== "playing") {
        return;
    }

    updateBasket(canvas, deltaTime);
    updateFallingObjects(canvas, deltaTime);
    checkFruitCatches();
    updateFloatingScores(deltaTime);
    updateEffects(deltaTime);
}


// ---------- Draw: paint the current frame ----------

// A see-through layer with a big title and a smaller hint below it
function drawMessage(title, hint) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#243b53";
    ctx.font = "900 44px Nunito, Arial, sans-serif";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 24);
    ctx.font = "700 22px Nunito, Arial, sans-serif";
    ctx.fillText(hint, canvas.width / 2, canvas.height / 2 + 24);
    ctx.restore();
}

function draw() {
    // Wipe the previous frame (the light blue comes from CSS)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fruits and bombs first, then the basket on top
    drawFallingObjects(ctx);

    // The basket wobbles a little after catching a bomb
    const wobble = getBasketWobbleOffset();
    ctx.save();
    ctx.translate(wobble, 0);
    drawBasket(ctx);
    ctx.restore();

    // Effects and "+10" texts on top of everything
    drawEffects(ctx);
    drawFloatingScore(ctx);

    if (gameState === "ready") {
        drawMessage("Press Start Game to play!", "Move with ← → or A / D, or drag the basket");
    } else if (gameState === "paused") {
        drawMessage("⏸ Paused", "Press Resume or P to keep playing");
    }
}


// ---------- Game loop ----------
// requestAnimationFrame calls gameLoop about 60 times per second.
// There is only ONE loop: it is started once at the bottom of this file
// and keeps running. Browsers stop calling it while the tab is hidden,
// which saves battery; the game is paused then anyway.
let lastTime = 0;

function gameLoop(currentTime) {
    // Seconds since the last frame (capped so coming back to the
    // tab can never make things jump forward)
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// Start the loop once
requestAnimationFrame(function (startTime) {
    lastTime = startTime;
    gameLoop(startTime);
});
