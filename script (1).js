// ===== GEMWORD SETTINGS =====
const rows = 5;
const cols = 4;

// ===== TIMING =====
const FALL_TIME = 100;
const CLEAR_TIME = 100;

// ===== COLORS =====
const colorMap = {
  red: "https://raw.githubusercontent.com/alexjeffersonmarsh/VocabularyArcade/main/images/jewel-red.webp",
  blue: "https://raw.githubusercontent.com/alexjeffersonmarsh/VocabularyArcade/main/images/jewel-blue.webp",
  green: "https://raw.githubusercontent.com/alexjeffersonmarsh/VocabularyArcade/main/images/jewel-green.webp",
  pink: "https://raw.githubusercontent.com/alexjeffersonmarsh/VocabularyArcade/main/images/jewel-pink.webp"
};

const colors = Object.keys(colorMap);

// ===== GAME STATE =====
let score = 0;
let timeLeft = 180;
let timerInterval;

let comboMultiplier = 1;
let isProcessing = false;

let vocab = [];
let fullVocab = [];

let masteredVocab = [];
let comboRecycle = [];

let gemBoard = [];

let selectedGem = null;
let selectedCard = null;

// ===== ACCURACY =====
let correctAnswers = 0;
let totalAttempts = 0;

// ===== DOM =====
const gemGrid = document.getElementById("gemGrid");
const cardGrid = document.getElementById("cardGrid");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");

// ===== RESULTS SCREEN =====
const gameCompleteScreen =
  document.getElementById("gameCompleteScreen");

const resultsListName =
  document.getElementById("resultsListName");

const resultsScore =
  document.getElementById("resultsScore");

const resultsAccuracy =
  document.getElementById("resultsAccuracy");

const playAgainButton =
  document.getElementById("playAgainButton");

const libraryButton =
  document.getElementById("libraryButton");

// ===== AUDIO =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, duration, type = "sine") {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(
    0.2,
    audioCtx.currentTime
  );

  gain.gain.exponentialRampToValueAtTime(
    0.01,
    audioCtx.currentTime + duration
  );

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(
    audioCtx.currentTime + duration
  );
}

const playChime = () =>
  playTone(600, 0.25);

const playBuzz = () =>
  playTone(150, 0.3, "square");

const playExplosion = () =>
  playTone(90, 0.2);

// ===== COMBO TEXT =====
function showComboText(text) {

  const div =
    document.createElement("div");

  div.className =
    "combo-text";

  div.textContent =
    text;

  document.body.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 1000);
}

