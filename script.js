// =========================================
// BUBBLEWORD
// Main Game Script
//
// Vocabulary Arcade shared sound system
// Bubble popping animation
// =========================================


// =========================================
// CANVAS SETUP
// =========================================
if (typeof SoundFX === "undefined") {

    window.SoundFX = {

        isMuted: () => false,
        toggleMute: () => {},
        start: () => {},
        bubblePop: () => {},
        coin: () => {},
        levelUp: () => {},
        incorrect: () => {},
        countdown: () => {},
        timeUp: () => {},
        gameOver: () => {},
        click: () => {}

    };

}

const canvas =
    document.getElementById("gameCanvas");

// Temporary fallback if sound.js fails to load

if (typeof SoundFX === "undefined") {

    window.SoundFX = {

        isMuted: () => false,

        toggleMute: () => {},

        start: () => {},

        bubblePop: () => {},

        coin: () => {},

        levelUp: () => {},

        incorrect: () => {},

        countdown: () => {},

        timeUp: () => {},

        gameOver: () => {},

        click: () => {}

    };
}

const ctx =
    canvas.getContext("2d");


// =========================================
// CONSTANTS
// =========================================

const DEFINITION_HEIGHT = 140;

const BUBBLE_RADIUS = 90;

const POP_DURATION = 420;


// =========================================
// GAME STATE
// =========================================

let score = 0;

let level = 1;

let timeLeft = 60;

let shotsLeft = 20;

let correctCount = 0;

let totalClicks = 0;

let vocab = [];

let bubbles = [];

let popEffects = [];

let currentDefinition = "";

let timer = null;

let gameOver = false;


// =========================================
// PLAY AGAIN BUTTON
// =========================================

let playAgainButton = {

    x: 0,

    y: 0,

    width: 220,

    height: 60,

    visible: false
};


// =========================================
// HUD
// =========================================

const scoreDisplay =
    document.getElementById("score");


const levelDisplay =
    document.getElementById("level");


const timerDisplay =
    document.getElementById("timer");


const attemptsDisplay =
    document.getElementById("attempts");


const targetWordDisplay =
    document.getElementById("target-word");


// =========================================
// SOUND BUTTON
// =========================================

const muteButton =
    document.getElementById("mute-btn");


function updateMuteButton() {

    if (!muteButton) {
        return;
    }

    if (typeof SoundFX === "undefined") {
        return;
    }

    const muted =
        SoundFX.isMuted();


    muteButton.textContent =
        muted
            ? "🔇"
            : "🔊";


    muteButton.setAttribute(
        "aria-label",
        muted
            ? "Turn game sounds on"
            : "Mute game sounds"
    );


    muteButton.setAttribute(
        "title",
        muted
            ? "Turn game sounds on"
            : "Mute game sounds"
    );
}


if (muteButton) {

    updateMuteButton();

    muteButton.addEventListener(
        "click",
        () => {

            if (typeof SoundFX !== "undefined") {
                SoundFX.toggleMute();
            }

            updateMuteButton();
        }
    );
}


// =========================================
// CANVAS RESIZE
// =========================================

function resizeCanvas() {

    const panel =
        document.getElementById(
            "teacher-panel"
        );


    const panelWidth =
        panel &&
        panel.style.display !== "none"
            ? panel.offsetWidth
            : 0;


    canvas.width =
        Math.max(
            320,
            window.innerWidth -
            panelWidth
        );


    canvas.height =
        Math.max(
            500,
            window.innerHeight
        );


    /*
     * Keep Play Again centered.
     */

    if (playAgainButton) {

        playAgainButton.x =
            canvas.width / 2 -
            playAgainButton.width / 2;


        playAgainButton.y =
            canvas.height / 2 +
            90;
    }
}


resizeCanvas();


window.addEventListener(
    "resize",
    resizeCanvas
);


// =========================================
// HUD UPDATE
// =========================================

