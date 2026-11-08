// =========================================================
// score.js - the score number and the floating "+10" texts
// =========================================================

// ---------- 1. Score ----------
let score = 0;

// The <span>s in the scoreboard
const scoreElement = document.getElementById("current-score");
const bestScoreElement = document.getElementById("best-score");

// Adds points and updates the scoreboard.
// The page is only touched here, right when the score changes -
// never on every frame.
function updateScore(points) {
    score += points;
    scoreElement.textContent = score;

    // New record? Save it right away.
    if (score > bestScore) {
        bestScore = score;
        saveBestScore();
        bestScoreElement.textContent = bestScore;
    }

    // The score changed, so the level and progress bar may change too
    updateLevel();
}

// Back to 0 (used when restarting). The best score is NOT touched.
function resetScore() {
    score = 0;
    scoreElement.textContent = score;
}


// ---------- 2. Best score (saved in localStorage) ----------
// localStorage keeps small pieces of text in the browser,
// even after the page is refreshed or closed.
const BEST_SCORE_KEY = "catchTheFruitsBestScore";

let bestScore = loadBestScore();
bestScoreElement.textContent = bestScore;

function loadBestScore() {
    // try/catch: some browsers block storage (e.g. strict privacy
    // settings). Then we just start from 0 instead of crashing.
    try {
        const saved = localStorage.getItem(BEST_SCORE_KEY);   // text or null
        const number = parseInt(saved, 10);                   // text -> number
        if (Number.isNaN(number)) {
            return 0;   // nothing saved yet (or it wasn't a number)
        }
        return number;
    } catch (error) {
        return 0;
    }
}

function saveBestScore() {
    try {
        localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    } catch (error) {
        // Storage not available - the best score just won't be remembered
    }
}


// ---------- 3. Floating "+10" texts ----------
const FLOAT_DURATION = 0.8;   // how long each text lives, in seconds
const FLOAT_RISE_SPEED = 50;  // how fast it drifts up, pixels per second

const floatingScores = [];

// Creates a new floating text at (x, y). Orange unless a color is given.
function addFloatingScore(text, x, y, color = "#f08c00") {
    floatingScores.push({
        text: text,
        x: x,
        y: y,
        color: color,
        age: 0    // seconds since it appeared
    });
}

// Moves the texts up, ages them, and removes finished ones
function updateFloatingScores(deltaTime) {
    for (let i = floatingScores.length - 1; i >= 0; i--) {
        const item = floatingScores[i];

        item.age += deltaTime;
        item.y -= FLOAT_RISE_SPEED * deltaTime;

        if (item.age >= FLOAT_DURATION) {
            floatingScores.splice(i, 1);
        }
    }
}

function drawFloatingScore(ctx) {
    ctx.save();
    ctx.font = "900 28px Nunito, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#ffffff";
    ctx.lineJoin = "round";

    for (const item of floatingScores) {
        // Opacity goes from 1 (fully visible) down to 0 (invisible)
        ctx.globalAlpha = 1 - item.age / FLOAT_DURATION;
        ctx.fillStyle = item.color;

        ctx.strokeText(item.text, item.x, item.y);  // white outline
        ctx.fillText(item.text, item.x, item.y);    // colored text
    }

    ctx.restore();
}
