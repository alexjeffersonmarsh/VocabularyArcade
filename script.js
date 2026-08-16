// =========================================
// BUBBLEWORD
// Main Game Script
// =========================================

// =========================================
// CANVAS SETUP
// =========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// =========================================
// GAME LAYOUT
// =========================================

// Height reserved at the bottom for:
// 1. HUD
// 2. Vocabulary definition

const HUD_HEIGHT = 85;
const DEFINITION_HEIGHT = 145;

const BOTTOM_RESERVED =
    HUD_HEIGHT + DEFINITION_HEIGHT;

// Keep bubbles away from the top HUD area
const TOP_RESERVED = 25;


// =========================================
// RESIZE CANVAS
// =========================================

function resizeCanvas() {

    const panel =
        document.getElementById("teacher-panel");

    const panelWidth =
        panel &&
        panel.style.display !== "none"
            ? panel.offsetWidth
            : 0;

    const availableWidth =
        window.innerWidth - panelWidth;

    const availableHeight =
        window.innerHeight;

    canvas.width =
        Math.max(
            320,
            availableWidth
        );

    canvas.height =
        Math.max(
            500,
            availableHeight
        );

    // Keep Play Again button centered
    if (playAgainButton) {

        playAgainButton.x =
            canvas.width / 2 -
            playAgainButton.width / 2;

        playAgainButton.y =
            canvas.height / 2 + 90;

    }

    // Keep existing bubbles inside the
    // newly resized playable area.
    if (bubbles.length > 0) {

        constrainAllBubbles();

    }

}


// =========================================
// INITIAL RESIZE
// =========================================

resizeCanvas();

window.addEventListener(
    "resize",
    resizeCanvas
);


// =========================================
// SOUND SYSTEM
// =========================================

let soundOn = true;


const pop =
    new Audio(
        "https://actions.google.com/sounds/v1/bubbles/bubble_pop.ogg"
    );


const miss =
    new Audio(
        "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
    );


function playPop() {

    if (!soundOn) return;

    pop.currentTime = 0;

    pop.play().catch(() => {});

}


function playMiss() {

    if (!soundOn) return;

    miss.currentTime = 0;

    miss.play().catch(() => {});

}


// =========================================
// MUTE BUTTON
// =========================================

const muteButton =
    document.getElementById("mute-btn");


if (muteButton) {

    muteButton.onclick = () => {

        soundOn = !soundOn;

        muteButton.textContent =
            soundOn ? "🔊" : "🔇";

    };

}


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

let currentDefinition = "";

let timer;

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
// OLD HTML HUD REFERENCES
// =========================================

// These are retained so the existing HTML
// continues to work if those elements exist.

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
// SAFE HUD UPDATE
// =========================================