function updateHUD() {

    if (scoreDisplay) {

        scoreDisplay.textContent =
            score;
    }


    if (levelDisplay) {

        levelDisplay.textContent =
            level;
    }


    if (timerDisplay) {

        timerDisplay.textContent =
            timeLeft;
    }


    if (attemptsDisplay) {

        attemptsDisplay.textContent =
            shotsLeft;
    }
}


// =========================================
// START GAME
// =========================================

window.startLoadedGame =
    function () {

        if (
            !window.preloadedVocab ||
            window.preloadedVocab.length < 5
        ) {

            alert(
                "No valid vocabulary loaded."
            );

            return;
        }


        /*
         * Normalize vocabulary.
         */

        vocab =
            window.preloadedVocab
                .map(v => ({

                    word:
                        String(
                            v.word || ""
                        ).trim(),

                    meaning:
                        String(
                            v.meaning ||
                            v.definition ||
                            ""
                        ).trim()

                }))
                .filter(v =>
                    v.word &&
                    v.meaning
                );


        /*
         * Hide teacher panel.
         */

        const teacherPanel =
            document.getElementById(
                "teacher-panel"
            );


        if (teacherPanel) {

            teacherPanel.style.display =
                "none";
        }


        resizeCanvas();


        /*
         * Reset game.
         */

        score = 0;

        level = 1;

        correctCount = 0;

        totalClicks = 0;

        currentDefinition = "";

        popEffects = [];

        gameOver = false;


        updateHUD();


        if (targetWordDisplay) {

            targetWordDisplay.textContent =
                "";
        }


        playAgainButton.visible =
            false;


        /*
         * Start the game.
         */

        createLevel();


        /*
         * Shared Vocabulary Arcade
         * start sound.
         */

        SoundFX.start();


        console.log(
            "BubbleWord started successfully."
        );
    };


// =========================================
// CREATE LEVEL
// =========================================

function createLevel() {

    bubbles = [];

    popEffects = [];

    gameOver = false;


    shotsLeft = 20;


    updateHUD();


    startTimer();


    /*
     * Choose up to 10 vocabulary items.
     */

    const selected =
        [...vocab]
            .sort(
                () =>
                    Math.random() - 0.5
            )
            .slice(0, 10);


    /*
     * Select the first target.
     */

    const answer =
        selected[
            Math.floor(
                Math.random() *
                selected.length
            )
        ];


    if (!answer) {

        return;
    }


    /*
     * Definition is the question.
     */

    currentDefinition =
        answer.meaning;


    if (targetWordDisplay) {

        targetWordDisplay.textContent =
            "";
    }


    /*
     * Create bubbles.
     */

    selected.forEach(item => {

        const radius =
            BUBBLE_RADIUS;


        let x;

        let y;

        let safe = false;


        /*
         * Keep bubbles above
         * the definition panel.
         */

        const playableTop =
            radius + 100;


        const playableBottom =
            canvas.height -
            DEFINITION_HEIGHT -
            radius;


        const availableHeight =
            Math.max(
                1,
                playableBottom -
                playableTop
            );


        let attempts = 0;


        /*
         * Find non-overlapping position.
         */

        while (
            !safe &&
            attempts < 500
        ) {

            attempts++;


            x =
                radius +
                Math.random() *
                Math.max(
                    1,
                    canvas.width -
                    radius * 2
                );


            y =
                playableTop +
                Math.random() *
                availableHeight;


            safe = true;


            for (
                const other
                of bubbles
            ) {

                const dx =
                    x - other.x;


                const dy =
                    y - other.y;


                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (
                    distance <
                    radius * 2.4
                ) {

                    safe = false;

                    break;
                }
            }
        }


        /*
         * Fallback position.
         */

        if (!safe) {

            x =
                radius +
                Math.random() *
                Math.max(
                    1,
                    canvas.width -
                    radius * 2
                );


            y =
                playableTop +
                Math.random() *
                availableHeight;
        }


        /*
         * Movement increases
         * with level.
         */

        const speed =
            (level - 1) * 1;


        bubbles.push({

            x: x,

            y: y,

            r: radius,

            text:
                item.word,

            correct:
                item.word ===
                answer.word,

            vx:
                (Math.random() - 0.5) *
                speed,

            vy:
                (Math.random() - 0.5) *
                speed
        });
    });
}


