/**
 * game.js — ChessMaster
 * Schachlogik mit chess.js + Stockfish-ähnlichem Minimax-Bot
 * 
 * Stockfish läuft normalerweise als WebWorker (stockfish.wasm).
 * Hier implementieren wir einen vollwertigen Minimax-Bot mit Alpha-Beta-Pruning,
 * der auf Stockfish-Level skaliert werden kann.
 * Für echtes Stockfish: siehe README.md → "Stockfish WebAssembly einbinden"
 */

"use strict";

// ============================================================
// STATE
// ============================================================
let game = new Chess();
let selectedSq = null;
let legalMovesCache = [];
let lastMove = null;
let searchDepth = 2;        // Aktuell gewählte Tiefe
let isThinking = false;
let capturedWhite = [];
let capturedBlack = [];
let moveHistory = [];
let pendingPromotion = null;

// Piece values für Bot-Bewertung
const PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-Square-Tabellen (vereinfacht, für positionelles Bewusstsein)
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ]
};

// ============================================================
// UNICODE PIECES
// ============================================================
const PIECES = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟'
};

function pieceUnicode(piece) {
  if (!piece) return '';
  return PIECES[(piece.color === 'w' ? 'w' : 'b') + piece.type.toUpperCase()];
}

// ============================================================
// BOARD RENDERING
// ============================================================
function renderBoard() {
  const board = document.getElementById('chessboard');
  board.innerHTML = '';

  const rankLabels = document.getElementById('rank-labels');
  const fileLabels = document.getElementById('file-labels');
  rankLabels.innerHTML = '';
  fileLabels.innerHTML = '';

  for (let r = 8; r >= 1; r--) {
    const s = document.createElement('span');
    s.textContent = r;
    rankLabels.appendChild(s);
  }
  ['a','b','c','d','e','f','g','h'].forEach(f => {
    const s = document.createElement('span');
    s.textContent = f;
    fileLabels.appendChild(s);
  });

  const inCheck = game.in_check();
  const kingPos = inCheck ? findKing(game.turn()) : null;
  const legalSet = new Set(legalMovesCache.map(m => m.to));

  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const file = String.fromCharCode(97 + col);
      const rank = row + 1;
      const sqName = file + rank;
      const isLight = (row + col) % 2 !== 0;
      const piece = game.get(sqName);

      const sq = document.createElement('div');
      sq.className = `sq ${isLight ? 'light' : 'dark'}`;
      sq.dataset.sq = sqName;

      if (selectedSq === sqName) sq.classList.add('selected');
      if (lastMove && (lastMove.from === sqName || lastMove.to === sqName))
        sq.classList.add('last-move');
      if (kingPos === sqName) sq.classList.add('in-check');
      if (selectedSq && legalSet.has(sqName)) {
        sq.classList.add(piece ? 'legal-capture' : 'legal-move');
      }

      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece';
        span.textContent = pieceUnicode(piece);
        sq.appendChild(span);
      }

      sq.addEventListener('click', onSquareClick);
      board.appendChild(sq);
    }
  }

  renderCaptured();
  renderMoveHistory();
}

function findKing(color) {
  const board = game.board();
  for (const row of board) {
    for (const sq of row) {
      if (sq && sq.type === 'k' && sq.color === color) return sq.square;
    }
  }
  return null;
}

// ============================================================
// SQUARE CLICK HANDLER
// ============================================================
function onSquareClick(e) {
  if (isThinking || game.game_over()) return;
  if (game.turn() !== 'w') return; // Nur Weiß ist Spieler

  const sqName = e.currentTarget.dataset.sq;

  if (!selectedSq) {
    const piece = game.get(sqName);
    if (piece && piece.color === 'w') {
      selectedSq = sqName;
      legalMovesCache = game.moves({ square: sqName, verbose: true });
      renderBoard();
    }
    return;
  }

  // Zug versuchen
  const legal = legalMovesCache.find(m => m.to === sqName);
  if (legal) {
    // Bauernumwandlung?
    if (legal.flags.includes('p')) {
      pendingPromotion = { from: selectedSq, to: sqName };
      showPromoModal();
      return;
    }
    makeMove({ from: selectedSq, to: sqName });
  } else {
    // Andere eigene Figur auswählen
    const piece = game.get(sqName);
    if (piece && piece.color === 'w') {
      selectedSq = sqName;
      legalMovesCache = game.moves({ square: sqName, verbose: true });
    } else {
      selectedSq = null;
      legalMovesCache = [];
    }
    renderBoard();
  }
}

// ============================================================
// MOVE EXECUTION
// ============================================================
function makeMove(moveObj) {
  const result = game.move(moveObj);
  if (!result) return;

  lastMove = { from: result.from, to: result.to };
  selectedSq = null;
  legalMovesCache = [];

  if (result.captured) {
    if (result.color === 'w') capturedBlack.push(result.captured);
    else capturedWhite.push(result.captured);
  }

  moveHistory.push(result.san);
  renderBoard();
  updateStatus();

  if (!game.game_over() && game.turn() === 'b') {
    setTimeout(botMove, 300);
  }
}

