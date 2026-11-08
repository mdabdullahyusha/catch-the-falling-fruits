// =========================================================
// lives.js - the player's lives and the heart display
// =========================================================

const MAX_LIVES = 3;
const MISSES_PER_LIFE = 5;   // every 5 missed fruits cost 1 life

let lives = 3;
let missedFruits = 0;        // fruits missed since the last life lost to misses

// The three heart <span>s and their container in the status bar
const livesElement = document.querySelector(".hearts");
const heartElements = document.querySelectorAll(".heart");


// Changes lives by "change" (for example -1) and refreshes the hearts.
// Lives can never go below 0 or above MAX_LIVES.
function updateLives(change) {
    lives = lives + change;

    if (lives < 0) {
        lives = 0;
    }
    if (lives > MAX_LIVES) {
        lives = MAX_LIVES;
    }

    updateHeartDisplay();
}


// Shows a full heart for each life left, and a faded one for each lost life.
function updateHeartDisplay() {
    heartElements.forEach(function (heart, index) {
        // Heart number 0, 1, 2... is "lost" once index >= lives.
        // A lost heart changes SHAPE (filled -> outline), not just color.
        if (index < lives) {
            heart.classList.remove("heart-lost");
            heart.textContent = "❤";   // ❤ filled heart
        } else {
            heart.classList.add("heart-lost");
            heart.textContent = "♡";   // ♡ outline heart
        }
    });

    // For screen readers
    livesElement.setAttribute("aria-label", "Lives: " + lives);
}


// Counts one missed fruit. Returns true when this was the 5th miss,
// which means the player should lose a life - the counter then
// starts again from 0. (Taking the life away is done by the caller,
// with the same code a bomb uses - see loseLife() in collision.js.)
function registerMissedFruit() {
    missedFruits = missedFruits + 1;

    if (missedFruits >= MISSES_PER_LIFE) {
        missedFruits = 0;
        return true;
    }
    return false;
}


// Back to full lives and no misses (used when restarting)
function resetLives() {
    lives = MAX_LIVES;
    missedFruits = 0;
    updateHeartDisplay();
}