// =========================================
// TIMER
// =========================================

function startTimer() {

    clearInterval(timer);


    timeLeft = 60;


    updateHUD();


    timer =
        setInterval(
            () => {

                if (gameOver) {
                    return;
                }


                timeLeft--;


                updateHUD();


                /*
                 * Final five seconds.
                 */

                if (
                    timeLeft > 0 &&
                    timeLeft <= 5
                ) {

                    SoundFX.countdown();
                }


                if (
                    timeLeft <= 0
                ) {

                    SoundFX.timeUp();


                    endGame(
                        "TIME'S UP!"
                    );
                }

            },
            1000
        );
}


// =========================================
// UPDATE
// =========================================

function update() {

    /*
     * Update bubble movement.
     */

    bubbles.forEach(b => {

        /*
         * Level 1:
         * bubbles remain still.
         */

        if (
            level === 1
        ) {

            return;
        }


        /*
         * Level 2+:
         * horizontal movement.
         */

        if (
            level >= 2
        ) {

            b.x +=
                b.vx;
        }


        /*
         * Level 3+:
         * vertical movement.
         */

        if (
            level >= 3
        ) {

            b.y +=
                b.vy;
        }


        /*
         * Level 5+:
         * random movement.
         */

        if (
            level >= 5
        ) {

            b.vx +=
                (
                    Math.random() -
                    0.5
                ) * 0.1;


            b.vy +=
                (
                    Math.random() -
                    0.5
                ) * 0.1;
        }


        /*
         * LEFT WALL
         */

        if (
            b.x < b.r
        ) {

            b.x =
                b.r;

            b.vx *= -1;
        }


        /*
         * RIGHT WALL
         */

        if (
            b.x >
            canvas.width -
            b.r
        ) {

            b.x =
                canvas.width -
                b.r;

            b.vx *= -1;
        }


        /*
         * TOP WALL
         */

        const topLimit =
            b.r + 90;


        if (
            b.y < topLimit
        ) {

            b.y =
                topLimit;

            b.vy *= -1;
        }


        /*
         * BOTTOM WALL
         */

        const bottomLimit =
            canvas.height -
            DEFINITION_HEIGHT -
            b.r;


        if (
            b.y > bottomLimit
        ) {

            b.y =
                bottomLimit;

            b.vy *= -1;
        }

    });


    /*
     * Update pop animations.
     */

    updatePopEffects();
}


// =========================================
// CREATE POP EFFECT
// =========================================

function createPopEffect(
    bubble
) {

    const particles = [];

    const particleCount = 18;


    for (
        let i = 0;
        i < particleCount;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI *
            2;


        const speed =
            2 +
            Math.random() * 4;


        particles.push({

            x:
                bubble.x,

            y:
                bubble.y,

            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed,

            size:
                3 +
                Math.random() * 5,

            life:
                1,

            decay:
                0.025 +
                Math.random() * 0.025
        });
    }


    popEffects.push({

        x:
            bubble.x,

        y:
            bubble.y,

        radius:
            bubble.r,

        age:
            0,

        duration:
            POP_DURATION,

        particles:
            particles
    });
}


// =========================================
// UPDATE POP EFFECTS
// =========================================

function updatePopEffects() {

    popEffects =
        popEffects.filter(
            effect => {

                /*
                 * Approximately 60 FPS.
                 */

                effect.age += 16;


                const progress =
                    Math.min(
                        1,
                        effect.age /
                        effect.duration
                    );


                /*
                 * Update particles.
                 */

                effect.particles.forEach(
                    particle => {

                        particle.x +=
                            particle.vx;


                        particle.y +=
                            particle.vy;


                        particle.vx *=
                            0.97;


                        particle.vy *=
                            0.97;


                        particle.life -=
                            particle.decay;
                    }
                );


                return progress < 1;
            }
        );
}


