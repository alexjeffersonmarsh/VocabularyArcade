// =========================================
// BUBBLEWORD Main Game Script
// =========================================

// =========================================
// CANVAS
// =========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// =========================================
// GAME CONSTANTS
// =========================================

// Height reserved at bottom for
// the game information and definition.
const BOTTOM_PANEL_HEIGHT = 190;

// Bubble radius.
const BUBBLE_RADIUS = 90;

// Minimum distance between bubbles.
const BUBBLE_SPACING = 2.35;

// Starting number of bubbles.
const BUBBLE_COUNT = 10;


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

let timer = null;
let gameOver = false;


// =========================================
// PLAY AGAIN BUTTON
// IMPORTANT:
// This MUST be declared before
// resizeCanvas() is called.
// =========================================

let playAgainButton = {

    x: 0,

    y: 0,

    width: 220,

    height: 60,

    visible: false

};


// =========================================
// HUD ELEMENTS
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
// MUTE BUTTON
// =========================================

const muteButton =
    document.getElementById("mute-btn");

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


if (muteButton) {

    muteButton.onclick = () => {

        soundOn = !soundOn;

        muteButton.textContent =
            soundOn ? "🔊" : "🔇";

    };

}


// =========================================
// CANVAS RESIZE
// =========================================

function resizeCanvas() {

    const gameContainer =
        document.getElementById("game-container");


    if (!gameContainer) return;


    // Get the actual visible size
    // of the game container.

    const width =
        gameContainer.clientWidth;

    const height =
        gameContainer.clientHeight;


    canvas.width =
        Math.max(
            320,
            width
        );


    canvas.height =
        Math.max(
            500,
            height
        );


    // Keep Play Again centered.

    playAgainButton.x =
        canvas.width / 2 -
        playAgainButton.width / 2;


    playAgainButton.y =
        canvas.height / 2 +
        90;


    // Keep existing bubbles inside
    // the new canvas if the window
    // is resized.

    keepBubblesOnScreen();

}


window.addEventListener(
    "resize",
    resizeCanvas
);


// =========================================
// START GAME
// =========================================

window.startLoadedGame = function () {

    if (
        !window.preloadedVocab ||
        window.preloadedVocab.length < 5
    ) {

        alert(
            "No valid vocabulary loaded."
        );

        return;

    }


    // Normalize Firebase vocabulary.

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
            "Not enough valid vocabulary items loaded."
        );

        return;

    }


    // Hide teacher panel.

    const teacherPanel =
        document.getElementById(
            "teacher-panel"
        );


    if (teacherPanel) {

        teacherPanel.style.display =
            "none";

    }


    // Reset canvas.

    resizeCanvas();


    // Reset game.

    score = 0;

    level = 1;

    correctCount = 0;

    totalClicks = 0;

    currentDefinition = "";

    gameOver = false;


    // Update HUD.

    if (scoreDisplay) {

        scoreDisplay.textContent =
            score;

    }


    if (levelDisplay) {

        levelDisplay.textContent =
            level;

    }


    if (targetWordDisplay) {

        targetWordDisplay.textContent =
            "";

    }


    playAgainButton.visible =
        false;


    // Start first level.

    createLevel();

};


// =========================================
// CREATE LEVEL
// =========================================

