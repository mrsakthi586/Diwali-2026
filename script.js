
"use strict";

/* ==========================================
   VIRTUAL DIWALI — FIREWORKS ENGINE
========================================== */

const canvas = document.getElementById("sky");
const ctx = canvas.getContext("2d");

const welcome = document.getElementById("welcome");
const celebration = document.getElementById("celebration");
const startBtn = document.getElementById("startBtn");

const mobile = window.innerWidth < 700;

const MAX_PARTICLES = mobile ? 700 : 1400;

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
    "#00ffc8"
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

let started = false;
let lastTime = 0;

let nextAutoFirework = 0;


/* ==========================================
   CANVAS RESPONSIVENESS
========================================== */

function resizeCanvas() {

    dpr = Math.min(
        window.devicePixelRatio || 1,
        mobile ? 1.3 : 1.6
    );

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(
        dpr, 0,
        0, dpr,
        0, 0
    );

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
            radius: random(.4, 1.2),
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

        audioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}


/* Rocket launch whistle */

function rocketSound() {

    try {

        const audio = getAudio();
        const now = audio.currentTime;

        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        const filter = audio.createBiquadFilter();

        oscillator.type = "sawtooth";

        oscillator.frequency.setValueAtTime(
            130, now
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            1100, now + .6
        );

        oscillator.frequency.exponentialRampToValueAtTime(
            420, now + .9
        );

        filter.type = "lowpass";
        filter.frequency.value = 1600;

        gain.gain.setValueAtTime(.001, now);

        gain.gain.linearRampToValueAtTime(
            .13, now + .08
        );

        gain.gain.exponentialRampToValueAtTime(
            .001, now + .95
        );

        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(audio.destination);

        oscillator.start(now);
        oscillator.stop(now + .98);

    } catch (error) {
        console.warn("Rocket audio unavailable", error);
    }
}


/* Layered explosion */

function explosionSound(volume = .4) {

    try {

        const audio = getAudio();
        const now = audio.currentTime;

        // Low-frequency boom

        const boom = audio.createOscillator();
        const boomGain = audio.createGain();

        boom.type = "sine";

        boom.frequency.setValueAtTime(110, now);

        boom.frequency.exponentialRampToValueAtTime(
            35, now + .35
        );

        boomGain.gain.setValueAtTime(.001, now);

        boomGain.gain.linearRampToValueAtTime(
            volume * .65, now + .015
        );

        boomGain.gain.exponentialRampToValueAtTime(
            .001, now + .4
        );

        boom.connect(boomGain);
        boomGain.connect(audio.destination);

        boom.start(now);
        boom.stop(now + .42);


        // Crackling noise

        const duration = .42;

        const buffer = audio.createBuffer(
            1,
            Math.floor(audio.sampleRate * duration),
            audio.sampleRate
        );

        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audio.createBufferSource();
        noise.buffer = buffer;

        const filter = audio.createBiquadFilter();

        filter.type = "lowpass";

        filter.frequency.setValueAtTime(2500, now);

        filter.frequency.exponentialRampToValueAtTime(
            250, now + duration
        );

        const noiseGain = audio.createGain();

        noiseGain.gain.setValueAtTime(.001, now);

        noiseGain.gain.linearRampToValueAtTime(
            volume * .4, now + .01
        );

        noiseGain.gain.exponentialRampToValueAtTime(
            .001, now + duration
        );

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audio.destination);

        noise.start(now);
        noise.stop(now + duration);

    } catch (error) {
        console.warn("Explosion audio unavailable", error);
    }
}


/* ==========================================
   PARTICLE SYSTEM
========================================== */

