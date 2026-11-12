// =========================================================
// sound.js - tiny sound effects made with the Web Audio API
// No audio files: each sound is a few short "beeps" generated
// by the browser, so there is nothing to download.
// =========================================================

const SOUND_SETTING_KEY = "catchTheFruitsSound";
const SOUND_MIN_GAP = 0.06;   // seconds - the same sound can't replay faster than this

let audioContext = null;      // created on the first click / tap / key press
let isSoundOn = loadSoundSetting();
const lastPlayedAt = {};      // when each sound last played (to avoid pile-ups)

// "Jingles" are the little tunes. If two would play at the same moment
// (e.g. a Golden Fruit that also causes a level-up), the later one
// waits until the earlier one has finished, so they never overlap.
// Lengths are in seconds (last note's start + its length).
const JINGLE_LENGTHS = {
    levelUp: 0.39,
    bonus: 0.38,
    golden: 0.25,
    shieldUp: 0.3,
    magnetOn: 0.27,
    magnetOff: 0.2
};
const JINGLE_GAP = 0.03;      // tiny pause between two jingles
let jingleFreeAt = 0;         // audio-clock time when the last jingle ends

const soundButton = document.getElementById("sound-btn");


// ---------- 1. Saved on/off setting ----------
function loadSoundSetting() {
    try {
        return localStorage.getItem(SOUND_SETTING_KEY) !== "off";   // ON by default
    } catch (error) {
        return true;
    }
}

function saveSoundSetting() {
    try {
        localStorage.setItem(SOUND_SETTING_KEY, isSoundOn ? "on" : "off");
    } catch (error) {
        // storage blocked - the setting just won't be remembered
    }
}


// ---------- 2. Unlocking audio ----------
// Browsers don't allow sound until the player has interacted with
// the page. So we create the audio system on the FIRST click, tap
// or key press, and then remove these listeners - they're not needed again.
function unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return;   // very old browser: the game just stays silent
    }
    if (!audioContext) {
        audioContext = new AudioContextClass();
    }
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    document.removeEventListener("pointerdown", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
}

document.addEventListener("pointerdown", unlockAudio);
document.addEventListener("keydown", unlockAudio);


// ---------- 3. One beep ----------
// Plays one tone that slides from startFreq to endFreq.
// "delay" lets us play several notes in a row (a little tune).
function playTone(startFreq, endFreq, duration, waveType, volume, delay) {
    const startTime = audioContext.currentTime + delay;
    const endTime = startTime + duration;

    const oscillator = audioContext.createOscillator();  // makes the sound wave
    const gain = audioContext.createGain();              // controls the volume

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(startFreq, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, endTime);

    // Quick fade in, then fade out - this avoids "click" noises
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);

    // Disconnect when finished so the browser can free the memory
    oscillator.onended = function () {
        oscillator.disconnect();
        gain.disconnect();
    };
}


// ---------- 4. The game's sounds ----------
// Returns how many seconds from now the sound starts (null if silent).
// Only the SOUND can wait - score, text and sparkles always happen at once.
function playSound(name, delay = 0) {
    // Silent if sound is off, or if the player hasn't interacted yet
    if (!isSoundOn || !audioContext || audioContext.state !== "running") {
        return null;
    }

    // Don't stack the same sound many times in a split second
    const now = audioContext.currentTime;
    if (lastPlayedAt[name] !== undefined && now - lastPlayedAt[name] < SOUND_MIN_GAP) {
        return null;
    }
    lastPlayedAt[name] = now;

    // A jingle waits for any jingle that is still playing
    if (JINGLE_LENGTHS[name] !== undefined) {
        const earliestStart = jingleFreeAt > 0 ? jingleFreeAt + JINGLE_GAP : 0;
        const start = Math.max(now + delay, earliestStart);
        delay = start - now;
        jingleFreeAt = start + JINGLE_LENGTHS[name];
    }

    if (name === "catch") {
        // short happy "bloop" going up
        playTone(660, 1320, 0.12, "sine", 0.2, delay);
    } else if (name === "bomb") {
        // low "bonk" going down
        playTone(220, 60, 0.3, "triangle", 0.35, delay);
    } else if (name === "levelUp") {
        // four rising notes: C E G C
        [523, 659, 784, 1047].forEach(function (freq, i) {
            playTone(freq, freq, 0.12, "triangle", 0.18, delay + i * 0.09);
        });
    } else if (name === "golden") {
        // bright "ding-ding-DING" for a Golden Fruit (about 0.25 s)
        [1319, 1760, 2637].forEach(function (freq, i) {
            playTone(freq, freq, i === 2 ? 0.14 : 0.07, "triangle", 0.2, delay + i * 0.055);
        });
    } else if (name === "shieldUp") {
        // soft rising "whoosh" plus a bright note: the shield switches on
        playTone(392, 784, 0.18, "sine", 0.18, delay);
        playTone(1175, 1175, 0.12, "triangle", 0.15, delay + 0.18);
    } else if (name === "magnetOn") {
        // two quick rising "wub-WUB" sweeps: the magnet switches on
        playTone(220, 440, 0.12, "sine", 0.2, delay);
        playTone(330, 660, 0.13, "sine", 0.2, delay + 0.14);
    } else if (name === "magnetOff") {
        // one soft falling note: the magnet has run out
        playTone(660, 220, 0.2, "triangle", 0.16, delay);
    } else if (name === "shieldBreak") {
        // glassy "crack": two quick notes falling fast (instead of the bomb sound)
        playTone(2093, 523, 0.16, "triangle", 0.22, delay);
        playTone(1568, 392, 0.12, "sine", 0.15, delay + 0.04);
    } else if (name === "bonus") {
        // quick sparkly run of high notes for "FRUIT RAIN!"
        [1047, 1319, 1568, 2093, 1568, 2093].forEach(function (freq, i) {
            playTone(freq, freq, 0.08, "sine", 0.15, delay + i * 0.06);
        });
    } else if (name === "gameOver") {
        // four falling notes
        [392, 330, 262, 196].forEach(function (freq, i) {
            playTone(freq, freq * 0.98, 0.2, "triangle", 0.2, delay + i * 0.18);
        });
    }

    return delay;
}


// ---------- 5. Sound on/off button ----------
function updateSoundButton() {
    // Text AND icon change, so it's clear without relying on color
    soundButton.textContent = isSoundOn ? "🔊 Sound: On" : "🔇 Sound: Off";
    soundButton.setAttribute("aria-pressed", isSoundOn ? "true" : "false");
}

function toggleSound() {
    isSoundOn = !isSoundOn;
    saveSoundSetting();
    updateSoundButton();
}

soundButton.addEventListener("click", toggleSound);
updateSoundButton();
