// =========================================
// BUBBLEWORD
// Main Game Script
// =========================================


// =========================================
// CANVAS SETUP
// =========================================

const canvas =
    document.getElementById("gameCanvas");

const ctx =
    canvas.getContext("2d");


/*
 * Height reserved at the bottom
 * for the vocabulary definition.
 */

const DEFINITION_HEIGHT = 140;


/*
 * Resize the game canvas.
 */

function resizeCanvas() {

    const panel =
        document.getElementById("teacher-panel");

    const panelWidth =
        panel && panel.style.display !== "none"
            ? panel.offsetWidth
            : 0;


    canvas.width =
        Math.max(
            320,
            window.innerWidth - panelWidth
        );


    canvas.height =
        Math.max(
            500,
            window.innerHeight
        );


    /*
     * Keep the Play Again button
     * centered after resizing.
     */

    if (playAgainButton) {

        playAgainButton.x =
            canvas.width / 2 -
            playAgainButton.width / 2;

        playAgainButton.y =
            canvas.height / 2 + 90;

    }

}


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


/*
 * The definition currently being tested.
 */

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


/*
 * We no longer use the target word
 * as the question.
 *
 * The definition is now displayed
 * at the bottom of the screen.
 */

const targetWordDisplay =
    document.getElementById("target-word");


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


    /*
     * Normalize Firebase vocabulary.
     *
     * Supports both:
     *
     * definition
     *
     * and
     *
     * meaning
     */

    vocab =
        window.preloadedVocab.map(v => ({

            word:
                v.word,

            meaning:
                v.meaning ||
                v.definition ||
                ""

        }));


    /*
     * Hide any remaining teacher panel.
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


    score = 0;

    level = 1;

    correctCount = 0;

    totalClicks = 0;

    currentDefinition = "";


    scoreDisplay.textContent =
        score;


    levelDisplay.textContent =
        level;


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


    attemptsDisplay.textContent =
        shotsLeft;


    startTimer();


    /*
     * Pick up to 10 vocabulary items.
     */

    let selected =
        [...vocab]
            .sort(
                () =>
                    Math.random() - 0.5
            )
            .slice(0, 10);


    /*
     * Choose the vocabulary word
     * that the player needs to find.
     */

    const answer =
        selected[
            Math.floor(
                Math.random() *
                selected.length
            )
        ];


    /*
     * IMPORTANT:
     *
     * The definition is now the question.
     *
     * We do NOT display the answer word.
     */

    currentDefinition =
        answer.meaning;


    if (targetWordDisplay) {

        targetWordDisplay.textContent =
            "";

    }


    /*
     * Create the bubbles.
     */

    selected.forEach(item => {

        const radius = 90;


        let x;

        let y;

        let safe = false;


        /*
         * Playable area:
         *
         * Top:
         * 110px
         *
         * Bottom:
         * definition panel
         *
         * This prevents bubbles from
         * appearing underneath the
         * definition.
         */

        const playableTop =
            radius + 100;


        const playableBottom =
            canvas.height -
            DEFINITION_HEIGHT -
            radius;


        /*
         * Safety check for small screens.
         */

        const availableHeight =
            Math.max(
                1,
                playableBottom -
                playableTop
            );


        /*
         * Try to find a location that
         * does not overlap another bubble.
         */

        let attempts = 0;


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
                let other of bubbles
            ) {

                const dx =
                    x - other.x;


                const dy =
                    y - other.y;


                const dist =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (
                    dist <
                    radius * 2.4
                ) {

                    safe = false;

                    break;

                }

            }

        }


        /*
         * If the board gets crowded,
         * use a safe fallback position.
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
         * Bubble movement increases
         * with the level.
         */

        let speed =
            (level - 1) * 1;


        bubbles.push({

            x: x,

            y: y,

            r: radius,

            /*
             * The bubble contains the
             * VOCABULARY WORD.
             */

            text:
                item.word,

            /*
             * Only the answer bubble
             * is correct.
             */

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


    timerDisplay.textContent =
        timeLeft;


    timer =
        setInterval(() => {

            timeLeft--;


            timerDisplay.textContent =
                timeLeft;


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
// UPDATE
// =========================================

function update() {

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

            b.x += b.vx;

        }


        /*
         * Level 3+:
         * vertical movement.
         */

        if (
            level >= 3
        ) {

            b.y += b.vy;

        }


        /*
         * Level 5+:
         * slight random movement.
         */

        if (
            level >= 5
        ) {

            b.vx +=
                (Math.random() - 0.5) *
                0.1;


            b.vy +=
                (Math.random() - 0.5) *
                0.1;

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
            canvas.width - b.r
        ) {

            b.x =
                canvas.width - b.r;

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
         *
         * Leave room for the
         * definition panel.
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
     * =====================================
     * DRAW BUBBLES
     * =====================================
     */

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


        /*
         * Bubble gradient
         */

        let gradient =
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
         * =================================
         * WORD INSIDE BUBBLE
         * =================================
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

    });


    /*
     * =====================================
     * BOTTOM DEFINITION PANEL
     * =====================================
     */

    const definitionY =
        canvas.height -
        DEFINITION_HEIGHT;


    /*
     * Panel background
     */

    ctx.fillStyle =
        "rgba(0,0,0,0.82)";


    ctx.fillRect(
        0,
        definitionY,
        canvas.width,
        DEFINITION_HEIGHT
    );


    /*
     * Top border
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
     * Question label
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
     * Definition
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
     * =====================================
     * PLAY AGAIN BUTTON
     * =====================================
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
            ctx.measureText(testLine)
                .width >
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


    words.forEach(word => {

        const testLine =
            line +
            word +
            " ";


        if (
            ctx.measureText(testLine)
                .width >
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


    /*
     * Play Again
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

            restartGame();

        }


        return;

    }


    if (
        gameOver
    ) {

        return;

    }


    /*
     * Ignore clicks in the
     * definition panel.
     */

    if (
        y >=
        canvas.height -
        DEFINITION_HEIGHT
    ) {

        return;

    }


    /*
     * Check each bubble.
     */

    for (
        let b of bubbles
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

                playPop();


                correctCount++;


                score += 10;


                scoreDisplay.textContent =
                    score;


                /*
                 * Remove clicked bubble.
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
                     * Select a new correct bubble.
                     */

                    let next =
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


                    /*
                     * Update the definition
                     * for the new target.
                     */

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


                /*
                 * Level complete.
                 */

                else {

                    score +=
                        timeLeft * 2;


                    level++;


                    levelDisplay.textContent =
                        level;


                    createLevel();

                }

            }


            /*
             * =================================
             * INCORRECT ANSWER
             * =================================
             */

            else {

                playMiss();


                shotsLeft--;


                attemptsDisplay.textContent =
                    shotsLeft;


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


    /*
     * Dark overlay
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
     * Game-over message
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
     * Final score
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
     * Correct answers
     */

    ctx.fillText(

        "Correct: " +
        correctCount,

        canvas.width / 2,

        canvas.height / 2 + 10

    );


    /*
     * Accuracy
     */

    ctx.fillText(

        "Accuracy: " +
        accuracy +
        "%",

        canvas.width / 2,

        canvas.height / 2 + 50

    );


    /*
     * Play Again button
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


    scoreDisplay.textContent =
        score;


    levelDisplay.textContent =
        level;


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
