// =========================================================
// GEMWORDS
// Shared Vocabulary Arcade Sound System
// =========================================================


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


// =========================================================
// SOUND SYSTEM
// =========================================================
// sound.js is loaded by gemword.html before this script.
//
// All GemWords sounds go through this safe wrapper.
// A sound problem will NEVER stop the game.
// =========================================================

function playSound(name, ...args) {

  try {

    const soundSystem = window.SoundFX;

    if (
      soundSystem &&
      typeof soundSystem[name] === "function"
    ) {

      soundSystem[name](...args);

    }

  } catch (error) {

    console.warn(
      "GemWords sound error:",
      error
    );

  }

}


// ===== COMBO TEXT =====

function showComboText(text) {

  const div = document.createElement("div");

  div.className = "combo-text";

  div.textContent = text;

  document.body.appendChild(div);

  setTimeout(() => {

    div.remove();

  }, 1000);

}


// ===== HELPERS =====

function wait(ms) {

  return new Promise(
    resolve => setTimeout(resolve, ms)
  );

}


function isAnyGemMoving() {

  return document.querySelector(
    '.gem[data-moving="true"]'
  );

}


// =========================================================
// SAFE BOARD HELPERS
// =========================================================

function wouldCreateCluster(
  r,
  c,
  color
) {

  const visited = new Set();

  const stack = [[r, c]];

  let count = 0;


  while (stack.length) {

    const [cr, cc] = stack.pop();

    const key = `${cr},${cc}`;


    if (visited.has(key)) {
      continue;
    }

    visited.add(key);


    if (
      cr < 0 ||
      cr >= rows ||
      cc < 0 ||
      cc >= cols
    ) {
      continue;
    }


    let cell;


    // Pretend the candidate gem already exists.

    if (
      cr === r &&
      cc === c
    ) {

      cell = {
        color
      };

    } else {

      cell = gemBoard[cr][cc];

    }


    if (
      !cell ||
      cell.color !== color
    ) {

      continue;

    }


    count++;


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


  return count >= 3;

}


function getSafeColor(
  r,
  c
) {

  let options = colors.filter(
    color =>
      !wouldCreateCluster(
        r,
        c,
        color
      )
  );


  if (!options.length) {

    options = [
      ...colors
    ];

  }


  return options[
    Math.floor(
      Math.random() *
      options.length
    )
  ];

}


function sanitizeBoard() {

  let matches = findMatches();


  while (matches.length) {

    matches.forEach(
      g => {

        let newColor;

        let attempts = 0;


        do {

          newColor =
            colors[
              Math.floor(
                Math.random() *
                colors.length
              )
            ];

          attempts++;

        }
        while (
          wouldCreateCluster(
            g.row,
            g.col,
            newColor
          ) &&
          attempts < 20
        );


        g.color = newColor;


        const img =
          g.element?.querySelector("img");


        if (img) {

          img.src =
            colorMap[newColor];

        }

      }
    );


    matches = findMatches();

  }

}


// =========================================================
// VOCAB LOADER
// =========================================================

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
      (
        item,
        index
      ) => ({

        id:
          index + 1,

        word:
          item.word,

        definition:
          item.definition

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


// =========================================================
// SCORE
// =========================================================

function updateScore(val) {

  score += val;

  scoreDisplay.textContent =
    score;

}


// =========================================================
// TIMER
// =========================================================

function startTimer() {

  clearInterval(
    timerInterval
  );


  timerInterval =
    setInterval(
      () => {

        timeLeft--;

        timerDisplay.textContent =
          timeLeft;


        if (
          timeLeft <= 0
        ) {

          clearInterval(
            timerInterval
          );

          isProcessing =
            true;


          playSound(
            "timeUp"
          );


          alert(
            "Time's up! Final score: " +
            score
          );

        }

      },
      1000
    );

}


// =========================================================
// POSITION
// =========================================================

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


  setTimeout(
    () => {

      if (
        g.element
      ) {

        g.element.setAttribute(
          "data-moving",
          "false"
        );

      }

    },
    FALL_TIME - 40
  );

}


// =========================================================
// GEM
// =========================================================

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


      playSound(
        "click"
      );


      selectGem(g);

    }
  );


  return d;

}


// =========================================================
// BOARD
// =========================================================