// =========================================
// DRAW
// =========================================

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
     * Draw bubbles.
     */

    bubbles.forEach(
        bubble => {

            drawBubble(
                bubble
            );
        }
    );


    /*
     * Draw pop animation.
     */

    drawPopEffects();


    /*
     * Bottom definition panel.
     */

    const definitionY =
        canvas.height -
        DEFINITION_HEIGHT;


    ctx.fillStyle =
        "rgba(0,0,0,0.82)";


    ctx.fillRect(
        0,
        definitionY,
        canvas.width,
        DEFINITION_HEIGHT
    );


    /*
     * Top border.
     */

    ctx.strokeStyle =
        "rgba(255,255,255,0.35)";


    ctx.lineWidth = 2;


    ctx.beginPath();


    ctx.moveTo(
        0,
        definitionY
    );


    ctx.lineTo(
        canvas.width,
        definitionY
    );


    ctx.stroke();


    /*
     * Question label.
     */

    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "bold 18px Arial";


    ctx.textAlign =
        "center";


    ctx.textBaseline =
        "alphabetic";


    ctx.fillText(
        "FIND THE WORD FOR:",
        canvas.width / 2,
        definitionY + 30
    );


    /*
     * Definition.
     */

    if (
        currentDefinition
    ) {

        ctx.font =
            "bold 25px Arial";


        ctx.fillStyle =
            "#ffffff";


        drawCenteredWrappedText(
            currentDefinition,
            canvas.width / 2,
            definitionY + 78,
            canvas.width - 80,
            30
        );
    }


    /*
     * Play Again button.
     */

    if (
        playAgainButton.visible
    ) {

        ctx.fillStyle =
            "#34bc6e";


        ctx.fillRect(
            playAgainButton.x,
            playAgainButton.y,
            playAgainButton.width,
            playAgainButton.height
        );


        ctx.fillStyle =
            "white";


        ctx.font =
            "22px Arial";


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "alphabetic";


        ctx.fillText(
            "Play Again",
            canvas.width / 2,
            playAgainButton.y + 38
        );
    }
}


// =========================================
// DRAW BUBBLE
// =========================================

function drawBubble(b) {

    ctx.beginPath();


    ctx.ellipse(
        b.x,
        b.y,
        b.r * 1.05,
        b.r * 0.9,
        0,
        0,
        Math.PI * 2
    );


    /*
     * Bubble gradient.
     */

    const gradient =
        ctx.createRadialGradient(
            b.x - b.r * 0.3,
            b.y - b.r * 0.3,
            b.r * 0.2,
            b.x,
            b.y,
            b.r
        );


    gradient.addColorStop(
        0,
        "rgba(255,255,255,0.9)"
    );


    gradient.addColorStop(
        0.4,
        "rgba(200,230,255,0.6)"
    );


    gradient.addColorStop(
        1,
        "rgba(150,200,255,0.3)"
    );


    ctx.fillStyle =
        gradient;


    ctx.fill();


    ctx.strokeStyle =
        "rgba(255,255,255,0.6)";


    ctx.lineWidth = 2;


    ctx.stroke();


    /*
     * Word.
     */

    ctx.fillStyle =
        "#123";


    ctx.font =
        "bold 20px Arial";


    ctx.textAlign =
        "center";


    ctx.textBaseline =
        "middle";


    drawBubbleText(
        b.text,
        b.x,
        b.y,
        b.r * 1.6
    );
}


// =========================================
// DRAW POP EFFECTS
// =========================================

