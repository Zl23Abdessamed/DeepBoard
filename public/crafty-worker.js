/**
 * crafty-worker.js
 *
 * Plain JavaScript Web Worker — intentionally NOT a .ts file processed by
 * webpack/Next's worker-loader. It lives in /public alongside crafty.js
 * and crafty.wasm and is loaded with `new Worker('/crafty-worker.js')`
 * (a root-relative URL), which sidesteps Next's bundler-relative worker
 * resolution (`new URL('./x.ts', import.meta.url)`) entirely — that's
 * what was failing to resolve.
 *
 * Protocol (main -> worker):
 *   { id, type: 'analyze', fen, depth }
 *   { id, type: 'bestmove', fen, depth, skillLevel }
 *
 * Protocol (worker -> main):
 *   { id, type: 'result', payload }
 *   { id, type: 'error', message }
 *   { type: 'ready' }            // sent once after the wasm module loads
 */

let modulePromise = null;

// Crafty's own search trace (captured via the `print` callback) is the
// only reliable source of the evaluation score in this build:
// `Module._crafty_get_score()` was confirmed to always return 0 here even
// though the engine's printed output shows the real value, e.g.:
//   " 10->   0.01/36.00    2.62   1. Rf3g3 Qe2f3 2. ..."
// (depth -> time/nodes  score  variation). We buffer recent print lines
// and pull the score back out of them after each search.
let recentOutputLines = [];
const MAX_BUFFERED_LINES = 50;

function bufferOutputLine(text) {
  recentOutputLines.push(text);
  if (recentOutputLines.length > MAX_BUFFERED_LINES) {
    recentOutputLines.shift();
  }
}

// Matches a completed-depth search line like:
//   " 10->   0.01/36.00    2.62   1. Rf3g3 ..."
//   " 12->   1.34/512.00  -1.05   1. ... e7e6 2. ..."
// Group 1 is the score, which can be negative and is always a decimal
// (pawns, not centipawns) in Crafty's printed output.
const SCORE_LINE_RE = /^\s*\d+(?:->|\s)\s*[\d.:]+\/[\d.]+\s+(-?\d+\.\d+)\s+/;

// Mate scores print as e.g. "+Mate3" / "-Mate3" instead of a decimal.
const MATE_LINE_RE = /^\s*\d+(?:->|\s)\s*[\d.:]+\/[\d.]+\s+([+-]?)Mate(\d+)\s+/i;

function extractScoreFromOutput() {
  // Walk backwards: the most recent matching line is the final/deepest
  // result for the search that just completed.
  for (let i = recentOutputLines.length - 1; i >= 0; i--) {
    const line = recentOutputLines[i];
    const mateMatch = line.match(MATE_LINE_RE);
    if (mateMatch) {
      const sign = mateMatch[1] === '-' ? -1 : 1;
      const movesToMate = parseInt(mateMatch[2], 10);
      return sign * (32000 - movesToMate);
    }
    const scoreMatch = line.match(SCORE_LINE_RE);
    if (scoreMatch) {
      const pawns = parseFloat(scoreMatch[1]);
      return Math.round(pawns * 100); // convert to centipawns, matching the rest of the app
    }
  }
  return null;
}