// ===== HELPERS =====
function wait(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

function isAnyGemMoving() {
  return document.querySelector(
    '.gem[data-moving="true"]'
  );
}

// ======================================================
// SAFE COLOR SYSTEM
// ======================================================

/*
  Checks whether placing a particular color into a
  particular empty position would create a group of
  three or more connected gems of that color.
*/
function wouldCreateMatch(
  row,
  col,
  color
) {

  if (
    row < 0 ||
    row >= rows ||
    col < 0 ||
    col >= cols
  ) {
    return false;
  }

  if (
    gemBoard[row][col] !== null
  ) {
    return false;
  }

  /*
    Temporarily place a test gem into the board.
  */
  const testGem = {
    color: color,
    row: row,
    col: col
  };

  gemBoard[row][col] =
    testGem;

  const visited =
    Array.from(
      { length: rows },
      () => Array(cols).fill(false)
    );

  const stack = [
    [row, col]
  ];

  let count = 0;

  while (stack.length) {

    const [r, c] =
      stack.pop();

    if (
      r < 0 ||
      r >= rows ||
      c < 0 ||
      c >= cols
    ) {
      continue;
    }

    if (
      visited[r][c]
    ) {
      continue;
    }

    const cell =
      gemBoard[r][c];

    if (
      !cell ||
      cell.color !== color
    ) {
      continue;
    }

    visited[r][c] = true;

    count++;

    if (count >= 3) {
      break;
    }

    stack.push([
      r + 1,
      c
    ]);

    stack.push([
      r - 1,
      c
    ]);

    stack.push([
      r,
      c + 1
    ]);

    stack.push([
      r,
      c - 1
    ]);
  }

  /*
    Remove the temporary test gem.
  */
  gemBoard[row][col] =
    null;

  return count >= 3;
}

/*
  Selects a random color that does not create an
  immediate 3+ combo at the new gem's location.
*/
function getSafeColor(
  row,
  col
) {

  const shuffledColors =
    [...colors].sort(
      () => Math.random() - 0.5
    );

  const safeColors =
    shuffledColors.filter(
      color =>
        !wouldCreateMatch(
          row,
          col,
          color
        )
    );

  /*
    Normally at least one color will be available.
    Keep a fallback just in case.
  */
  if (
    safeColors.length > 0
  ) {

    return safeColors[
      Math.floor(
        Math.random() *
        safeColors.length
      )
    ];
  }

  return shuffledColors[0];
}

// ======================================================
// VOCAB LOADER
// ======================================================

async function loadVocab() {

  console.log(
    "Preloaded vocab:",
    window.preloadedVocab
  );

  if (
    !window.preloadedVocab ||
    !window.preloadedVocab.length
  ) {

    alert(
      "No Firebase vocabulary loaded."
    );

    return false;
  }

  vocab =
    window.preloadedVocab.map(
      (item, index) => ({
        id: index + 1,
        word: item.word,
        definition: item.definition
      })
    );

  fullVocab =
    vocab.slice(
      0,
      Math.min(
        vocab.length,
        20
      )
    );

  masteredVocab = [];

  comboRecycle = [];

  return true;
}

// ======================================================
// SCORE
// ======================================================

function updateScore(val) {

  score += val;

  scoreDisplay.textContent =
    score;
}

// ======================================================
// TIMER
// ======================================================

function startTimer() {

  clearInterval(
    timerInterval
  );

  timerInterval =
    setInterval(() => {

      timeLeft--;

      timerDisplay.textContent =
        timeLeft;

      if (
        timeLeft <= 0
      ) {

        clearInterval(
          timerInterval
        );

        isProcessing = true;

        alert(
          "Time's up! Final score: " +
          score
        );
      }

    }, 1000);
}

// ======================================================
// POSITION
// ======================================================

function positionGem(g) {

  if (
    !g ||
    !g.element
  ) {
    return;
  }

  const x =
    g.col * 147;

  const y =
    g.row * 119;

  g.element.setAttribute(
    "data-moving",
    "true"
  );

  g.element.style.transform =
    `translate(${x}px, ${y}px)`;

  setTimeout(() => {

    if (g.element) {

      g.element.setAttribute(
        "data-moving",
        "false"
      );
    }

  }, FALL_TIME - 40);
}

// ======================================================
// GEM ELEMENT
// ======================================================

function createGemElement(g) {

  const d =
    document.createElement("div");

  d.className =
    "gem";

  d.dataset.color =
    g.color;

  // ===== GEM IMAGE =====

  const img =
    document.createElement("img");

  img.src =
    colorMap[g.color];

  img.alt =
    "";

  img.draggable =
    false;

  img.className =
    "gem-image";

  // ===== GEM LABEL =====

  const label =
    document.createElement("span");

  label.className =
    "label";

  label.textContent =
    g.word;

  // ===== BUILD GEM =====

  d.appendChild(img);

  d.appendChild(label);

  // ===== CLICK =====

  d.addEventListener(
    "click",
    () => {

      if (
        isProcessing
      ) {
        return;
      }

      selectGem(g);

    }
  );

  return d;
}

// ======================================================
// BOARD
// ======================================================

function buildBoard() {

  gemBoard =
    Array.from(
      { length: rows },
      () => Array(cols).fill(null)
    );

  gemGrid.innerHTML =
    "";

  const items =
    [...fullVocab].sort(
      () =>
        Math.random() - 0.5
    );

  let i = 0;

  for (
    let r = 0;
    r < rows;
    r++
  ) {

    for (
      let c = 0;
      c < cols;
      c++
    ) {

      const item =
        items[i++];

      if (!item) {
        continue;
      }

      /*
        Create the gem without
        assigning a color initially.
      */
      const g = {
        ...item,
        color: null,
        row: r,
        col: c
      };

      /*
        Choose a color that cannot
        create a 3+ connected group
        at this position.
      */
      g.color =
        getSafeColor(
          r,
          c
        );

      g.element =
        createGemElement(g);

      gemGrid.appendChild(
        g.element
      );

      gemBoard[r][c] =
        g;

      positionGem(g);
    }
  }

  console.log(
    "Initial board created with no automatic combos."
  );
}

// ======================================================
// CARDS
// ======================================================

function buildCards() {

  cardGrid.innerHTML =
    "";

  [...fullVocab]
    .sort(
      () =>
        Math.random() - 0.5
    )
    .forEach(
      item => {

        const d =
          document.createElement(
            "div"
          );

        d.className =
          "card";

        d.textContent =
          item.definition;

        d.dataset.id =
          item.id;

        d.onclick =
          () => selectCard(d);

        cardGrid.appendChild(
          d
        );
      }
    );
}

// ======================================================
// MATCH SELECTION
// ======================================================

function selectGem(g) {

  if (
    isProcessing ||
    isAnyGemMoving()
  ) {
    return;
  }

  if (selectedGem) {

    selectedGem.element.classList.remove(
      "selected"
    );
  }

  selectedGem =
    g;

  g.element.classList.add(
    "selected"
  );

  tryMatch();
}

function selectCard(card) {

  if (
    isProcessing ||
    isAnyGemMoving()
  ) {
    return;
  }

  if (selectedCard) {

    selectedCard.classList.remove(
      "selected"
    );
  }

  selectedCard =
    card;

  card.classList.add(
    "selected"
  );

  tryMatch();
}

// ======================================================
// MATCH
// ======================================================

function tryMatch() {

  if (
    !selectedGem ||
    !selectedCard
  ) {
    return;
  }

  /*
    Every attempt counts toward accuracy,
    whether it is correct or incorrect.
  */
  totalAttempts++;

  // ===== CORRECT MATCH =====

  if (
    selectedGem.id ===
    Number(selectedCard.dataset.id)
  ) {

    correctAnswers++;

    playChime();

    updateScore(10);

    const mid =
      selectedGem.id;

    /*
      Remove all copies of this vocabulary item
      from the board.
    */
    for (
      let r = 0;
      r < rows;
      r++
    ) {

      for (
        let c = 0;
        c < cols;
        c++
      ) {

        if (
          gemBoard[r][c] &&
          gemBoard[r][c].id ===
            mid
        ) {

          gemBoard[r][c]
            .element
            .remove();

          gemBoard[r][c] =
            null;
        }
      }
    }

    masteredVocab.push(
      mid
    );

    selectedCard.remove();

    // ===== CHECK FOR GAME COMPLETION =====

    const remainingCards =
      document.querySelectorAll(
        ".card"
      );

    if (
      remainingCards.length === 0
    ) {

      clearInterval(
        timerInterval
      );

      const timeBonus =
        timeLeft * 10;

      /*
        Wait briefly so the last match
        animation has time to display.
      */
      setTimeout(() => {

        updateScore(
          timeBonus
        );

        showGameCompleteScreen();

      }, 300);

      /*
        Do not call resolveBoard()
        after the game is complete.
      */
      return;
    }

    resolveBoard();

  } else {

    // ===== INCORRECT MATCH =====

    playBuzz();

    updateScore(-2);
  }

  /*
    Clear the current selections.
  */
  selectedGem?.element.classList.remove(
    "selected"
  );

  selectedCard?.classList.remove(
    "selected"
  );

  selectedGem =
    null;

  selectedCard =
    null;
}

// ======================================================
// RESULTS SCREEN
// ======================================================

function showGameCompleteScreen() {

  clearInterval(
    timerInterval
  );

  /*
    Calculate accuracy based on vocabulary
    matching attempts, not score.
  */
  const accuracy =
    totalAttempts > 0
      ? Math.round(
          (
            correctAnswers /
            totalAttempts
          ) * 100
        )
      : 0;

  /*
    The Firebase loader should place the
    Firestore list title into
    window.preloadedVocabTitle.
  */
  resultsListName.textContent =
    window.preloadedVocabTitle ||
    "Vocabulary List";

  resultsScore.textContent =
    score;

  resultsAccuracy.textContent =
    accuracy + "%";

  gameCompleteScreen.classList.add(
    "show"
  );
}

// ======================================================
// GRAVITY
// ======================================================

function applyGravity() {

  let moved = false;

  for (
    let c = 0;
    c < cols;
    c++
  ) {

    let writeRow =
      rows - 1;

    for (
      let r = rows - 1;
      r >= 0;
      r--
    ) {

      if (
        gemBoard[r][c] !== null
      ) {

        if (
          r !== writeRow
        ) {

          const g =
            gemBoard[r][c];

          gemBoard[writeRow][c] =
            g;

          gemBoard[r][c] =
            null;

          g.row =
            writeRow;

          positionGem(g);

          moved = true;
        }

        writeRow--;
      }
    }
  }

  return moved;
}

// ======================================================
// MATCH DETECTION
// ======================================================

function findMatches() {

  const visited =
    Array.from(
      { length: rows },
      () => Array(cols).fill(false)
    );

  const matches = [];

  function flood(
    r,
    c,
    color,
    group
  ) {

    const stack = [
      [r, c]
    ];

    while (
      stack.length
    ) {

      const [
        cr,
        cc
      ] = stack.pop();

      if (
        cr < 0 ||
        cr >= rows ||
        cc < 0 ||
        cc >= cols
      ) {
        continue;
      }

      if (
        visited[cr][cc]
      ) {
        continue;
      }

      const cell =
        gemBoard[cr][cc];

      if (
        !cell ||
        cell.color !== color
      ) {
        continue;
      }

      visited[cr][cc] =
        true;

      group.push(
        cell
      );

      stack.push([
        cr + 1,
        cc
      ]);

      stack.push([
        cr - 1,
        cc
      ]);

      stack.push([
        cr,
        cc + 1
      ]);

      stack.push([
        cr,
        cc - 1
      ]);
    }
  }

  for (
    let r = 0;
    r < rows;
    r++
  ) {

    for (
      let c = 0;
      c < cols;
      c++
    ) {

      const cell =
        gemBoard[r][c];

      if (
        !cell ||
        visited[r][c]
      ) {
        continue;
      }

      const group = [];

      flood(
        r,
        c,
        cell.color,
        group
      );

      if (
        group.length >= 3
      ) {

        matches.push(
          ...group
        );
      }
    }
  }

  return [
    ...new Set(matches)
  ];
}

// ======================================================
// COMBO CLEAR
// ======================================================

function clearMatches(
  matches
) {

  if (
    !matches.length
  ) {
    return;
  }

  playExplosion();

  comboMultiplier++;

  updateScore(
    matches.length *
    5 *
    comboMultiplier
  );

  if (
    comboMultiplier > 1
  ) {

    showComboText(
      comboMultiplier +
      "x COMBO!"
    );
  }

  matches.forEach(
    g => {

      if (g.element) {
        g.element.remove();
      }

      if (
        gemBoard[g.row]?.[g.col] === g
      ) {

        gemBoard[g.row][g.col] =
          null;
      }

      /*
        A gem that was not already mastered
        is eligible to return as a replacement.
      */
      if (
        !masteredVocab.includes(
          g.id
        )
      ) {

        comboRecycle.push(
          g.id
        );
      }
    }
  );
}

// ======================================================
// COMBO REFILL
// ======================================================

function refillFromCombo() {

  for (
    let r = 0;
    r < rows;
    r++
  ) {

    for (
      let c = 0;
      c < cols;
      c++
    ) {

      if (
        !gemBoard[r][c] &&
        comboRecycle.length
      ) {

        const id =
          comboRecycle.pop();

        const base =
          fullVocab.find(
            v =>
              v.id === id
          );

        if (!base) {
          continue;
        }

        /*
          Create the replacement gem
          without a color first.
        */
        const g = {
          ...base,
          color: null,
          row: r,
          col: c
        };

        /*
          CRITICAL:
          Choose a color that will not create
          an immediate combo at this position.
        */
        g.color =
          getSafeColor(
            r,
            c
          );

        g.element =
          createGemElement(g);

        gemGrid.appendChild(
          g.element
        );

        gemBoard[r][c] =
          g;

        positionGem(g);
      }
    }
  }
}

// ======================================================
// RESOLVE BOARD
// ======================================================

async function resolveBoard() {

  isProcessing =
    true;

  comboMultiplier =
    1;

  while (true) {

    // ===== FULL SETTLE =====

    let moved =
      true;

    while (
      moved
    ) {

      moved =
        applyGravity();

      await wait(
        FALL_TIME
      );
    }

    // ===== STABILIZE DOM =====

    await wait(20);

    // ===== REFILL =====

    refillFromCombo();

    // ===== LET NEW GEMS REGISTER =====

    await wait(
      FALL_TIME
    );

    // ===== SECOND GRAVITY PASS =====

    let post =
      true;

    while (
      post
    ) {

      post =
        applyGravity();

      await wait(
        FALL_TIME
      );
    }

    // ===== FINAL STABILIZATION =====

    await wait(25);

    // ===== CHECK FOR CASCADE =====

    const matches =
      findMatches();

    if (
      !matches.length
    ) {
      break;
    }

    /*
      Anything found here is a legitimate
      cascade resulting from gravity or
      the existing board state.
    */
    clearMatches(
      matches
    );

    await wait(
      CLEAR_TIME + 10
    );
  }

  isProcessing =
    false;
}

// ======================================================
// START
// ======================================================

async function startLoadedGame() {

  score =
    0;

  timeLeft =
    180;

  correctAnswers =
    0;

  totalAttempts =
    0;

  selectedGem =
    null;

  selectedCard =
    null;

  comboMultiplier =
    1;

  isProcessing =
    false;

  scoreDisplay.textContent =
    0;

  timerDisplay.textContent =
    180;

  /*
    Hide the results screen if the student
    is starting another game.
  */
  if (
    gameCompleteScreen
  ) {

    gameCompleteScreen.classList.remove(
      "show"
    );
  }

  const loaded =
    await loadVocab();

  if (!loaded) {
    return;
  }

  buildBoard();

  buildCards();

  startTimer();

  console.log(
    "GemWords started successfully."
  );
}

window.startLoadedGame =
  startLoadedGame;

// ======================================================
// RESULTS BUTTONS
// ======================================================

if (
  playAgainButton
) {

  playAgainButton.addEventListener(
    "click",
    async () => {

      gameCompleteScreen.classList.remove(
        "show"
      );

      await startLoadedGame();
    }
  );
}

if (
  libraryButton
) {

  libraryButton.addEventListener(
    "click",
    () => {

      window.location.href =
        "library.html";
    }
  );
}

// ======================================================
// READY
// ======================================================

console.log(
  "GemWords loaded and waiting for vocabulary."
);
