/*
 * ============================================================
 * VOCABULARY ARCADE SOUND MANAGER
 * ============================================================
 *
 * Shared audio system for all Vocabulary Arcade games.
 *
 * Add this near the bottom of each game's HTML file:
 *
 *     <script src="sounds/sound.js"></script>
 *
 * Then use commands such as:
 *
 *     SoundFX.correct();
 *     SoundFX.incorrect();
 *     SoundFX.explosion();
 *     SoundFX.bubblePop();
 *     SoundFX.victory();
 *
 * All sound files are expected to be in the same folder
 * as this file:
 *
 *     sounds/
 *         sound.js
 *         correct-1.wav
 *         correct-2.wav
 *         ...
 *
 * ============================================================
 */

(() => {
    "use strict";

    /*
     * --------------------------------------------------------
     * FIND THE SOUNDS FOLDER
     * --------------------------------------------------------
     *
     * Because this file lives inside /sounds/, we build all
     * audio URLs relative to this file.
     *
     * That means the same sound.js works on GitHub Pages,
     * localhost, or another host without changing URLs.
     */

    const SCRIPT_URL = document.currentScript
        ? document.currentScript.src
        : window.location.href;

    const SOUND_FOLDER_URL = new URL("./", SCRIPT_URL);


    /*
     * --------------------------------------------------------
     * SOUND FILES
     * --------------------------------------------------------
     *
     * Arrays contain alternate versions. One is selected
     * randomly each time the sound plays.
     *
     * Gem combos use numbered levels.
     */

    const FILES = {

        // ----------------------------------------------------
        // CORE UI
        // ----------------------------------------------------

        uiClick: [
            "ui-click-1.wav"
        ],

        gameStart: [
            "game-start.wav"
        ],


        // ----------------------------------------------------
        // ANSWER FEEDBACK
        // ----------------------------------------------------

        correct: [
            "correct-1.wav",
            "correct-2.wav",
            "correct-3.wav"
        ],

        incorrect: [
            "incorrect-1.wav",
            "incorrect-2.wav"
        ],

        match: [
            "match.wav"
        ],


        // ----------------------------------------------------
        // BUBBLEWORD
        // ----------------------------------------------------

        bubblePop: [
            "bubble-pop-1.wav",
            "bubble-pop-2.wav",
            "bubble-pop-3.wav",
            "bubble-pop-4.wav"
        ],


        // ----------------------------------------------------
        // GEMWORDS
        // ----------------------------------------------------

        gemClear: [
            "gem-clear-1.wav",
            "gem-clear-2.wav",
            "gem-clear-3.wav",
            "gem-clear-4.wav"
        ],

        gemCombo: {
            3: "gem-combo-3.wav",
            4: "gem-combo-4.wav",
            5: "gem-combo-5.wav",
            6: "gem-combo-6.wav"
        },


        // ----------------------------------------------------
        // REWARDS
        // ----------------------------------------------------

        coin: [
            "coin-1.wav",
            "coin-2.wav"
        ],

        streakBonus: [
            "streak-bonus.wav"
        ],

        levelUp: [
            "level-up.wav"
        ],


        // ----------------------------------------------------
        // BLASTWORD
        // ----------------------------------------------------

        explosion: [
            "explosion-1.wav",
            "explosion-2.wav"
        ],

        laser: [
            "laser-1.wav",
            "laser-2.wav"
        ],

        damage: [
            "damage.wav"
        ],

        shieldHit: [
            "shield-hit.wav"
        ],


        // ----------------------------------------------------
        // TIMING
        // ----------------------------------------------------

        countdown: [
            "countdown.wav"
        ],

        timeUp: [
            "time-up.wav"
        ],


        // ----------------------------------------------------
        // OTHER GAMES
        // ----------------------------------------------------

        cardFlip: [
            "card-flip.wav"
        ],

        dragPickup: [
            "drag-pickup.wav"
        ],

        dragDrop: [
            "drag-drop.wav"
        ],


        // ----------------------------------------------------
        // GAME END
        // ----------------------------------------------------

        victory: [
            "victory.wav"
        ],

        gameOver: [
            "game-over.wav"
        ]
    };


    /*
     * --------------------------------------------------------
     * GLOBAL SETTINGS
     * --------------------------------------------------------
     */

    const DEFAULT_VOLUME = 0.55;

    const STORAGE_VOLUME =
        "vocabularyArcadeVolume";

    const STORAGE_MUTED =
        "vocabularyArcadeMuted";


    let masterVolume =
        loadNumber(
            STORAGE_VOLUME,
            DEFAULT_VOLUME
        );

    let muted =
        loadBoolean(
            STORAGE_MUTED,
            false
        );

    let audioUnlocked = false;


    /*
     * --------------------------------------------------------
     * AUDIO CACHE
     * --------------------------------------------------------
     *
     * Templates are cached after they are loaded.
     *
     * Each time a sound plays we clone the template.
     * This allows rapid sounds to overlap.
     */

    const audioCache = new Map();


    /*
     * --------------------------------------------------------
     * UTILITY FUNCTIONS
     * --------------------------------------------------------
     */

    function clamp(value, minimum, maximum) {

        return Math.min(
            maximum,
            Math.max(
                minimum,
                value
            )
        );
    }


    function loadNumber(key, fallback) {

        try {

            const value =
                Number.parseFloat(
                    localStorage.getItem(key)
                );

            if (Number.isFinite(value)) {

                return clamp(
                    value,
                    0,
                    1
                );
            }

        } catch (error) {

            // Ignore localStorage errors.

        }

        return fallback;
    }


    function loadBoolean(key, fallback) {

        try {

            const value =
                localStorage.getItem(key);

            if (value === "true") {
                return true;
            }

            if (value === "false") {
                return false;
            }

        } catch (error) {

            // Ignore localStorage errors.

        }

        return fallback;
    }


    function randomItem(array) {

        return array[
            Math.floor(
                Math.random() * array.length
            )
        ];
    }


    /*
     * --------------------------------------------------------
     * DETERMINE WHICH FILE TO PLAY
     * --------------------------------------------------------
     */

    function getFileName(
        soundName,
        variant = null
    ) {

        const definition =
            FILES[soundName];


        if (definition === undefined) {

            console.warn(
                "[Vocabulary Arcade] Unknown sound:",
                soundName
            );

            return null;
        }


        /*
         * Gem combo sounds are stored by combo level.
         */

        if (
            !Array.isArray(definition) &&
            typeof definition === "object"
        ) {

            const requestedLevel =
                Number(variant) || 3;


            const availableLevels =
                Object.keys(definition)
                    .map(Number)
                    .sort(
                        (a, b) => a - b
                    );


            let selectedLevel =
                availableLevels[0];


            for (
                const level
                of availableLevels
            ) {

                if (
                    requestedLevel >= level
                ) {

                    selectedLevel = level;
                }
            }


            return definition[
                selectedLevel
            ];
        }


        /*
         * Sounds with multiple variants use a
         * random version.
         */

        if (Array.isArray(definition)) {

            return randomItem(
                definition
            );
        }


        return definition;
    }


    /*
     * --------------------------------------------------------
     * LOAD AUDIO TEMPLATE
     * --------------------------------------------------------
     */

    function getAudioTemplate(
        fileName
    ) {

        if (!fileName) {
            return null;
        }


        if (!audioCache.has(fileName)) {

            const sourceURL =
                new URL(
                    fileName,
                    SOUND_FOLDER_URL
                ).href;


            const audio =
                new Audio(
                    sourceURL
                );


            audio.preload = "auto";

            audio.volume =
                masterVolume;


            audioCache.set(
                fileName,
                audio
            );
        }


        return audioCache.get(
            fileName
        );
    }


    /*
     * --------------------------------------------------------
     * PLAY A SOUND
     * --------------------------------------------------------
     */

    function play(
        soundName,
        options = {}
    ) {

        /*
         * Do nothing while muted.
         */

        if (muted) {
            return null;
        }


        const {
            volume = 1,
            rate = 1,
            variant = null
        } = options;


        const fileName =
            getFileName(
                soundName,
                variant
            );


        if (!fileName) {
            return null;
        }


        const template =
            getAudioTemplate(
                fileName
            );


        if (!template) {
            return null;
        }


        /*
         * Clone the audio so multiple sounds can
         * play simultaneously.
         */

        const audio =
            template.cloneNode(true);


        audio.volume =
            clamp(
                masterVolume * volume,
                0,
                1
            );


        audio.playbackRate =
            rate;


        audio.currentTime =
            0;


        const promise =
            audio.play();


        /*
         * Autoplay restrictions are common in browsers.
         * The error is intentionally ignored.
         */

        if (
            promise &&
            typeof promise.catch === "function"
        ) {

            promise.catch(() => {

                // Browser autoplay restriction.

            });
        }


        return audio;
    }


    /*
     * --------------------------------------------------------
     * PRELOAD ALL SOUNDS
     * --------------------------------------------------------
     */

    function preload() {

        for (
            const definition
            of Object.values(FILES)
        ) {

            if (Array.isArray(definition)) {

                definition.forEach(
                    getAudioTemplate
                );

            } else if (
                typeof definition === "object"
            ) {

                Object.values(
                    definition
                ).forEach(
                    getAudioTemplate
                );

            } else {

                getAudioTemplate(
                    definition
                );
            }
        }
    }


    /*
     * --------------------------------------------------------
     * UNLOCK AUDIO
     * --------------------------------------------------------
     *
     * Most browsers require a user interaction before
     * allowing audio playback.
     */

    function unlock() {

        if (audioUnlocked) {
            return;
        }


        audioUnlocked = true;

        preload();
    }


    /*
     * --------------------------------------------------------
     * VOLUME
     * --------------------------------------------------------
     */

    function setVolume(value) {

        masterVolume =
            clamp(
                Number(value),
                0,
                1
            );


        try {

            localStorage.setItem(
                STORAGE_VOLUME,
                String(masterVolume)
            );

        } catch (error) {

            // Ignore storage errors.

        }


        /*
         * Update already-loaded audio templates.
         */

        for (
            const audio
            of audioCache.values()
        ) {

            audio.volume =
                masterVolume;
        }


        return masterVolume;
    }


    function getVolume() {

        return masterVolume;
    }


    /*
     * --------------------------------------------------------
     * MUTE
     * --------------------------------------------------------
     */

    function mute() {

        muted = true;


        try {

            localStorage.setItem(
                STORAGE_MUTED,
                "true"
            );

        } catch (error) {

            // Ignore storage errors.

        }
    }


    function unmute() {

        muted = false;


        try {

            localStorage.setItem(
                STORAGE_MUTED,
                "false"
            );

        } catch (error) {

            // Ignore storage errors.

        }
    }


    function toggleMute() {

        muted = !muted;


        try {

            localStorage.setItem(
                STORAGE_MUTED,
                String(muted)
            );

        } catch (error) {

            // Ignore storage errors.

        }


        return muted;
    }


    function isMuted() {

        return muted;
    }


    /*
     * --------------------------------------------------------
     * STOP ALL SOUNDS
     * --------------------------------------------------------
     */

    function stopAll() {

        for (
            const audio
            of audioCache.values()
        ) {

            try {

                audio.pause();

                audio.currentTime = 0;

            } catch (error) {

                // Ignore individual audio errors.

            }
        }
    }


    /*
     * ========================================================
     * PUBLIC VOCABULARY ARCADE API
     * ========================================================
     */

    window.SoundFX = {

        /*
         * CORE
         */

        click: () =>
            play("uiClick"),

        start: () =>
            play("gameStart"),


        /*
         * ANSWER FEEDBACK
         */

        correct: () =>
            play("correct"),

        incorrect: () =>
            play("incorrect"),

        match: () =>
            play("match"),


        /*
         * BUBBLEWORD
         */

        bubblePop: () =>
            play("bubblePop"),


        /*
         * GEMWORDS
         */

        gemClear: () =>
            play("gemClear"),

        gemCombo: (count = 3) =>
            play(
                "gemCombo",
                {
                    variant: count
                }
            ),


        /*
         * REWARDS
         */

        coin: () =>
            play("coin"),

        streak: () =>
            play("streakBonus"),

        levelUp: () =>
            play("levelUp"),


        /*
         * BLASTWORD
         */

        explosion: () =>
            play("explosion"),

        laser: () =>
            play("laser"),

        damage: () =>
            play("damage"),

        shield: () =>
            play("shieldHit"),


        /*
         * TIMING
         */

        countdown: () =>
            play("countdown"),

        timeUp: () =>
            play("timeUp"),


        /*
         * OTHER GAMES
         */

        flip: () =>
            play("cardFlip"),

        dragPickup: () =>
            play("dragPickup"),

        drop: () =>
            play("dragDrop"),


        /*
         * GAME END
         */

        victory: () =>
            play("victory"),

        gameOver: () =>
            play("gameOver"),


        /*
         * ADVANCED CONTROLS
         */

        play,

        preload,

        unlock,

        setVolume,

        getVolume,

        mute,

        unmute,

        toggleMute,

        isMuted,

        stopAll
    };


    /*
     * --------------------------------------------------------
     * AUTOMATIC AUDIO UNLOCK
     * --------------------------------------------------------
     *
     * The first user interaction unlocks/preloads the audio.
     */

    const unlockEvents = [
        "pointerdown",
        "keydown",
        "touchstart"
    ];


    unlockEvents.forEach(
        (eventName) => {

            document.addEventListener(
                eventName,
                unlock,
                {
                    once: true,
                    passive: true
                }
            );
        }
    );


    /*
     * --------------------------------------------------------
     * READY
     * --------------------------------------------------------
     */

    console.log(
        "[Vocabulary Arcade] SoundFX loaded."
    );

})();