function loadModule() {
  if (!modulePromise) {
    modulePromise = new Promise((resolve, reject) => {
      try {
        // Both files are root-relative because they live in /public.
        importScripts('/crafty.js');
        // crafty.js (Emscripten glue) attaches a global factory function,
        // CraftyModule, to this worker's global scope (NOT "CraftyWASM" —
        // that was a naming mismatch from an earlier draft of the guide).
        // We pass locateFile explicitly: Emscripten's default locateFile
        // resolves relative to where the script believes it's running,
        // which can be wrong when crafty.js is pulled in via
        // importScripts() inside a worker instead of a <script> tag —
        // pointing it straight at the root-relative /crafty.wasm avoids
        // any ambiguity there.
        self
          .CraftyModule({
            locateFile: (path) => (path.endsWith('.wasm') ? '/crafty.wasm' : `/${path}`),
            // Capture Crafty's search trace so we can parse the real score
            // out of it — see extractScoreFromOutput() above. _crafty_get_score()
            // is exported but always returns 0 in this build, so the printed
            // text is the only place the engine's actual evaluation shows up.
            print: (text) => bufferOutputLine(text),
            printErr: (text) => bufferOutputLine(text),
          })
          .then(resolve)
          .catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }
  return modulePromise;
}

// Crafty's FEN getter only returns piece placement + side to move, so we
// pull the side-to-move character from the *input* FEN we set, rather than
// trusting crafty_get_board_fen() for anything beyond piece placement.
function sideToMoveFromFen(fen) {
  const parts = fen.trim().split(/\s+/);
  return parts[1] === 'b' ? 'b' : 'w';
}

function readLegalMoves(Module) {
  const MAX_MOVES = 256;
  const BYTES_PER_MOVE = 8;
  const bufPtr = Module._malloc(MAX_MOVES * BYTES_PER_MOVE);
  try {
    const count = Module._crafty_legal_moves(bufPtr, MAX_MOVES);
    const moves = [];
    for (let i = 0; i < count; i++) {
      const move = Module.UTF8ToString(bufPtr + i * BYTES_PER_MOVE);
      if (move) moves.push(move);
    }
    return moves;
  } finally {
    Module._free(bufPtr);
  }
}

async function runAnalysis(fen, depth) {
  const Module = await loadModule();

  Module.ccall('crafty_set_position', null, ['string'], [fen]);
  Module.ccall('crafty_set_depth', null, ['number'], [depth]);

  const legalMoves = readLegalMoves(Module);

  if (legalMoves.length === 0) {
    const isMate = !!Module._crafty_is_mate();
    return {
      bestmove: '',
      score: isMate ? (sideToMoveFromFen(fen) === 'w' ? -32000 : 32000) : 0,
      mate: isMate,
      stalemate: !!Module._crafty_is_stalemate(),
      depth,
      pv: [],
    };
  }

  // crafty_go() searches AND plays the move on Crafty's internal board,
  // and returns the move it played. Clear the output buffer right before
  // searching so extractScoreFromOutput() only sees lines from *this*
  // search and can't accidentally pick up a stale score from the
  // previous position.
  recentOutputLines = [];
  const bestmove = Module.ccall('crafty_go', 'string', [], []);

  // _crafty_get_score() is exported but reliably returns 0 in this build
  // (confirmed via diagnostic logging — the engine's own printed search
  // trace shows the real value on the same line). Parse the score back
  // out of stdout instead, with the C accessor only as a last-resort
  // fallback if parsing finds nothing (e.g. unexpected output format).
  const parsedScore = extractScoreFromOutput();
  const rawScore = parsedScore !== null ? parsedScore : Module._crafty_get_score();

  // crafty_get_score() (and our parsed equivalent) is reported from the
  // perspective of the side that was to move *before* crafty_go() played
  // its move. Normalize to White's perspective so downstream UI (eval
  // bar, etc.) doesn't have to guess.
  const sideToMove = sideToMoveFromFen(fen);
  const scoreWhitePerspective = sideToMove === 'b' ? -rawScore : rawScore;

  // Reset Crafty back to the requested position since crafty_go() mutated
  // its internal board — keeps each analyze() call independent.
  Module.ccall('crafty_set_position', null, ['string'], [fen]);

  return {
    bestmove,
    score: scoreWhitePerspective,
    mate: Math.abs(rawScore) > 30000,
    stalemate: false,
    depth,
    pv: bestmove ? [bestmove] : [],
  };
}

async function runBestMove(fen, depth, skillLevel) {
  const Module = await loadModule();

  // Crafty has no native "Skill Level" UCI option like Stockfish. Weaker
  // play is approximated by capping search depth — the documented lever
  // available (crafty_set_depth / "sd" command).
  const clampedSkill = Math.max(0, Math.min(20, skillLevel));
  const effectiveDepth = Math.max(1, Math.round((clampedSkill / 20) * depth) || 1);

  Module.ccall('crafty_set_position', null, ['string'], [fen]);
  Module.ccall('crafty_set_depth', null, ['number'], [effectiveDepth]);

  recentOutputLines = [];
  const bestmove = Module.ccall('crafty_go', 'string', [], []);
  const parsedScore = extractScoreFromOutput();
  const rawScore = parsedScore !== null ? parsedScore : Module._crafty_get_score();
  const sideToMove = sideToMoveFromFen(fen);
  const score = sideToMove === 'b' ? -rawScore : rawScore;

  // Put the board back so this worker stays stateless across requests.
  Module.ccall('crafty_set_position', null, ['string'], [fen]);

  return { bestmove, score };
}

self.onmessage = async (event) => {
  const msg = event.data;
  try {
    if (msg.type === 'analyze') {
      const payload = await runAnalysis(msg.fen, msg.depth);
      self.postMessage({ id: msg.id, type: 'result', payload });
    } else if (msg.type === 'bestmove') {
      const payload = await runBestMove(msg.fen, msg.depth, msg.skillLevel);
      self.postMessage({ id: msg.id, type: 'result', payload });
    }
  } catch (err) {
    self.postMessage({
      id: msg.id,
      type: 'error',
      message: (err && err.message) || 'Crafty worker error',
    });
  }
};

// Warm the module up immediately so the first real request doesn't pay the
// full load cost on top of search time.
loadModule()
  .then(() => self.postMessage({ type: 'ready' }))
  .catch((err) =>
    self.postMessage({ type: 'error', message: (err && err.message) || 'Failed to load Crafty' })
  );