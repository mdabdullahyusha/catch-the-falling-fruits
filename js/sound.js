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
function playSound(name, delay = 0) {
    // Silent if sound is off, or if the player hasn't interacted yet
    if (!isSoundOn || !audioContext || audioContext.state !== "running") {
        return;
    }

    // Don't stack the same sound many times in a split second
    const now = audioContext.currentTime;
    if (lastPlayedAt[name] !== undefined && now - lastPlayedAt[name] < SOUND_MIN_GAP) {
        return;
    }
    lastPlayedAt[name] = now;

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
    } else if (name === "gameOver") {
        // four falling notes
        [392, 330, 262, 196].forEach(function (freq, i) {
            playTone(freq, freq * 0.98, 0.2, "triangle", 0.2, delay + i * 0.18);
        });
    }
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
