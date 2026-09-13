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

// ===== DOM =====
const gemGrid = document.getElementById("gemGrid");
const cardGrid = document.getElementById("cardGrid");
const scoreDisplay = document.getElementById("score");
const timerDisplay = document.getElementById("timer");

// ===== AUDIO =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, duration, type = "sine") {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.01,
    audioCtx.currentTime + duration
  );

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

const playChime = () => playTone(600, 0.25);
const playBuzz = () => playTone(150, 0.3, "square");
const playExplosion = () => playTone(90, 0.2);

// ===== COMBO TEXT =====
function showComboText(text) {
  const div = document.createElement("div");
  div.className = "combo-text";
  div.textContent = text;
  document.body.appendChild(div);

  setTimeout(() => div.remove(), 1000);
}

// ===== HELPERS =====
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isAnyGemMoving() {
  return document.querySelector('.gem[data-moving="true"]');
}

// =========================================
// SAFE COLOR SYSTEM
// =========================================

/*
  Determines whether placing a particular color into a specific
  board position would create a 3+ connected group containing
  that new gem.

  This deliberately ignores unrelated combos elsewhere on the
  board. That is important during cascades because the board may
  already contain a combo waiting to be cleared.
*/
function wouldCreateMatch(row, col, color) {

  if (
    row < 0 ||
    row >= rows ||
    col < 0 ||
    col >= cols
  ) {
    return false;
  }

  if (gemBoard[row][col] !== null) {
    return false;
  }

  const testGem = {
    color: color,
    row: row,
    col: col
  };

  gemBoard[row][col] = testGem;

  const visited = Array.from(
    { length: rows },
    () => Array(cols).fill(false)
  );

  const stack = [[row, col]];
  let count = 0;

  while (stack.length) {

    const [r, c] = stack.pop();

    if (
      r < 0 ||
      r >= rows ||
      c < 0 ||
      c >= cols
    ) {
      continue;
    }

    if (visited[r][c]) {
      continue;
    }

    const cell = gemBoard[r][c];

    if (!cell || cell.color !== color) {
      continue;
    }

    visited[r][c] = true;
    count++;

    if (count >= 3) {
      break;
    }

    stack.push([r + 1, c]);
    stack.push([r - 1, c]);
    stack.push([r, c + 1]);
    stack.push([r, c - 1]);
  }

  gemBoard[row][col] = null;

  return count >= 3;
}


/*
  Selects a random color that will not create a combo at the
  specified location.

  The colors are shuffled first so the board remains visually
  random rather than always favoring the first safe color.
*/
function getSafeColor(row, col) {

  const shuffledColors = [...colors].sort(
    () => Math.random() - 0.5
  );

  const safeColors = shuffledColors.filter(
    color => !wouldCreateMatch(row, col, color)
  );

  /*
    With four colors and a match rule of three, there should
    virtually always be at least one safe choice.

    This fallback exists only as a safeguard.
  */
  if (safeColors.length > 0) {
    return safeColors[
      Math.floor(Math.random() * safeColors.length)
    ];
  }

  return shuffledColors[0];
}

// =========================================
// VOCAB LOADER
// =========================================

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
      Math.min(vocab.length, 20)
    );

  masteredVocab = [];
  comboRecycle = [];

  return true;
}

// ===== SCORE =====
function updateScore(val) {
  score += val;
  scoreDisplay.textContent = score;
}

// ===== TIMER =====
function startTimer() {

  clearInterval(timerInterval);

  timerInterval = setInterval(() => {

    timeLeft--;
    timerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {

      clearInterval(timerInterval);

      isProcessing = true;

      alert(
        "Time's up! Final score: " + score
      );
    }

  }, 1000);
}

