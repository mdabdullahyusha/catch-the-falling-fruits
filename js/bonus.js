// =========================================================
// bonus.js - "FRUIT RAIN!" bonus mode
// Every 500 points (500, 1000, 1500...) fruits rain down for
// 5 seconds: they spawn much faster and no bombs spawn.
// =========================================================

// ---------- 1. Settings ----------
const BONUS_MILESTONE = 500;        // a bonus every 500 points
const BONUS_DURATION = 5;           // seconds of GAME time (pausing stops the clock)
const BONUS_SPAWN_INTERVAL = 0.3;   // seconds between fruits during the rain
const BONUS_SOUND_DELAY = 0.45;     // seconds - plays after the level-up tune ends,
                                    // because every 500 points is also a level-up

// Messages for screen readers (read once at the start and once at the end)
const BONUS_START_MESSAGE = "Fruit Rain bonus started! Lots of fruit and no bombs for 5 seconds.";
const BONUS_END_MESSAGE = "Fruit Rain bonus finished.";


// ---------- 2. State ----------
let isBonusActive = false;
let bonusTimeLeft = 0;              // seconds left in the current bonus
let lastBonusMilestone = 0;         // highest milestone already used this game
let shownBonusSeconds = 0;          // the number currently on the banner

// Page elements
const bonusBannerElement = document.getElementById("bonus-banner");
const bonusCountdownElement = document.getElementById("bonus-countdown");
const bonusStatusElement = document.getElementById("bonus-status");


// ---------- 3. Milestones (called every time the score changes) ----------
function checkBonusMilestone() {
    // The milestone at or below the score: 730 -> 500, 1020 -> 1000
    const milestone = Math.floor(score / BONUS_MILESTONE) * BONUS_MILESTONE;

    // Each milestone is used only ONCE per game
    if (milestone > lastBonusMilestone) {
        lastBonusMilestone = milestone;

        // Already raining? Then this milestone is simply used up -
        // the running 5-second timer is NOT restarted or doubled.
        if (!isBonusActive) {
            startBonusMode();
        }
    }
}


// ---------- 4. Start / update / end ----------
function startBonusMode() {
    isBonusActive = true;
    bonusTimeLeft = BONUS_DURATION;

    // Start the rain right away instead of waiting for the
    // normal (longer) spawn countdown to finish
    if (timeUntilNextSpawn > BONUS_SPAWN_INTERVAL) {
        timeUntilNextSpawn = BONUS_SPAWN_INTERVAL;
    }

    playSound("bonus", BONUS_SOUND_DELAY);

    showBonusBanner();
    bonusStatusElement.textContent = BONUS_START_MESSAGE;
}

// Called once per frame from update() in game.js - and only while the
// game is playing, so pause, a hidden tab and Game Over freeze the timer.
// There is just one timer variable, so two bonus timers can never run.
function updateBonusMode(deltaTime) {
    if (!isBonusActive) {
        return;
    }

    bonusTimeLeft -= deltaTime;
    if (bonusTimeLeft <= 0) {
        endBonusMode();
        bonusStatusElement.textContent = BONUS_END_MESSAGE;
        return;
    }

    updateBonusCountdown();
}

// Nothing needs "restoring": spawning and bomb chance simply go back
// to the normal level rules as soon as isBonusActive is false.
function endBonusMode() {
    isBonusActive = false;
    bonusTimeLeft = 0;
    hideBonusBanner();
}

// New game: no bonus running, and every milestone can trigger again.
// The status message is cleared quietly - a restart is not "finished".
function resetBonusMode() {
    endBonusMode();
    lastBonusMilestone = 0;
    bonusStatusElement.textContent = "";
}


// ---------- 5. The banner (HTML, over the level panel) ----------
// It sits OUTSIDE the canvas, so it never hides a falling fruit.
function showBonusBanner() {
    updateBonusCountdown();
    bonusBannerElement.hidden = false;
}

function hideBonusBanner() {
    bonusBannerElement.hidden = true;
    shownBonusSeconds = 0;
}

// Changes the number only when the whole second changes
// (5s -> 4s -> ...), not on every frame.
function updateBonusCountdown() {
    const seconds = Math.ceil(bonusTimeLeft);
    if (seconds !== shownBonusSeconds) {
        shownBonusSeconds = seconds;
        bonusCountdownElement.textContent = seconds + "s";
    }
}