function updateHTMLHud() {

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

window.startLoadedGame = function() {

    if (
        !window.preloadedVocab ||
        window.preloadedVocab.length < 5
    ) {

        alert(
            "No valid vocabulary loaded."
        );

        return;

    }


    // =====================================
    // NORMALIZE VOCABULARY
    // =====================================

    vocab =
        window.preloadedVocab
            .map(v => ({

                word:
                    v.word,

                meaning:
                    v.meaning ||
                    v.definition ||
                    ""

            }))
            .filter(v =>
                v.word &&
                v.meaning
            );


    if (vocab.length < 5) {

        alert(
            "Not enough valid vocabulary items."
        );

        return;

    }


    // =====================================
    // HIDE TEACHER PANEL
    // =====================================

    const teacherPanel =
        document.getElementById(
            "teacher-panel"
        );


    if (teacherPanel) {

        teacherPanel.style.display =
            "none";

    }


    // =====================================
    // RESET GAME
    // =====================================

    resizeCanvas();

    score = 0;

    level = 1;

    correctCount = 0;

    totalClicks = 0;

    currentDefinition = "";

    gameOver = false;


    updateHTMLHud();


    if (targetWordDisplay) {

        targetWordDisplay.textContent =
            "";

    }


    playAgainButton.visible =
        false;


    createLevel();

};


// =========================================
// CREATE LEVEL
// =========================================

function createLevel() {

    bubbles = [];

    gameOver = false;

    shotsLeft = 20;

    updateHTMLHud();

    startTimer();


    // =====================================
    // SELECT VOCABULARY
    // =====================================

    const selected =
        [...vocab]
            .sort(
                () =>
                    Math.random() - 0.5
            )
            .slice(0, 10);


    if (selected.length === 0) {

        endGame(
            "NO VOCABULARY"
        );

        return;

    }


    // =====================================
    // CHOOSE TARGET
    // =====================================

    const answer =
        selected[
            Math.floor(
                Math.random() *
                selected.length
            )
        ];


    currentDefinition =
        answer.meaning;


    if (targetWordDisplay) {

        targetWordDisplay.textContent =
            "";

    }


    // =====================================
    // BUBBLE SIZE
    // =====================================

    const radius =
        Math.min(
            80,
            Math.max(
                55,
                canvas.width / 13
            )
        );


    // =====================================
    // PLAYABLE AREA
    // =====================================

    const playableLeft =
        radius;


    const playableRight =
        canvas.width -
        radius;


    const playableTop =
        TOP_RESERVED +
        radius;


    const playableBottom =
        canvas.height -
        BOTTOM_RESERVED -
        radius;


    // Make absolutely sure the area is valid
    const safeTop =
        Math.min(
            playableTop,
            canvas.height / 2
        );


    const safeBottom =
        Math.max(
            playableBottom,
            safeTop + 20
        );


    // =====================================
    // CREATE BUBBLES
    // =====================================

    selected.forEach(item => {

        let x = 0;

        let y = 0;

        let safe = false;

        let attempts = 0;


        // ---------------------------------
        // FIND NON-OVERLAPPING POSITION
        // ---------------------------------

        while (
            !safe &&
            attempts < 1000
        ) {

            attempts++;


            x =
                playableLeft +
                Math.random() *
                Math.max(
                    1,
                    playableRight -
                    playableLeft
                );


            y =
                safeTop +
                Math.random() *
                Math.max(
                    1,
                    safeBottom -
                    safeTop
                );


            safe = true;


            for (
                const other of bubbles
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


                // Keep bubbles separated
                if (
                    distance <
                    radius * 2.05
                ) {

                    safe = false;

                    break;

                }

            }

        }


        // ---------------------------------
        // FALLBACK POSITION
        // ---------------------------------

        if (!safe) {

            // Use a grid-like fallback
            // instead of allowing the bubble
            // to appear outside the canvas.

            const index =
                bubbles.length;

            const columns =
                Math.max(
                    1,
                    Math.floor(
                        canvas.width /
                        (radius * 2.2)
                    )
                );


            const column =
                index % columns;


            const row =
                Math.floor(
                    index / columns
                );


            x =
                Math.min(
                    playableRight,
                    playableLeft +
                    column *
                    radius *
                    2.1
                );


            y =
                Math.min(
                    safeBottom,
                    safeTop +
                    row *
                    radius *
                    2.1
                );

        }


        // =================================
        // MOVEMENT SPEED
        // =================================

        const speed =
            (level - 1) * 0.8;


        bubbles.push({

            x: x,

            y: y,

            r: radius,

            text:
                item.word,

            correct:
                item.word === answer.word,

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

    updateHTMLHud();


    timer =
        setInterval(() => {

            if (gameOver) {

                clearInterval(timer);

                return;

            }


            timeLeft--;

            updateHTMLHud();


            if (
                timeLeft <= 0
            ) {

                playMiss();

                endGame(
                    "TIME'S UP!"
                );

            }

        }, 1000);

}


// =========================================
// GET PLAYABLE BOUNDS
// =========================================

function getPlayableBounds(radius) {

    return {

        left:
            radius,

        right:
            Math.max(
                radius,
                canvas.width - radius
            ),

        top:
            TOP_RESERVED +
            radius,

        bottom:
            Math.max(
                TOP_RESERVED +
                radius,
                canvas.height -
                BOTTOM_RESERVED -
                radius
            )

    };

}


// =========================================
// KEEP BUBBLE INSIDE SCREEN
// =========================================

function constrainBubble(b) {

    const bounds =
        getPlayableBounds(b.r);


    // LEFT
    if (
        b.x < bounds.left
    ) {

        b.x =
            bounds.left;

        b.vx =
            Math.abs(b.vx);

    }


    // RIGHT
    if (
        b.x > bounds.right
    ) {

        b.x =
            bounds.right;

        b.vx =
            -Math.abs(b.vx);

    }


    // TOP
    if (
        b.y < bounds.top
    ) {

        b.y =
            bounds.top;

        b.vy =
            Math.abs(b.vy);

    }


    // BOTTOM
    if (
        b.y > bounds.bottom
    ) {

        b.y =
            bounds.bottom;

        b.vy =
            -Math.abs(b.vy);

    }

}


// =========================================
// CONSTRAIN ALL BUBBLES
// =========================================

function constrainAllBubbles() {

    bubbles.forEach(
        constrainBubble
    );

}


// =========================================
// UPDATE
// =========================================

function update() {

    if (gameOver) {

        return;

    }


    bubbles.forEach(b => {

        // =================================
        // LEVEL 1
        // =================================

        if (level === 1) {

            // Bubbles stay still

            constrainBubble(b);

            return;

        }


        // =================================
        // LEVEL 2+
        // =================================

        if (level >= 2) {

            b.x += b.vx;

        }


        // =================================
        // LEVEL 3+
        // =================================

        if (level >= 3) {

            b.y += b.vy;

        }


        // =================================
        // LEVEL 5+
        // =================================

        if (level >= 5) {

            b.vx +=
                (Math.random() - 0.5) *
                0.05;

            b.vy +=
                (Math.random() - 0.5) *
                0.05;


            // Prevent excessive speed

            const maxSpeed = 3;

            b.vx =
                Math.max(
                    -maxSpeed,
                    Math.min(
                        maxSpeed,
                        b.vx
                    )
                );

            b.vy =
                Math.max(
                    -maxSpeed,
                    Math.min(
                        maxSpeed,
                        b.vy
                    )
                );

        }


        // =================================
        // SCREEN BOUNDARIES
        // =================================

        constrainBubble(b);

    });

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


    // =====================================
    // DRAW BUBBLES
    // =====================================

    bubbles.forEach(b => {

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


        // =================================
        // BUBBLE GRADIENT
        // =================================

        const gradient =
            ctx.createRadialGradient(

                b.x -
                    b.r * 0.3,

                b.y -
                    b.r * 0.3,

                b.r * 0.2,

                b.x,

                b.y,

                b.r

            );


        gradient.addColorStop(
            0,
            "rgba(255,255,255,0.95)"
        );


        gradient.addColorStop(
            0.4,
            "rgba(200,230,255,0.65)"
        );


        gradient.addColorStop(
            1,
            "rgba(150,200,255,0.35)"
        );


        ctx.fillStyle =
            gradient;


        ctx.fill();


        ctx.strokeStyle =
            "rgba(255,255,255,0.75)";


        ctx.lineWidth = 2;

        ctx.stroke();


        // =================================
        // WORD
        // =================================

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

    });


    // =====================================
    // BOTTOM HUD
    // =====================================

    const hudY =
        canvas.height -
        BOTTOM_RESERVED;


    ctx.fillStyle =
        "rgba(255,255,255,0.95)";


    ctx.fillRect(

        0,

        hudY,

        canvas.width,

        HUD_HEIGHT

    );


    // Top border

    ctx.strokeStyle =
        "rgba(70,140,180,0.35)";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(
        0,
        hudY
    );

    ctx.lineTo(
        canvas.width,
        hudY
    );

    ctx.stroke();


    // =====================================
    // HUD TEXT
    // =====================================

    const hudCenterY =
        hudY +
        HUD_HEIGHT / 2;


    ctx.textBaseline =
        "middle";


    ctx.font =
        "bold 20px Arial";


    // Score

    ctx.fillStyle =
        "#1d3d57";


    ctx.textAlign =
        "left";


    ctx.fillText(

        "SCORE: " + score,

        25,

        hudCenterY

    );


    // Level

    ctx.textAlign =
        "center";


    ctx.fillText(

        "LEVEL: " + level,

        canvas.width / 2,

        hudCenterY

    );


    // Timer

    ctx.fillStyle =
        timeLeft <= 10
            ? "#e53935"
            : "#1d3d57";


    ctx.textAlign =
        "right";


    ctx.fillText(

        "TIME: " +
        timeLeft,

        canvas.width - 25,

        hudCenterY

    );


    // =====================================
    // SHOTS
    // =====================================

    ctx.textAlign =
        "center";


    ctx.fillStyle =
        "#1d3d57";


    ctx.font =
        "bold 18px Arial";


    ctx.fillText(

        "SHOTS: " +
        shotsLeft,

        canvas.width / 2,

        hudCenterY + 27

    );


    // =====================================
    // BOTTOM DEFINITION PANEL
    // =====================================

    const definitionY =
        canvas.height -
        DEFINITION_HEIGHT;


    ctx.fillStyle =
        "rgba(20,55,75,0.94)";


    ctx.fillRect(

        0,

        definitionY,

        canvas.width,

        DEFINITION_HEIGHT

    );


    // =====================================
    // DEFINITION BORDER
    // =====================================

    ctx.strokeStyle =
        "rgba(255,255,255,0.4)";

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


    // =====================================
    // QUESTION LABEL
    // =====================================

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


    // =====================================
    // DEFINITION
    // =====================================

    if (currentDefinition) {

        ctx.font =
            "bold 24px Arial";


        ctx.fillStyle =
            "#ffffff";


        drawCenteredWrappedText(

            currentDefinition,

            canvas.width / 2,

            definitionY + 82,

            canvas.width - 80,

            28

        );

    }


    // =====================================
    // PLAY AGAIN BUTTON
    // =====================================

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
            "middle";


        ctx.fillText(

            "Play Again",

            canvas.width / 2,

            playAgainButton.y +
            playAgainButton.height / 2

        );

    }

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


    words.forEach(word => {

        const testLine =
            line +
            word +
            " ";


        if (
            ctx.measureText(testLine).width >
                maxWidth &&
            line !== ""
        ) {

            lines.push(
                line.trim()
            );


            line =
                word + " ";

        }
        else {

            line =
                testLine;

        }

    });


    if (line) {

        lines.push(
            line.trim()
        );

    }


    const lineHeight = 22;


    const startY =
        y -
        (
            (lines.length - 1) *
            lineHeight
        ) / 2;


    lines.forEach(
        (currentLine, index) => {

            ctx.fillText(

                currentLine,

                x,

                startY +
                index *
                lineHeight

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


    words.forEach(word => {

        const testLine =
            line +
            word +
            " ";


        if (
            ctx.measureText(testLine).width >
                maxWidth &&
            line !== ""
        ) {

            lines.push(
                line.trim()
            );


            line =
                word + " ";

        }
        else {

            line =
                testLine;

        }

    });


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


            y += lineHeight;

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


    // =====================================
    // PLAY AGAIN
    // =====================================

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

            restartGame();

        }


        return;

    }


    if (gameOver) {

        return;

    }


    // =====================================
    // IGNORE BOTTOM HUD
    // =====================================

    if (
        y >=
        canvas.height -
        BOTTOM_RESERVED
    ) {

        return;

    }


    // =====================================
    // CHECK BUBBLES
    // =====================================

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


            // =================================
            // CORRECT ANSWER
            // =================================

            if (b.correct) {

                playPop();

                correctCount++;

                score += 10;


                updateHTMLHud();


                // Remove clicked bubble

                bubbles =
                    bubbles.filter(
                        rem =>
                            rem !== b
                    );


                // =================================
                // MORE BUBBLES REMAIN
                // =================================

                if (
                    bubbles.length > 0
                ) {

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
                                (
                                    bubble ===
                                    next
                                );

                        }
                    );


                    // Update definition

                    currentDefinition =
                        next.text
                            ? (
                                vocab.find(
                                    v =>
                                        v.word ===
                                        next.text
                                )?.meaning || ""
                            )
                            : "";

                }


                // =================================
                // LEVEL COMPLETE
                // =================================

                else {

                    score +=
                        timeLeft * 2;


                    level++;


                    updateHTMLHud();


                    createLevel();

                }

            }


            // =================================
            // INCORRECT ANSWER
            // =================================

            else {

                playMiss();


                shotsLeft--;


                updateHTMLHud();


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

function endGame(message) {

    gameOver = true;


    clearInterval(timer);


    const accuracy =
        totalClicks > 0

            ? Math.round(

                (
                    correctCount /
                    totalClicks
                ) * 100

            )

            : 0;


    // =====================================
    // DARK OVERLAY
    // =====================================

    ctx.fillStyle =
        "rgba(0,0,0,0.82)";


    ctx.fillRect(

        0,

        0,

        canvas.width,

        canvas.height

    );


    // =====================================
    // GAME OVER MESSAGE
    // =====================================

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


    // =====================================
    // FINAL SCORE
    // =====================================

    ctx.font =
        "28px Arial";


    ctx.fillText(

        "Final Score: " +
        score,

        canvas.width / 2,

        canvas.height / 2 - 30

    );


    // =====================================
    // CORRECT ANSWERS
    // =====================================

    ctx.fillText(

        "Correct: " +
        correctCount,

        canvas.width / 2,

        canvas.height / 2 + 10

    );


    // =====================================
    // ACCURACY
    // =====================================

    ctx.fillText(

        "Accuracy: " +
        accuracy +
        "%",

        canvas.width / 2,

        canvas.height / 2 + 50

    );


    // =====================================
    // PLAY AGAIN BUTTON
    // =====================================

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


    updateHTMLHud();


    playAgainButton.visible =
        false;


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
// SIGNAL THAT SCRIPT IS READY
// =========================================

window.dispatchEvent(
    new Event("bubbleword-ready")
);