function drawPopEffects() {

    popEffects.forEach(
        effect => {

            const progress =
                Math.min(
                    1,
                    effect.age /
                    effect.duration
                );


            const fade =
                1 - progress;


            /*
             * Expanding bubble ring.
             */

            const ringRadius =
                effect.radius *
                (
                    0.45 +
                    progress * 1.25
                );


            ctx.beginPath();


            ctx.arc(
                effect.x,
                effect.y,
                ringRadius,
                0,
                Math.PI * 2
            );


            ctx.strokeStyle =
                `rgba(255,255,255,${0.8 * fade})`;


            ctx.lineWidth =
                5 * fade + 1;


            ctx.stroke();


            /*
             * Bright flash.
             */

            if (
                progress < 0.25
            ) {

                const flashAlpha =
                    1 -
                    progress / 0.25;


                ctx.beginPath();


                ctx.arc(
                    effect.x,
                    effect.y,
                    effect.radius *
                    (
                        0.3 +
                        progress
                    ),
                    0,
                    Math.PI * 2
                );


                ctx.fillStyle =
                    `rgba(255,255,255,${0.55 * flashAlpha})`;


                ctx.fill();
            }


            /*
             * Pop particles.
             */

            effect.particles.forEach(
                particle => {

                    if (
                        particle.life <= 0
                    ) {

                        return;
                    }


                    ctx.beginPath();


                    ctx.arc(
                        particle.x,
                        particle.y,
                        particle.size *
                        particle.life,
                        0,
                        Math.PI * 2
                    );


                    ctx.fillStyle =
                        `rgba(210,240,255,${particle.life * fade})`;


                    ctx.fill();
                }
            );
        }
    );
}


// =========================================
// BUBBLE TEXT
// =========================================

function drawBubbleText(
    text,
    x,
    y,
    maxWidth
) {

    const words =
        String(text).split(" ");


    let line = "";

    const lines = [];


    words.forEach(
        word => {

            const testLine =
                line +
                word +
                " ";


            if (
                ctx.measureText(
                    testLine
                ).width >
                maxWidth &&
                line !== ""
            ) {

                lines.push(
                    line.trim()
                );


                line =
                    word + " ";

            } else {

                line =
                    testLine;
            }
        }
    );


    if (line) {

        lines.push(
            line.trim()
        );
    }


    const lineHeight =
        22;


    const startY =
        y -
        (
            (lines.length - 1) *
            lineHeight
        ) / 2;


    lines.forEach(
        (
            currentLine,
            index
        ) => {

            ctx.fillText(
                currentLine,
                x,
                startY +
                index * lineHeight
            );
        }
    );
}


// =========================================
// DEFINITION TEXT WRAP
// =========================================

function drawCenteredWrappedText(
    text,
    centerX,
    startY,
    maxWidth,
    lineHeight
) {

    const words =
        String(text).split(" ");


    let line = "";

    const lines = [];


    words.forEach(
        word => {

            const testLine =
                line +
                word +
                " ";


            if (
                ctx.measureText(
                    testLine
                ).width >
                maxWidth &&
                line !== ""
            ) {

                lines.push(
                    line.trim()
                );


                line =
                    word + " ";

            } else {

                line =
                    testLine;
            }
        }
    );


    if (line) {

        lines.push(
            line.trim()
        );
    }


    const totalHeight =
        lines.length *
        lineHeight;


    let y =
        startY -
        totalHeight / 2;


    lines.forEach(
        currentLine => {

            ctx.fillText(
                currentLine,
                centerX,
                y
            );


            y +=
                lineHeight;
        }
    );
}


// =========================================
// CLICK HANDLER
// =========================================

