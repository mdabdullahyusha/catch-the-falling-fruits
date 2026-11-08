// =========================================================
// level.js - levels, difficulty, progress bar, "LEVEL UP!"
// =========================================================

// ---------- 1. Settings ----------
const POINTS_PER_LEVEL = 100;

// Falling speed is written in "pixels per frame" (at 60 frames per
// second), because those numbers are easy to read: 2.0, 2.5, 3.0...
// The game moves things in pixels per SECOND, so we multiply by 60.
const FRAMES_PER_SECOND = 60;
const START_SPEED = 2.0;            // level 1
const SPEED_STEP_EARLY = 0.5;       // added per level for levels 2-5
const SPEED_STEP_LATE = 0.25;       // added per level after level 5
const MAX_SPEED = 5.0;              // never faster than this

// Spawn interval in milliseconds
const START_SPAWN_INTERVAL = 1400;  // level 1
const SPAWN_INTERVAL_STEP = 100;    // 100 ms shorter each level
const MIN_SPAWN_INTERVAL = 900;     // never shorter than this

// Bomb spawn probability (0.10 = 10% of spawned objects are bombs)
const BASE_BOMB_CHANCE = 0.10;      // level 1
const BOMB_CHANCE_STEP = 0.03;      // 3% more each level
const MAX_BOMB_CHANCE = 0.25;       // never more than 25%


// ---------- 2. State ----------
let level = 1;

// Page elements
const levelNumberElement = document.getElementById("level-number");
const progressBarElement = document.getElementById("progress-bar");
const progressFillElement = document.getElementById("progress-fill");
const progressPointsElement = document.getElementById("progress-points");
const pointsRemainingElement = document.getElementById("points-remaining");
const levelUpElement = document.getElementById("level-up");
const levelUpNumberElement = document.getElementById("level-up-number");


// ---------- 3. Level rules ----------

// 0-99 points = level 1, 100-199 = level 2, 200-299 = level 3, ...
function calculateLevel(score) {
    return Math.floor(score / POINTS_PER_LEVEL) + 1;
}

// Chance that a spawned object is a bomb, for a level.
// 10%, 13%, 16%, 19%, 22%, then 25% from level 6 on.
// (The chance is checked when an object SPAWNS, so a level-up only
// affects new objects - just like falling speed.)
function getBombChance(level) {
    const chance = BASE_BOMB_CHANCE + (level - 1) * BOMB_CHANCE_STEP;
    return Math.min(chance, MAX_BOMB_CHANCE);
}

// Falling speed for a level, in pixels per frame.
// 2.0, 2.5, 3.0, 3.5, 4.0, then 4.25, 4.5, 4.75, 5.0 and it stops there.
function getFallSpeed(level) {
    let speed;

    if (level <= 5) {
        speed = START_SPEED + (level - 1) * SPEED_STEP_EARLY;
    } else {
        const speedAtLevel5 = START_SPEED + 4 * SPEED_STEP_EARLY;   // 4.0
        speed = speedAtLevel5 + (level - 5) * SPEED_STEP_LATE;
    }

    return Math.min(speed, MAX_SPEED);
}

// Time between spawns for a level, in milliseconds.
// 1400, 1300, 1200, 1100, 1000, 900 and it stops there.
function getSpawnInterval(level) {
    const interval = START_SPAWN_INTERVAL - (level - 1) * SPAWN_INTERVAL_STEP;
    return Math.max(interval, MIN_SPAWN_INTERVAL);
}


// ---------- 4. Update (called every time the score changes) ----------
function updateLevel() {
    const newLevel = calculateLevel(score);

    if (newLevel > level) {
        level = newLevel;
        showLevelUpNotification();
        playSound("levelUp");

        // If the spawn countdown is longer than the new (shorter)
        // interval, shorten it so the new pace starts right away.
        const newIntervalInSeconds = getSpawnInterval(level) / 1000;
        if (timeUntilNextSpawn > newIntervalInSeconds) {
            timeUntilNextSpawn = newIntervalInSeconds;
        }
    }

    updateLevelDisplay();
}


// ---------- 5. Level indicator + progress bar ----------
function updateLevelDisplay() {
    // Points earned inside the current level: 160 points -> 60
    // (% gives the remainder after dividing by 100)
    const pointsIntoLevel = score % POINTS_PER_LEVEL;
    const pointsRemaining = POINTS_PER_LEVEL - pointsIntoLevel;
    const percent = (pointsIntoLevel / POINTS_PER_LEVEL) * 100;

    levelNumberElement.textContent = level;
    progressPointsElement.textContent = pointsIntoLevel;
    pointsRemainingElement.textContent = pointsRemaining;

    // The CSS transition on "width" makes this change animate smoothly
    progressFillElement.style.width = percent + "%";
    progressBarElement.setAttribute("aria-valuenow", pointsIntoLevel);
}


// ---------- 6. "LEVEL UP!" notification ----------
function showLevelUpNotification() {
    levelUpNumberElement.textContent = level;

    // To replay the CSS animation we remove the class, force the
    // browser to notice (reading offsetWidth does that), and add it again.
    levelUpElement.hidden = false;
    levelUpElement.classList.remove("level-up-show");
    void levelUpElement.offsetWidth;
    levelUpElement.classList.add("level-up-show");
}

// When the 1.5 second CSS animation finishes, hide the notification.
// (No setTimeout needed - the animation itself is the timer.)
levelUpElement.addEventListener("animationend", function () {
    levelUpElement.classList.remove("level-up-show");
    levelUpElement.hidden = true;
});


// ---------- 7. Reset (used when restarting) ----------
function resetLevel() {
    level = 1;
    updateLevelDisplay();

    levelUpElement.classList.remove("level-up-show");
    levelUpElement.hidden = true;
}


// Show level 1 and an empty bar when the page loads
updateLevelDisplay();