function buildBoard() {

  gemBoard =
    Array.from(
      {
        length: rows
      },
      () =>
        Array(
          cols
        ).fill(null)
    );


  gemGrid.innerHTML =
    "";


  const items =
    [
      ...fullVocab
    ].sort(
      () =>
        Math.random() -
        0.5
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


      const g = {

        ...item,

        color:
          getSafeColor(
            r,
            c
          ),

        row: r,

        col: c

      };


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


  sanitizeBoard();

}


// =========================================================
// CARDS
// =========================================================

function buildCards() {

  cardGrid.innerHTML =
    "";


  [
    ...fullVocab
  ]
    .sort(
      () =>
        Math.random() -
        0.5
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
          () => {

            playSound(
              "click"
            );

            selectCard(d);

          };


        cardGrid.appendChild(
          d
        );

      }
    );

}


// =========================================================
// MATCH
// =========================================================

function selectGem(g) {

  if (
    isProcessing ||
    isAnyGemMoving()
  ) {

    return;

  }


  if (
    selectedGem
  ) {

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


  if (
    selectedCard
  ) {

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


// =========================================================
// MATCH CHECK
// =========================================================

function tryMatch() {

  if (
    !selectedGem ||
    !selectedCard
  ) {

    return;

  }


  if (
    selectedGem.id ===
    Number(
      selectedCard.dataset.id
    )
  ) {

    // ===== CORRECT MATCH =====

    playSound(
      "match"
    );

    playSound(
      "correct"
    );


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

          playSound(
            "gemClear"
          );


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


      updateScore(
        timeBonus
      );


      playSound(
        "coin"
      );


      playSound(
        "victory"
      );


      setTimeout(
        () => {

          alert(
            `Board Complete!\n\nTime Bonus: ${timeBonus}\nFinal Score: ${score}`
          );

        },
        300
      );


      return;

    }


    resolveBoard();


  } else {

    // ===== INCORRECT MATCH =====

    playSound(
      "incorrect"
    );


    updateScore(
      -2
    );

  }


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


// =========================================================
// GRAVITY
// =========================================================

function applyGravity() {

  let moved =
    false;


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


          moved =
            true;

        }


        writeRow--;

      }

    }

  }


  return moved;

}


// =========================================================
// MATCH DETECTION
// =========================================================

function findMatches() {

  const visited =
    Array.from(
      {
        length: rows
      },
      () =>
        Array(
          cols
        ).fill(false)
    );


  const matches = [];


  function flood(
    r,
    c,
    color,
    group
  ) {

    const stack =
      [[r, c]];


    while (
      stack.length
    ) {

      const [
        cr,
        cc
      ] =
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


      const group =
        [];


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


// =========================================================
// COMBO CLEAR
// =========================================================

function clearMatches(
  matches
) {

  if (
    !matches.length
  ) {

    return;

  }


  // Gem clear sound.

  playSound(
    "gemClear"
  );


  comboMultiplier++;


  updateScore(
    matches.length *
    5 *
    comboMultiplier
  );


  // Stronger combo sound when applicable.

  if (
    comboMultiplier > 1
  ) {

    playSound(
      "gemCombo",
      comboMultiplier
    );


    showComboText(
      comboMultiplier +
      "x COMBO!"
    );

  }


  matches.forEach(
    g => {

      if (
        g.element
      ) {

        g.element.remove();

      }


      if (
        gemBoard[g.row]?.[g.col] ===
        g
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

    }
  );

}


// =========================================================
// COMBO REFILL
// =========================================================

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


        const g = {

          ...base,

          color:
            getSafeColor(
              r,
              c
            ),

          row: r,

          col: c

        };


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


// =========================================================
// RESOLVE BOARD
// =========================================================

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


    // Stabilize DOM before refill.

    await wait(
      20
    );


    // ===== REFILL =====

    refillFromCombo();


    // Allow DOM update.

    await wait(
      FALL_TIME
    );


    // ===== SETTLE REFILL =====

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


    // Make sure refill never
    // created an automatic cluster.

    sanitizeBoard();


    await wait(
      25
    );


    const matches =
      findMatches();


    if (
      !matches.length
    ) {

      break;

    }


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


// =========================================================
// START LOADED GAME
// =========================================================

async function startLoadedGame() {

  score =
    0;


  timeLeft =
    180;


  selectedGem =
    null;


  selectedCard =
    null;


  scoreDisplay.textContent =
    0;


  timerDisplay.textContent =
    180;


  const loaded =
    await loadVocab();


  if (!loaded) {

    return;

  }


  buildBoard();

  buildCards();


  // Start the shared sound system.

  playSound(
    "start"
  );


  startTimer();


  console.log(
    "GemWords started successfully."
  );

}


// =========================================================
// PUBLIC START FUNCTION
// =========================================================

window.startLoadedGame =
  startLoadedGame;


// =========================================================
// READY
// =========================================================

console.log(
  "GemWords loaded and waiting for vocabulary."
);