canvas.onclick = (e) => {

    const x =
        e.offsetX;


    const y =
        e.offsetY;


    /*
     * PLAY AGAIN
     */

    if (
        gameOver &&
        playAgainButton.visible
    ) {

        if (
            x >=
                playAgainButton.x &&

            x <=
                playAgainButton.x +
                playAgainButton.width &&

            y >=
                playAgainButton.y &&

            y <=
                playAgainButton.y +
                playAgainButton.height
        ) {

            SoundFX.click();

            restartGame();
        }


        return;
    }


    /*
     * Ignore clicks after game over.
     */

    if (
        gameOver
    ) {

        return;
    }


    /*
     * Ignore definition panel.
     */

    if (
        y >=
        canvas.height -
        DEFINITION_HEIGHT
    ) {

        return;
    }


    /*
     * Check bubbles.
     */

    for (
        const b of bubbles
    ) {

        const dx =
            x - b.x;


        const dy =
            y - b.y;


        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (
            distance <
            b.r * 1.1
        ) {

            totalClicks++;


            /*
             * =================================
             * CORRECT ANSWER
             * =================================
             */

            if (
                b.correct
            ) {

                /*
                 * Play the BubbleWord-specific
                 * sound.
                 */

                SoundFX.bubblePop();


                /*
                 * Create visual pop.
                 */

                createPopEffect(b);


                correctCount++;


                score += 10;


                updateHUD();


                /*
                 * Remove bubble from game.
                 */

                bubbles =
                    bubbles.filter(
                        rem =>
                            rem !== b
                    );


                /*
                 * More bubbles remain.
                 */

                if (
                    bubbles.length > 0
                ) {

                    /*
                     * Pick a new target.
                     */

                    const next =
                        bubbles[
                            Math.floor(
                                Math.random() *
                                bubbles.length
                            )
                        ];


                    bubbles.forEach(
                        bubble => {

                            bubble.correct =
                                bubble === next;
                        }
                    );


                    /*
                     * Update definition.
                     */

                    currentDefinition =
                        vocab.find(
                            v =>
                                v.word ===
                                next.text
                        )?.meaning || "";


                } else {

                    /*
                     * Level complete.
                     */

                    score +=
                        timeLeft * 2;


                    /*
                     * Reward sound.
                     */

                    SoundFX.coin();


                    level++;


                    updateHUD();


                    /*
                     * Level-up sound.
                     */

                    SoundFX.levelUp();


                    createLevel();
                }


            /*
             * =================================
             * INCORRECT ANSWER
             * =================================
             */

            } else {

                SoundFX.incorrect();


                shotsLeft--;


                updateHUD();


                if (
                    shotsLeft <= 0
                ) {

                    endGame(
                        "OUT OF SHOTS!"
                    );
                }
            }


            break;
        }
    }
};


// =========================================
// GAME OVER
// =========================================

function endGame(
    message
) {

    if (gameOver) {
        return;
    }


    gameOver = true;


    clearInterval(timer);


    /*
     * Game-over sound.
     *
     * Time-up already has its own sound.
     */

    if (
        message !==
        "TIME'S UP!"
    ) {

        SoundFX.gameOver();
    }


    const accuracy =
        totalClicks > 0

            ? Math.round(
                (
                    correctCount /
                    totalClicks
                ) * 100
            )

            : 0;


    /*
     * Dark overlay.
     */

    ctx.fillStyle =
        "rgba(0,0,0,0.82)";


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
     * Message.
     */

    ctx.fillStyle =
        "white";


    ctx.textAlign =
        "center";


    ctx.textBaseline =
        "alphabetic";


    ctx.font =
        "44px Arial";


    ctx.fillText(
        message,
        canvas.width / 2,
        canvas.height / 2 - 100
    );


    /*
     * Final score.
     */

    ctx.font =
        "28px Arial";


    ctx.fillText(
        "Final Score: " +
        score,
        canvas.width / 2,
        canvas.height / 2 - 30
    );


    /*
     * Correct.
     */

    ctx.fillText(
        "Correct: " +
        correctCount,
        canvas.width / 2,
        canvas.height / 2 + 10
    );


    /*
     * Accuracy.
     */

    ctx.fillText(
        "Accuracy: " +
        accuracy +
        "%",
        canvas.width / 2,
        canvas.height / 2 + 50
    );


    /*
     * Play Again.
     */

    playAgainButton.x =
        canvas.width / 2 -
        playAgainButton.width / 2;


    playAgainButton.y =
        canvas.height / 2 +
        90;


    playAgainButton.visible =
        true;
}


// =========================================
// RESTART GAME
// =========================================

function restartGame() {

    score = 0;

    level = 1;

    correctCount = 0;

    totalClicks = 0;

    gameOver = false;

    currentDefinition = "";

    popEffects = [];


    updateHUD();


    playAgainButton.visible =
        false;


    SoundFX.start();


    createLevel();
}


// =========================================
// GAME LOOP
// =========================================

function loop() {

    update();

    draw();


    requestAnimationFrame(
        loop
    );
}


loop();


// =========================================
// SIGNAL READY
// =========================================

window.dispatchEvent(
    new Event(
        "bubbleword-ready"
    )
);