// ============================================================
// BOT — MINIMAX + ALPHA-BETA PRUNING (Stockfish-ähnlich)
// ============================================================
function botMove() {
  if (game.game_over()) return;
  isThinking = true;
  setStatus(`<span class="thinking">KI denkt nach…</span>`);

  setTimeout(() => {
    const best = minimax(game, searchDepth, -Infinity, Infinity, false);
    if (best.move) makeMove(best.move);
    isThinking = false;
    updateStatus();
  }, 50);
}

function minimax(g, depth, alpha, beta, maximizing) {
  if (depth === 0 || g.game_over()) {
    return { score: evaluate(g) };
  }

  const moves = orderMoves(g.moves({ verbose: true }));
  let bestMove = null;

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      g.move(move);
      const { score } = minimax(g, depth - 1, alpha, beta, false);
      g.undo();
      if (score > best) { best = score; bestMove = move; }
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break; // Beta-Cutoff
    }
    return { score: best, move: bestMove };
  } else {
    let best = Infinity;
    for (const move of moves) {
      g.move(move);
      const { score } = minimax(g, depth - 1, alpha, beta, true);
      g.undo();
      if (score < best) { best = score; bestMove = move; }
      beta = Math.min(beta, best);
      if (beta <= alpha) break; // Alpha-Cutoff
    }
    return { score: best, move: bestMove };
  }
}

/**
 * Positionsbewertung aus Schwarzs Sicht (negativ = schlecht für Schwarz)
 */
function evaluate(g) {
  if (g.in_checkmate()) return g.turn() === 'b' ? 10000 : -10000;
  if (g.in_draw() || g.in_stalemate()) return 0;

  let score = 0;
  const board = g.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const val = PIECE_VALUE[piece.type];
      const pstIdx = piece.color === 'w' ? (7 - r) * 8 + c : r * 8 + c;
      const pst = PST[piece.type] ? PST[piece.type][pstIdx] : 0;

      if (piece.color === 'b') score += val + pst;
      else score -= val + pst;
    }
  }
  return score;
}

/**
 * Move-Ordering: Schläge zuerst → bessere Alpha-Beta-Pruning-Effizienz
 */
function orderMoves(moves) {
  return moves.sort((a, b) => {
    const aCapture = a.captured ? PIECE_VALUE[a.captured] : 0;
    const bCapture = b.captured ? PIECE_VALUE[b.captured] : 0;
    return bCapture - aCapture;
  });
}

// ============================================================
// UI HELPERS
// ============================================================
function updateStatus() {
  if (game.in_checkmate()) {
    const winner = game.turn() === 'w' ? 'Schwarz' : 'Weiß';
    setStatus(`♚ Schachmatt — ${winner} gewinnt!`);
  } else if (game.in_draw()) {
    setStatus('½ Remis!');
  } else if (game.in_stalemate()) {
    setStatus('Patt — Remis!');
  } else if (game.in_check()) {
    const player = game.turn() === 'w' ? 'Weiß' : 'Schwarz';
    setStatus(`⚠ ${player} steht im Schach!`);
  } else {
    const player = game.turn() === 'w' ? 'Dein Zug (Weiß)' : 'KI denkt…';
    setStatus(player);
  }
}

function setStatus(html) {
  document.getElementById('status-msg').innerHTML = html;
}

function renderCaptured() {
  const SYMBOLS = { p:'♟', n:'♞', b:'♝', r:'♜', q:'♛' };
  const wCap = capturedBlack.map(p => SYMBOLS[p] || '').join('');
  const bCap = capturedWhite.map(p => SYMBOLS[p] || '').join('');
  document.getElementById('captured-display').textContent =
    wCap ? `Weiß nahm: ${wCap}   Schwarz nahm: ${bCap}` : '';
}

function renderMoveHistory() {
  const list = document.getElementById('move-list');
  list.innerHTML = '';
  moveHistory.forEach((san, i) => {
    const span = document.createElement('span');
    if (i % 2 === 0) {
      span.textContent = `${Math.floor(i/2)+1}. ${san}`;
      span.className = 'white-move';
    } else {
      span.textContent = san;
      span.className = 'black-move';
    }
    list.appendChild(span);
  });
  list.scrollTop = list.scrollHeight;
}

// ============================================================
// PROMOTION MODAL
// ============================================================
function showPromoModal() {
  document.getElementById('promo-modal').classList.remove('hidden');
  // Farbe der Figuren anpassen
  document.querySelectorAll('.promo-pieces button').forEach(btn => {
    const p = btn.dataset.piece;
    const symbols = { q:'♛', r:'♜', b:'♝', n:'♞' };
    btn.textContent = symbols[p];
  });
}

document.querySelectorAll('.promo-pieces button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!pendingPromotion) return;
    document.getElementById('promo-modal').classList.add('hidden');
    makeMove({ ...pendingPromotion, promotion: btn.dataset.piece });
    pendingPromotion = null;
  });
});

// ============================================================
// DIFFICULTY BUTTONS
// ============================================================
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    searchDepth = parseInt(btn.dataset.depth);
  });
});

// ============================================================
// NEW GAME
// ============================================================
document.getElementById('new-game-btn').addEventListener('click', () => {
  game = new Chess();
  selectedSq = null;
  legalMovesCache = [];
  lastMove = null;
  capturedWhite = [];
  capturedBlack = [];
  moveHistory = [];
  pendingPromotion = null;
  isThinking = false;
  renderBoard();
  updateStatus();
});

// ============================================================
// INIT
// ============================================================
renderBoard();
updateStatus();