function createLevel() {

    bubbles = [];

    gameOver = false;


    // Reset shots.

    shotsLeft = 20;


    if (attemptsDisplay) {

        attemptsDisplay.textContent =
            shotsLeft;

    }


    // Start timer.

    startTimer();


    // Select up to 10 vocabulary items.

    const selected =
        [...vocab]
            .sort(
                () =>
                    Math.random() - 0.5
            )
            .slice(
                0,
                BUBBLE_COUNT
            );


    if (selected.length === 0) {

        endGame(
            "NO VOCABULARY"
        );

        return;

    }


    // Choose the correct answer.

    const answer =
        selected[
            Math.floor(
                Math.random() *
                selected.length
            )
        ];


    // The definition is the question.

    currentDefinition =
        answer.meaning;


    if (targetWordDisplay) {

        targetWordDisplay.textContent =
            "";

    }


    // Create bubbles.

    selected.forEach(item => {

        const position =
            findSafeBubblePosition();


        // Bubble speed increases
        // with level.

        const speed =
            Math.max(
                0,
                (level - 1) * 1
            );


        bubbles.push({

            x:
                position.x,

            y:
                position.y,

            r:
                BUBBLE_RADIUS,

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
// FIND SAFE BUBBLE POSITION
// =========================================

function findSafeBubblePosition() {

    const radius =
        BUBBLE_RADIUS;


    // Keep bubbles below the top HUD
    // area and above the bottom panel.

    const topLimit =
        radius + 25;


    const bottomLimit =
        Math.max(
            topLimit,
            canvas.height -
            BOTTOM_PANEL_HEIGHT -
            radius
        );


    const leftLimit =
        radius;


    const rightLimit =
        Math.max(
            leftLimit,
            canvas.width -
            radius
        );


    // Try many random positions.

    for (
        let attempt = 0;
        attempt < 1000;
        attempt++
    ) {

        const x =
            leftLimit +
            Math.random() *
            Math.max(
                1,
                rightLimit -
                leftLimit
            );


        const y =
            topLimit +
            Math.random() *
            Math.max(
                1,
                bottomLimit -
                topLimit
            );


        let safe = true;


        // Check against existing bubbles.

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


            if (
                distance <
                radius * BUBBLE_SPACING
            ) {

                safe = false;

                break;

            }

        }


        if (safe) {

            return {
                x,
                y
            };

        }

    }


    // If the board is crowded,
    // use a grid-style fallback.

    const index =
        bubbles.length;


    const columns =
        Math.max(
            1,
            Math.floor(
                canvas.width /
                (radius * 2.1)
            )
        );


    const column =
        index % columns;


    const row =
        Math.floor(
            index / columns
        );


    const x =
        Math.min(
            rightLimit,
            leftLimit +
            column *
            radius *
            2.1
        );


    const y =
        Math.min(
            bottomLimit,
            topLimit +
            row *
            radius *
            2.0
        );


    return {
        x,
        y
    };

}


// =========================================
// KEEP BUBBLES ON SCREEN
// =========================================

function keepBubblesOnScreen() {

    const topLimit =
        BUBBLE_RADIUS + 25;


    const bottomLimit =
        Math.max(
            topLimit,
            canvas.height -
            BOTTOM_PANEL_HEIGHT -
            BUBBLE_RADIUS
        );


    bubbles.forEach(b => {

        if (
            b.x <
            b.r
        ) {

            b.x =
                b.r;

        }


        if (
            b.x >
            canvas.width -
            b.r
        ) {

            b.x =
                canvas.width -
                b.r;

        }


        if (
            b.y <
            topLimit
        ) {

            b.y =
                topLimit;

        }


        if (
            b.y >
            bottomLimit
        ) {

            b.y =
                bottomLimit;

        }

    });

}


// =========================================
// TIMER
// =========================================

function startTimer() {

    clearInterval(timer);


    timeLeft = 60;


    if (timerDisplay) {

        timerDisplay.textContent =
            timeLeft;

    }


    timer =
        setInterval(() => {

            if (gameOver) {

                clearInterval(timer);

                return;

            }


            timeLeft--;


            if (timerDisplay) {

                timerDisplay.textContent =
                    timeLeft;

            }


            if (
                timeLeft <= 0
            ) {

                clearInterval(timer);

                playMiss();

                endGame(
                    "TIME'S UP!"
                );

            }

        }, 1000);

}


// =========================================
// UPDATE
// =========================================

function update() {

    if (gameOver) return;


    bubbles.forEach(b => {

        // Level 1:
        // bubbles remain still.

        if (
            level === 1
        ) {

            return;

        }


        // Level 2+:
        // horizontal movement.

        if (
            level >= 2
        ) {

            b.x += b.vx;

        }


        // Level 3+:
        // vertical movement.

        if (
            level >= 3
        ) {

            b.y += b.vy;

        }


        // Level 5+:
        // slight random movement.

        if (
            level >= 5
        ) {

            b.vx +=
                (Math.random() - 0.5) *
                0.1;


            b.vy +=
                (Math.random() - 0.5) *
                0.1;


            // Prevent excessive speed.

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


        // LEFT WALL

        if (
            b.x <
            b.r
        ) {

            b.x =
                b.r;

            b.vx =
                Math.abs(b.vx);

        }


        // RIGHT WALL

        if (
            b.x >
            canvas.width -
            b.r
        ) {

            b.x =
                canvas.width -
                b.r;

            b.vx =
                -Math.abs(b.vx);

        }


        // TOP WALL

        const topLimit =
            b.r + 25;


        if (
            b.y <
            topLimit
        ) {

            b.y =
                topLimit;

            b.vy =
                Math.abs(b.vy);

        }


        // BOTTOM WALL

        const bottomLimit =
            Math.max(
                topLimit,
                canvas.height -
                BOTTOM_PANEL_HEIGHT -
                b.r
            );


        if (
            b.y >
            bottomLimit
        ) {

            b.y =
                bottomLimit;

            b.vy =
                -Math.abs(b.vy);

        }

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


        // Bubble gradient.

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
            "rgba(100,190,255,0.35)"
        );


        ctx.fillStyle =
            gradient;


        ctx.fill();


        ctx.strokeStyle =
            "rgba(255,255,255,0.7)";


        ctx.lineWidth =
            2;


        ctx.stroke();


        // Bubble word.

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
    // BOTTOM INFORMATION PANEL
    // =====================================

    const panelY =
        canvas.height -
        BOTTOM_PANEL_HEIGHT;


    // Panel background.

    ctx.fillStyle =
        "rgba(255,255,255,0.96)";


    ctx.fillRect(

        0,

        panelY,

        canvas.width,

        BOTTOM_PANEL_HEIGHT

    );


    // Top border.

    ctx.strokeStyle =
        "#cde7f5";


    ctx.lineWidth =
        4;


    ctx.beginPath();


    ctx.moveTo(
        0,
        panelY
    );


    ctx.lineTo(
        canvas.width,
        panelY
    );


    ctx.stroke();


    // =====================================
    // BOTTOM HUD
    // =====================================

    const hudY =
        panelY + 38;


    ctx.font =
        "bold 20px Arial";


    ctx.textAlign =
        "center";


    ctx.textBaseline =
        "middle";


    // Score.

    ctx.fillStyle =
        "#1d3d57";


    ctx.fillText(

        "SCORE: " + score,

        canvas.width * 0.15,

        hudY

    );


    // Level.

    ctx.fillText(

        "LEVEL: " + level,

        canvas.width * 0.35,

        hudY

    );


    // Timer.

    ctx.fillStyle =
        "#d94a4a";


    ctx.fillText(

        "TIME: " + timeLeft,

        canvas.width * 0.55,

        hudY

    );


    // Shots.

    ctx.fillStyle =
        "#1d3d57";


    ctx.fillText(

        "SHOTS: " + shotsLeft,

        canvas.width * 0.78,

        hudY

    );


    // =====================================
    // DEFINITION QUESTION
    // =====================================

    ctx.fillStyle =
        "#5a6d7c";


    ctx.font =
        "bold 16px Arial";


    ctx.fillText(

        "FIND THE WORD FOR:",

        canvas.width / 2,

        panelY + 78

    );


    // Definition.

    if (currentDefinition) {

        ctx.fillStyle =
            "#123a52";


        ctx.font =
            "bold 24px Arial";


        drawCenteredWrappedText(

            currentDefinition,

            canvas.width / 2,

            panelY + 120,

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
            "bold 22px Arial";


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
// DRAW BUBBLE TEXT
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


    const lineHeight =
        22;


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

    centerY,

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
        centerY -
        totalHeight / 2 +
        lineHeight / 2;


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

canvas.addEventListener(
    "click",
    (e) => {

        const rect =
            canvas.getBoundingClientRect();


        // Convert mouse coordinates
        // to actual canvas coordinates.

        const scaleX =
            canvas.width /
            rect.width;


        const scaleY =
            canvas.height /
            rect.height;


        const x =
            (e.clientX -
                rect.left) *
            scaleX;


        const y =
            (e.clientY -
                rect.top) *
            scaleY;


        // =================================
        // PLAY AGAIN
        // =================================

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


        // Ignore clicks in bottom panel.

        if (
            y >=
            canvas.height -
            BOTTOM_PANEL_HEIGHT
        ) {

            return;

        }


        // Check bubbles.

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


                    if (scoreDisplay) {

                        scoreDisplay.textContent =
                            score;

                    }


                    // Remove clicked bubble.

                    bubbles =
                        bubbles.filter(
                            rem =>
                                rem !== b
                        );


                    // More bubbles remain.

                    if (
                        bubbles.length > 0
                    ) {

                        // Pick a new correct bubble.

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


                        // Update definition.

                        currentDefinition =
                            vocab.find(
                                v =>
                                    v.word ===
                                    next.text
                            )?.meaning || "";

                    }


                    // Level complete.

                    else {

                        // Time bonus.

                        score +=
                            timeLeft * 2;


                        if (scoreDisplay) {

                            scoreDisplay.textContent =
                                score;

                        }


                        level++;


                        if (levelDisplay) {

                            levelDisplay.textContent =
                                level;

                        }


                        createLevel();

                    }

                }


                // =================================
                // INCORRECT ANSWER
                // =================================

                else {

                    playMiss();


                    shotsLeft--;


                    if (attemptsDisplay) {

                        attemptsDisplay.textContent =
                            shotsLeft;

                    }


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

    }
);


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


    // Dark overlay.

    ctx.fillStyle =
        "rgba(0,0,0,0.82)";


    ctx.fillRect(

        0,

        0,

        canvas.width,

        canvas.height

    );


    // Message.

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


    // Final score.

    ctx.font =
        "28px Arial";


    ctx.fillText(

        "Final Score: " +
        score,

        canvas.width / 2,

        canvas.height / 2 - 30

    );


    // Correct.

    ctx.fillText(

        "Correct: " +
        correctCount,

        canvas.width / 2,

        canvas.height / 2 + 10

    );


    // Accuracy.

    ctx.fillText(

        "Accuracy: " +
        accuracy +
        "%",

        canvas.width / 2,

        canvas.height / 2 + 50

    );


    // Play Again.

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

    clearInterval(timer);


    score = 0;

    level = 1;

    correctCount = 0;

    totalClicks = 0;

    gameOver = false;

    currentDefinition = "";


    if (scoreDisplay) {

        scoreDisplay.textContent =
            score;

    }


    if (levelDisplay) {

        levelDisplay.textContent =
            level;

    }


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


// =========================================
// INITIALIZE
// =========================================

// Set an initial canvas size.
// This happens AFTER all variables
// have been declared.

resizeCanvas();


// Start the rendering loop.

loop();


// =========================================
// TELL FIREBASE LOADER THAT THE
// GAME SCRIPT IS READY
// =========================================

window.dispatchEvent(
    new Event("bubbleword-ready")
);