function addParticle(
    x, y,
    vx, vy,
    color,
    life = 75,
    gravity = .045,
    size = 2,
    drag = .985
) {

    if (particles.length >= MAX_PARTICLES) {
        return;
    }

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
        x,
        y,
        color,
        pattern = "chrysanthemum",
        count = 90,
        soundVolume = .35
    ) {

        for (let i = 0; i < count; i++) {

            let angle;
            let speed;

            if (pattern === "ring") {

                angle = i / count * Math.PI * 2;
                speed = random(3, 5);

            } else if (pattern === "willow") {

                angle = random(0, Math.PI * 2);
                speed = random(1.5, 4);

            } else if (pattern === "double") {

                angle = i / count * Math.PI * 2;

                speed = i % 2 === 0
                    ? random(2, 3)
                    : random(4, 5.5);

            } else if (pattern === "palm") {

                angle = random(0, Math.PI * 2);
                speed = random(3, 5.5);

            } else {

                angle = random(0, Math.PI * 2);
                speed = random(2, 5);

            }

            addParticle(
                x, y,

                Math.cos(angle) * speed,
                Math.sin(angle) * speed,

                color,

                pattern === "willow" ? 105 : 80,

                pattern === "willow" ? .07 : .05,

                random(1.5, 3),

                .988
            );
        }

        // White inner sparks

        for (let i = 0; i < 15; i++) {

            const angle = random(0, Math.PI * 2);
            const speed = random(.5, 2);

            addParticle(
                x, y,

                Math.cos(angle) * speed,
                Math.sin(angle) * speed,

                "#fff8dc",
                25,
                .035,
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
            r.speed += .12 * step;

            // Rocket tail

            addParticle(
                r.x + random(-1, 1),
                r.y + 8,

                random(-.4, .4),
                random(1, 2),

                r.color,
                22,
                .04,
                1.8
            );

            // Rocket head

            ctx.save();

            ctx.fillStyle = "#ffffff";
            ctx.shadowBlur = 20;
            ctx.shadowColor = r.color;

            ctx.beginPath();

            ctx.arc(
                r.x,
                r.y,
                3.5,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();

            // Explosion

            if (
                r.y <= r.targetY ||
                r.speed > -.2
            ) {

                this.explode(
                    r.x,
                    r.y,
                    r.color,
                    "chrysanthemum",
                    mobile ? 90 : 135,
                    .65
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

            ctx.shadowBlur = mobile ? 3 : 9;
            ctx.shadowColor = p.color;

            ctx.beginPath();

            ctx.moveTo(p.oldX, p.oldY);
            ctx.lineTo(p.x, p.y);

            ctx.stroke();

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

    // Start audio directly from user interaction

    getAudio();

    welcome.classList.add("hidden");
    celebration.classList.remove("hidden");

    const centerX = width / 2;
    const centerY = height * .35;

    // Massive golden explosion

    fireworks.explode(
        centerX,
        centerY,
        "#ffd166",
        "chrysanthemum",
        mobile ? 150 : 230,
        .55
    );

    // Pink and cyan explosions

    setTimeout(() => {

        fireworks.explode(
            centerX - width * .22,
            centerY + 35,
            "#ff43a4",
            "ring",
            mobile ? 65 : 100,
            .25
        );

        fireworks.explode(
            centerX + width * .22,
            centerY + 35,
            "#00e5ff",
            "ring",
            mobile ? 65 : 100,
            .25
        );

    }, 350);

    // Golden final explosion

    setTimeout(() => {

        fireworks.explode(
            centerX,
            centerY - 70,
            "#fff2b3",
            "double",
            mobile ? 100 : 145,
            .3
        );

    }, 750);

    // Start automatic fireworks

    nextAutoFirework = performance.now() + 1200;
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
        height * .12,
        Math.min(y, height * .65)
    );

    fireworks.launch(
        x,
        targetY,
        pick(COLORS),
        true
    );
}


/* Click anywhere on the celebration screen */

celebration.addEventListener("pointerdown", event => {

    if (!started) return;

    // Avoid accidental firing on text selection

    launchAt(
        event.clientX,
        event.clientY
    );

});


/* ==========================================
   AUTOMATIC FIREWORKS
========================================== */

function automaticFireworks(time) {

    if (!started) return;

    if (time < nextAutoFirework) return;

    // Random launch position

    const x = random(
        width * .15,
        width * .85
    );

    const targetY = random(
        height * .12,
        height * .43
    );

    fireworks.launch(
        x,
        targetY,
        pick(COLORS),
        false
    );

    // Next automatic launch

    nextAutoFirework = time + random(1500, 2800);
}


/* ==========================================
   BACKGROUND STARS
========================================== */

function drawStars(time) {

    for (const star of stars) {

        const alpha =
            star.alpha * (
                .7 + .3 * Math.sin(
                    time * .001 + star.x
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

    // Clear previous frame

    ctx.clearRect(
        0, 0,
        width, height
    );

    // Background stars

    drawStars(time);

    // Automatic fireworks

    automaticFireworks(time);

    // Update particles and rockets

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


console.log(
    "🪔 Diwali Night — Fireworks Ready!"
);
