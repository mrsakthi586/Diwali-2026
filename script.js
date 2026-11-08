
"use strict";

/* ==========================================
   DIWALI NIGHT — CINEMATIC FIREWORKS
========================================== */

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");

const welcome = document.getElementById("welcome");
const celebration = document.getElementById("celebration");
const startBtn = document.getElementById("startBtn");

const isMobile = () => window.innerWidth < 700;

const MAX_PARTICLES = 1400;

const COLORS = [
    "#ff3030",
    "#ffae00",
    "#ffe66d",
    "#00e5ff",
    "#ff43a4",
    "#a855f7",
    "#54ff70",
    "#ffffff",
    "#ff6b35",
    "#00ffc8",
    "#ff80ab",
    "#b8fffa"
];

const random = (min, max) =>
    Math.random() * (max - min) + min;

const pick = array =>
    array[Math.floor(Math.random() * array.length)];


/* ==========================================
   STATE
========================================== */

let width;
let height;
let dpr;

let particles = [];
let rockets = [];
let stars = [];

let audioContext = null;
let masterGain = null;

let started = false;
let lastTime = 0;
let nextAutoFirework = 0;


/* ==========================================
   CANVAS RESPONSIVENESS
========================================== */

function resizeCanvas() {

    dpr = Math.min(
        window.devicePixelRatio || 1,
        isMobile() ? 1.3 : 1.6
    );

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars = Array.from(
        {
            length: Math.min(
                90,
                Math.floor(width * height / 10000)
            )
        },
        () => ({
            x: random(0, width),
            y: random(0, height),
            radius: random(.4, 1.3),
            alpha: random(.2, .7)
        })
    );
}

window.addEventListener(
    "resize",
    resizeCanvas,
    { passive: true }
);

resizeCanvas();


/* ==========================================
   AUDIO ENGINE
========================================== */

function getAudio() {

    if (!audioContext) {

        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) return null;

        audioContext = new AudioContextClass();

        masterGain = audioContext.createGain();

        // Comfortable overall sound level
        masterGain.gain.value = 0.65;

        masterGain.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}


/* ==========================================
   AUDIO HELPER — NOISE GENERATOR
========================================== */