// ===== POSITION =====
function positionGem(g) {

  if (!g || !g.element) return;

  const x = g.col * 147;
  const y = g.row * 119;

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

// ===== GEM =====
function createGemElement(g) {

  const d = document.createElement("div");

  d.className = "gem";

  d.dataset.color = g.color;

  // ===== GEM IMAGE =====

  const img = document.createElement("img");

  img.src = colorMap[g.color];

  img.alt = "";

  img.draggable = false;

  img.className = "gem-image";

  // ===== GEM LABEL =====

  const label = document.createElement("span");

  label.className = "label";

  label.textContent = g.word;

  // ===== BUILD GEM =====

  d.appendChild(img);

  d.appendChild(label);

  // ===== CLICK =====

  d.addEventListener(
    "click",
    () => {

      if (isProcessing) return;

      selectGem(g);

    }
  );

  return d;
}

// ===== BOARD =====
function buildBoard() {

  gemBoard = Array.from(
    { length: rows },
    () => Array(cols).fill(null)
  );

  gemGrid.innerHTML = "";

  const items = [...fullVocab].sort(
    () => Math.random() - 0.5
  );

  let i = 0;

  for (let r = 0; r < rows; r++) {

    for (let c = 0; c < cols; c++) {

      const item = items[i++];

      if (!item) continue;

      /*
        Create the gem without assigning a color yet.
      */
      const g = {
        ...item,
        color: null,
        row: r,
        col: c
      };

      /*
        Choose a color that cannot create a combo at
        this exact position.
      */
      g.color = getSafeColor(r, c);

      g.element = createGemElement(g);

      gemGrid.appendChild(g.element);

      gemBoard[r][c] = g;

      positionGem(g);
    }
  }

  console.log(
    "Initial board created with no automatic combos."
  );
}

// ===== CARDS =====
function buildCards() {

  cardGrid.innerHTML = "";

  [...fullVocab]
    .sort(() => Math.random() - 0.5)
    .forEach(item => {

      const d = document.createElement("div");

      d.className = "card";

      d.textContent = item.definition;

      d.dataset.id = item.id;

      d.onclick = () => selectCard(d);

      cardGrid.appendChild(d);

    });
}

// ===== MATCH =====
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

  selectedGem = g;

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

  selectedCard = card;

  card.classList.add(
    "selected"
  );

  tryMatch();
}

function tryMatch() {

  if (!selectedGem || !selectedCard) {
    return;
  }

  if (
    selectedGem.id ===
    Number(selectedCard.dataset.id)
  ) {

    playChime();

    updateScore(10);

    const mid =
      selectedGem.id;

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
          gemBoard[r][c].id === mid
        ) {

          gemBoard[r][c]
            .element
            .remove();

          gemBoard[r][c] = null;
        }
      }
    }

    masteredVocab.push(mid);

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

      updateScore(
        timeBonus
      );

      setTimeout(() => {

        alert(
          `Board Complete!\n\nTime Bonus: ${timeBonus}\nFinal Score: ${score}`
        );

      }, 300);

      return;
    }

    resolveBoard();

  } else {

    playBuzz();

    updateScore(-2);
  }

  selectedGem?.element.classList.remove(
    "selected"
  );

  selectedCard?.classList.remove(
    "selected"
  );

  selectedGem = null;
  selectedCard = null;
}

// ===== GRAVITY =====
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

// ===== MATCH DETECTION =====
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

    const stack = [[r, c]];

    while (stack.length) {

      const [cr, cc] =
        stack.pop();

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

      visited[cr][cc] = true;

      group.push(cell);

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

// ===== COMBO CLEAR =====
function clearMatches(matches) {

  if (!matches.length) {
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

  matches.forEach(g => {

    if (g.element) {
      g.element.remove();
    }

    if (
      gemBoard[g.row]?.[g.col] === g
    ) {

      gemBoard[g.row][g.col] =
        null;
    }

    if (
      !masteredVocab.includes(
        g.id
      )
    ) {

      comboRecycle.push(
        g.id
      );
    }
  });
}

// ===== COMBO REFILL =====
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
            v => v.id === id
          );

        if (!base) {
          continue;
        }

        /*
          Create the gem without a color.
        */
        const g = {
          ...base,
          color: null,
          row: r,
          col: c
        };

        /*
          CRITICAL CHANGE:

          The replacement gem receives a color that will
          NOT create a 3+ combo at its new position.
        */
        g.color =
          getSafeColor(r, c);

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

// ===== RESOLVE BOARD =====
async function resolveBoard() {

  isProcessing = true;

  comboMultiplier = 1;

  while (true) {

    // ===== FULL SETTLE =====

    let moved = true;

    while (moved) {

      moved = applyGravity();

      await wait(
        FALL_TIME
      );
    }

    // ===== STABILIZE DOM =====

    await wait(20);

    // ===== REFILL EMPTY SPACES =====

    refillFromCombo();

    // ===== LET NEW GEMS REGISTER =====

    await wait(
      FALL_TIME
    );

    // ===== SECOND GRAVITY PASS =====

    let post = true;

    while (post) {

      post = applyGravity();

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
      Any combo found here is a legitimate cascade caused
      by gravity or the existing board state.

      New replacement gems themselves were prevented from
      creating a combo when they spawned.
    */
    clearMatches(
      matches
    );

    await wait(
      CLEAR_TIME + 10
    );
  }

  isProcessing = false;
}

// ===== START =====
async function startLoadedGame() {

  score = 0;

  timeLeft = 180;

  selectedGem = null;

  selectedCard = null;

  scoreDisplay.textContent = 0;

  timerDisplay.textContent = 180;

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

// ===== READY =====

console.log(
  "GemWords loaded and waiting for vocabulary."
);
