// --- Estado del juego ---
const SIZE = 8;
const TOTAL = SIZE * SIZE;
const MOVES = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2],  [1, 2],  [2, -1],  [2, 1]
];

let board = [];      // board[r][c] = step number (0 = not visited)
let knightPos = null; // { r, c }
let stepCount = 0;
let gameStarted = false;
let showHints = true;
let cells = [];       // DOM refs [r][c]

// --- DOM ---
const boardEl    = document.getElementById('board');
const statusEl   = document.getElementById('status');
const counterEl  = document.getElementById('move-counter');
const bestEl     = document.getElementById('best');
const btnRestart = document.getElementById('btn-restart');
const btnHints   = document.getElementById('btn-hints');
const btnSuggest = document.getElementById('btn-suggest');
const modal      = document.getElementById('modal');
const modalMsg   = document.getElementById('modal-msg');
const modalClose = document.getElementById('modal-close');

// --- Inicialización ---
function init() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  knightPos = null;
  stepCount = 0;
  gameStarted = false;
  btnSuggest.disabled = true;
  statusEl.textContent = 'Haz clic en una casilla para colocar el caballo';
  updateCounter();
  loadBest();
  buildBoard();
}

function buildBoard() {
  boardEl.innerHTML = '';
  cells = [];
  for (let r = 0; r < SIZE; r++) {
    cells[r] = [];
    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      const isLight = (r + c) % 2 === 0;
      cell.className = `cell ${isLight ? 'light' : 'dark'}`;
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.addEventListener('click', () => onCellClick(r, c));
      boardEl.appendChild(cell);
      cells[r][c] = cell;
    }
  }
}

// --- Lógica de movimiento ---
function isValid(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function getValidMoves(r, c) {
  return MOVES
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([nr, nc]) => isValid(nr, nc) && board[nr][nc] === 0);
}

// Warnsdorff: ordena por menor grado (menos movimientos futuros)
function warnsdorff(r, c) {
  const moves = getValidMoves(r, c);
  if (moves.length === 0) return null;
  moves.sort((a, b) => getValidMoves(a[0], a[1]).length - getValidMoves(b[0], b[1]).length);
  return moves[0];
}

function onCellClick(r, c) {
  if (!gameStarted) {
    // Colocar caballo por primera vez
    placeKnight(r, c);
    return;
  }

  // Verificar que sea un movimiento legal
  const moves = getValidMoves(knightPos.r, knightPos.c);
  const isLegal = moves.some(([mr, mc]) => mr === r && mc === c);
  if (!isLegal) return;

  moveKnight(r, c);
}

function placeKnight(r, c) {
  gameStarted = true;
  stepCount = 1;
  board[r][c] = stepCount;
  knightPos = { r, c };
  btnSuggest.disabled = false;
  statusEl.textContent = 'Mueve el caballo a una casilla resaltada';
  updateCounter();
  render();
  checkEnd();
}

function moveKnight(r, c) {
  stepCount++;
  board[r][c] = stepCount;
  knightPos = { r, c };
  updateCounter();
  render();
  checkEnd();
}

function checkEnd() {
  if (stepCount === TOTAL) {
    saveBest(stepCount);
    showModal('🎉 ¡Victoria! Recorriste las 64 casillas.');
    btnSuggest.disabled = true;
    return;
  }
  const moves = getValidMoves(knightPos.r, knightPos.c);
  if (moves.length === 0) {
    saveBest(stepCount);
    showModal(`😞 Sin movimientos disponibles. Llegaste a ${stepCount} de 64.`);
    btnSuggest.disabled = true;
  }
}

// --- Renderizado ---
function render() {
  // Posibles movimientos
  const possibleSet = new Set();
  if (gameStarted && knightPos) {
    for (const [mr, mc] of getValidMoves(knightPos.r, knightPos.c)) {
      possibleSet.add(`${mr},${mc}`);
    }
  }

  // Sugerencia
  let suggestedKey = null;
  if (gameStarted && knightPos) {
    const best = warnsdorff(knightPos.r, knightPos.c);
    if (best) suggestedKey = `${best[0]},${best[1]}`;
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = cells[r][c];
      const isLight = (r + c) % 2 === 0;
      const key = `${r},${c}`;
      const step = board[r][c];
      const isCurrent = knightPos && knightPos.r === r && knightPos.c === c;
      const isPossible = possibleSet.has(key);

      // Clases
      let cls = `cell ${isLight ? 'light' : 'dark'}`;
      if (step > 0 && !isCurrent) cls += ' visited';
      if (isCurrent) cls += ' current';
      if (isPossible && showHints) cls += ' possible';
      if (isPossible && suggestedKey === key && showHints) cls += ' suggested';
      cell.className = cls;

      // Contenido
      let html = '';
      if (isCurrent) {
        html = '<span class="knight">♞</span>';
        if (step > 0) html += `<span class="step-num">${step}</span>`;
      } else if (step > 0) {
        html = `<span class="step-num">${step}</span>`;
      }
      cell.innerHTML = html;
    }
  }
}

function updateCounter() {
  counterEl.textContent = `Movimientos: ${stepCount} / ${TOTAL}`;
}

// --- Modal ---
function showModal(msg) {
  modalMsg.textContent = msg;
  modal.classList.remove('hidden');
}
modalClose.addEventListener('click', () => modal.classList.add('hidden'));

// --- Controles ---
btnRestart.addEventListener('click', init);

btnHints.addEventListener('click', () => {
  showHints = !showHints;
  btnHints.textContent = `Ayuda: ${showHints ? 'ON' : 'OFF'}`;
  render();
});

btnSuggest.addEventListener('click', () => {
  if (!gameStarted || !knightPos) return;
  const best = warnsdorff(knightPos.r, knightPos.c);
  if (best) {
    // Mover automáticamente a la sugerencia
    moveKnight(best[0], best[1]);
  }
});

// --- localStorage ---
function loadBest() {
  const val = localStorage.getItem('knight-tour-best') || '0';
  bestEl.textContent = val;
}

function saveBest(score) {
  const prev = parseInt(localStorage.getItem('knight-tour-best') || '0', 10);
  if (score > prev) {
    localStorage.setItem('knight-tour-best', score);
    bestEl.textContent = score;
  }
}

// --- Arranque ---
init();