function createNoise(audio, duration) {

    const length = Math.floor(
        audio.sampleRate * duration
    );

    const buffer = audio.createBuffer(
        1,
        length,
        audio.sampleRate
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {

        // Slightly softened noise
        data[i] = (Math.random() * 2 - 1) * 0.7;

    }

    return buffer;
}


/* ==========================================
   REALISTIC-STYLE ROCKET LAUNCH
========================================== */

function rocketSound() {

    try {

        const audio = getAudio();

        if (!audio) return;

        const now = audio.currentTime;

        /* ----------------------------------
           1. IGNITION — Short deep burst
        ---------------------------------- */

        const ignition = audio.createOscillator();
        const ignitionGain = audio.createGain();

        ignition.type = "triangle";

        ignition.frequency.setValueAtTime(90, now);

        ignition.frequency.exponentialRampToValueAtTime(
            42,
            now + 0.18
        );

        ignitionGain.gain.setValueAtTime(0.001, now);

        ignitionGain.gain.linearRampToValueAtTime(
            0.14,
            now + 0.025
        );

        ignitionGain.gain.exponentialRampToValueAtTime(
            0.001,
            now + 0.24
        );

        ignition.connect(ignitionGain);
        ignitionGain.connect(masterGain);

        ignition.start(now);
        ignition.stop(now + 0.26);


        /* ----------------------------------
           2. ROCKET RUSH — Smooth noise
        ---------------------------------- */

        const duration = 0.95;

        const noise = audio.createBufferSource();

        noise.buffer = createNoise(audio, duration);

        const noiseFilter = audio.createBiquadFilter();

        noiseFilter.type = "lowpass";

        noiseFilter.frequency.setValueAtTime(
            450,
            now
        );

        noiseFilter.frequency.exponentialRampToValueAtTime(
            1800,
            now + 0.7
        );

        noiseFilter.Q.value = 0.6;

        const noiseGain = audio.createGain();

        noiseGain.gain.setValueAtTime(0.001, now);

        noiseGain.gain.linearRampToValueAtTime(
            0.10,
            now + 0.18
        );

        noiseGain.gain.setValueAtTime(
            0.08,
            now + 0.55
        );

        noiseGain.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(now);
        noise.stop(now + duration);


        /* ----------------------------------
           3. SOFT WHISTLE — Smooth rising tone
        ---------------------------------- */

        const whistle = audio.createOscillator();

        const whistleFilter = audio.createBiquadFilter();
        const whistleGain = audio.createGain();

        whistle.type = "sine";

        whistle.frequency.setValueAtTime(
            280,
            now + 0.12
        );

        whistle.frequency.exponentialRampToValueAtTime(
            750,
            now + 0.8
        );

        whistleFilter.type = "lowpass";
        whistleFilter.frequency.value = 1000;

        whistleGain.gain.setValueAtTime(
            0.001,
            now
        );

        whistleGain.gain.linearRampToValueAtTime(
            0.025,
            now + 0.3
        );

        whistleGain.gain.exponentialRampToValueAtTime(
            0.001,
            now + 0.9
        );

        whistle.connect(whistleFilter);
        whistleFilter.connect(whistleGain);
        whistleGain.connect(masterGain);

        whistle.start(now);
        whistle.stop(now + 0.95);

    } catch (error) {

        console.warn("Rocket sound unavailable:", error);

    }
}


/* ==========================================
   FIREWORK EXPLOSION SOUND
========================================== */

function explosionSound(volume = 0.3) {

    try {

        const audio = getAudio();

        if (!audio) return;

        const now = audio.currentTime;

        /* Deep explosion */

        const boom = audio.createOscillator();
        const boomGain = audio.createGain();

        boom.type = "sine";

        boom.frequency.setValueAtTime(85, now);

        boom.frequency.exponentialRampToValueAtTime(
            30,
            now + 0.4
        );

        boomGain.gain.setValueAtTime(0.001, now);

        boomGain.gain.linearRampToValueAtTime(
            volume * 0.65,
            now + 0.025
        );

        boomGain.gain.exponentialRampToValueAtTime(
            0.001,
            now + 0.5
        );

        boom.connect(boomGain);
        boomGain.connect(masterGain);

        boom.start(now);
        boom.stop(now + 0.52);


        /* Soft crackling sparks */

        const duration = 0.38;

        const noise = audio.createBufferSource();

        noise.buffer = createNoise(audio, duration);

        const filter = audio.createBiquadFilter();

        filter.type = "lowpass";
        filter.frequency.value = 1600;

        const noiseGain = audio.createGain();

        noiseGain.gain.setValueAtTime(0.001, now);

        noiseGain.gain.linearRampToValueAtTime(
            volume * 0.2,
            now + 0.02
        );

        noiseGain.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(now);
        noise.stop(now + duration);

    } catch (error) {

        console.warn("Explosion sound unavailable:", error);

    }
}


/* ==========================================
   PARTICLE SYSTEM
========================================== */

function addParticle(
    x, y,
    vx, vy,
    color,
    life = 100,
    gravity = 0.035,
    size = 2.5,
    drag = 0.991
) {

    if (particles.length >= MAX_PARTICLES) return;

    particles.push({

        x, y,

        oldX: x,
        oldY: y,

        vx, vy,

        color,

        life,
        maxLife: life,

        gravity,
        size,
        drag

    });
}


/* ==========================================
   FIREWORKS ENGINE
========================================== */

class Fireworks {

    launch(x, targetY, color, sound = true) {

        if (rockets.length >= 10) return;

        rockets.push({

            x,
            y: height + 10,

            targetY,

            speed: random(-10, -12),

            color

        });

        if (sound) {
            rocketSound();
        }
    }


    explode(
        x, y,
        color,
        pattern = "chrysanthemum",
        count = 100,
        soundVolume = 0.3
    ) {

        const explosionSize = isMobile() ? 1.35 : 1.7;

        // Main explosion

        for (let i = 0; i < count; i++) {

            let angle;
            let speed;

            if (pattern === "ring") {

                angle = i / count * Math.PI * 2;
                speed = random(4, 7);

            } else if (pattern === "willow") {

                angle = random(0, Math.PI * 2);
                speed = random(2, 5);

            } else if (pattern === "double") {

                angle = i / count * Math.PI * 2;

                speed = i % 2 === 0
                    ? random(3, 4.5)
                    : random(5, 7);

            } else if (pattern === "palm") {

                angle = random(0, Math.PI * 2);
                speed = random(4, 7);

            } else {

                angle = random(0, Math.PI * 2);
                speed = random(3, 7);

            }

            speed *= explosionSize;

            addParticle(
                x, y,

                Math.cos(angle) * speed,
                Math.sin(angle) * speed,

                color,

                pattern === "willow" ? 125 : 105,

                pattern === "willow" ? 0.045 : 0.035,

                random(2, 4),

                0.991
            );
        }


        // Golden inner sparks

        for (let i = 0; i < 35; i++) {

            const angle = random(0, Math.PI * 2);
            const speed = random(1, 3.5);

            addParticle(
                x, y,

                Math.cos(angle) * speed,
                Math.sin(angle) * speed,

                "#fff2b0",
                45,
                0.025,
                3
            );
        }


        // Secondary colourful ring

        for (let i = 0; i < 45; i++) {

            const angle = random(0, Math.PI * 2);
            const speed = random(2, 5) * explosionSize;

            addParticle(
                x, y,

                Math.cos(angle) * speed,
                Math.sin(angle) * speed,

                pick(COLORS),
                75,
                0.04,
                2.5
            );
        }


        if (soundVolume > 0) {
            explosionSound(soundVolume);
        }
    }


    update(dt) {

        const step = Math.min(2, dt / 16.67);

        // Rocket movement

        for (let i = rockets.length - 1; i >= 0; i--) {

            const r = rockets[i];

            r.y += r.speed * step;
            r.speed += 0.12 * step;

            // Rocket tail

            addParticle(
                r.x + random(-1.5, 1.5),
                r.y + 8,

                random(-0.6, 0.6),
                random(1, 2.5),

                r.color,
                30,
                0.035,
                2.5
            );

            // Rocket head

            ctx.save();

            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 25;
            ctx.shadowColor = r.color;

            ctx.beginPath();

            ctx.arc(
                r.x,
                r.y,
                4,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();


            // Explosion

            if (
                r.y <= r.targetY ||
                r.speed > -0.2
            ) {

                this.explode(
                    r.x,
                    r.y,
                    r.color,
                    "chrysanthemum",
                    isMobile() ? 160 : 230,
                    0.35
                );

                rockets.splice(i, 1);
            }
        }


        // Particle physics

        for (let i = particles.length - 1; i >= 0; i--) {

            const p = particles[i];

            p.oldX = p.x;
            p.oldY = p.y;

            p.vx *= Math.pow(p.drag, step);

            p.vy =
                p.vy * Math.pow(p.drag, step)
                + p.gravity * step;

            p.x += p.vx * step;
            p.y += p.vy * step;

            p.life -= step;

            const alpha = Math.max(
                0,
                p.life / p.maxLife
            );

            ctx.save();

            ctx.globalAlpha = alpha;

            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size;
            ctx.lineCap = "round";

            ctx.shadowBlur = isMobile() ? 4 : 13;
            ctx.shadowColor = p.color;

            ctx.beginPath();

            ctx.moveTo(p.oldX, p.oldY);
            ctx.lineTo(p.x, p.y);

            ctx.stroke();

            ctx.fillStyle = p.color;

            ctx.beginPath();

            ctx.arc(
                p.x,
                p.y,
                p.size * 0.65,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();

            if (
                p.life <= 0 ||
                p.y > height + 30
            ) {

                particles.splice(i, 1);

            }
        }
    }
}

const fireworks = new Fireworks();


/* ==========================================
   GRAND OPENING
========================================== */

function startCelebration() {

    if (started) return;

    started = true;

    // Audio initialized through user interaction

    getAudio();

    welcome.classList.add("hidden");
    celebration.classList.remove("hidden");

    const centerX = width / 2;
    const centerY = height * 0.35;


    // MASSIVE GOLDEN EXPLOSION

    fireworks.explode(
        centerX,
        centerY,
        "#ffd166",
        "chrysanthemum",
        isMobile() ? 220 : 350,
        0.35
    );


    // PINK AND CYAN EXPLOSIONS

    setTimeout(() => {

        fireworks.explode(
            centerX - width * 0.22,
            centerY + 35,
            "#ff43a4",
            "ring",
            isMobile() ? 110 : 170,
            0.15
        );

        fireworks.explode(
            centerX + width * 0.22,
            centerY + 35,
            "#00e5ff",
            "ring",
            isMobile() ? 110 : 170,
            0.15
        );

    }, 350);


    // GOLDEN FINAL EXPLOSION

    setTimeout(() => {

        fireworks.explode(
            centerX,
            centerY - 70,
            "#fff2b3",
            "double",
            isMobile() ? 140 : 200,
            0.2
        );

    }, 750);


    // PURPLE AND GREEN EXPLOSIONS

    setTimeout(() => {

        fireworks.explode(
            centerX - width * 0.3,
            centerY - 50,
            "#a855f7",
            "palm",
            isMobile() ? 75 : 120,
            0.15
        );

        fireworks.explode(
            centerX + width * 0.3,
            centerY - 50,
            "#54ff70",
            "willow",
            isMobile() ? 75 : 120,
            0.15
        );

    }, 1200);


    // Automatic fireworks

    nextAutoFirework = performance.now() + 1800;
}

startBtn.addEventListener(
    "click",
    startCelebration
);


/* ==========================================
   INTERACTIVE FIREWORKS
========================================== */

function launchAt(x, y) {

    if (!started) return;

    const targetY = Math.max(
        height * 0.12,
        Math.min(y, height * 0.65)
    );

    fireworks.launch(
        x,
        targetY,
        pick(COLORS),
        true
    );
}


/* Click anywhere in the celebration sky */

celebration.addEventListener(
    "pointerdown",
    event => {

        if (!started) return;

        launchAt(
            event.clientX,
            event.clientY
        );

    }
);


/* ==========================================
   AUTOMATIC FIREWORKS
========================================== */

function automaticFireworks(time) {

    if (!started) return;

    if (time < nextAutoFirework) return;

    const x = random(
        width * 0.15,
        width * 0.85
    );

    const targetY = random(
        height * 0.12,
        height * 0.43
    );

    fireworks.launch(
        x,
        targetY,
        pick(COLORS),
        false
    );

    nextAutoFirework = time + random(1800, 3000);
}


/* ==========================================
   BACKGROUND STARS
========================================== */

function drawStars(time) {

    for (const star of stars) {

        const alpha =
            star.alpha * (
                0.7 + 0.3 * Math.sin(
                    time * 0.001 + star.x
                )
            );

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#fff5dc";

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


/* ==========================================
   MAIN ANIMATION LOOP
========================================== */

function animate(time) {

    if (document.hidden) {

        lastTime = time;

        requestAnimationFrame(animate);

        return;
    }

    const dt = lastTime
        ? Math.min(time - lastTime, 40)
        : 16.67;

    lastTime = time;

    ctx.clearRect(
        0, 0,
        width, height
    );

    drawStars(time);

    automaticFireworks(time);

    fireworks.update(dt);

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);


/* ==========================================
   TAB VISIBILITY
========================================== */

document.addEventListener(
    "visibilitychange",
    () => {

        if (!document.hidden) {
            lastTime = 0;
        }

    }
);


/* ==========================================
   INITIALIZATION
========================================== */

console.log(
    "🪔 Diwali Night — Smooth Rocket Audio Ready!"
);
