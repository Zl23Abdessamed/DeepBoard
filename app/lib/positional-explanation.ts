import { Chess } from 'chess.js';
import { PositionalThemes, getAllPositionalThemes } from './theme-detector';


// ---------------------------------------------------------------------------
// Minimal Stockfish analysis type (centipawn score from white's perspective)
// ---------------------------------------------------------------------------
export interface StockfishAnalysis {
  score: number; // e.g. 0.32 = +0.32 for white, -1.05 = -1.05 for white
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the colour that just moved from a FEN before the move. */
function getMovedColor(fen: string): 'w' | 'b' {
  // FEN format: ... ... ... ... <active color> <castling> <en passant> ...
  const parts = fen.split(' ');
  const color = parts[1];
  if (color !== 'w' && color !== 'b') {
    throw new Error('Invalid FEN: missing active color');
  }
  // The active colour is the side that is to move *before* the move is made.
  // After the move, the other side is to move, so the player who just moved
  // is the opposite of the current active colour in the *after* FEN.
  // But here we receive the *before* FEN, so the player who made the move
  // is the colour indicated by `color`.
  return color as 'w' | 'b';
}

/** Convert Stockfish score (white POV) to the player's perspective. */
function playerEval(score: number, color: 'w' | 'b'): number {
  return color === 'w' ? score : -score;
}

// ---------------------------------------------------------------------------
// Theme diff helpers
// ---------------------------------------------------------------------------

interface ThemeDiff {
  improved: string[]; // human‑readable improvements (from player's perspective)
  worsened: string[]; // human‑readable worsenings
}

/**
 * Compare two PositionalThemes objects and generate textual differences
 * from the point of view of `color`.
 */
function compareThemes(
  before: PositionalThemes,
  after: PositionalThemes,
  color: 'w' | 'b'
): ThemeDiff {
  const improved: string[] = [];
  const worsened: string[] = [];

  // Helper to decide if a change is good for the player
  const isGood = (theme: string, beforeVal: any, afterVal: any): boolean => {
    // For arrays, we look at items gained or lost.
    // For numbers, we check increase/decrease.
    // For booleans, we check gain/loss.
    return false; // will be determined per theme below
  };

  // 1. Open files – gaining open files for your colour (i.e. files with no pawns)
  //    is generally good for a side with rooks. Losing them is bad.
  //    Here we just track total number, but better to report which files gained/lost.
  const openGained = after.openFiles.filter(f => !before.openFiles.includes(f));
  const openLost = before.openFiles.filter(f => !after.openFiles.includes(f));
  if (openGained.length) {
    improved.push(
      `Opened file(s): ${openGained.join(', ')} (favourable for rook activity)`
    );
  }
  if (openLost.length) {
    worsened.push(`Closed file(s): ${openLost.join(', ')}`);
  }

  // 2. Semi‑open files – for the player's colour
  const playerSemiBefore = color === 'w' ? before.semiOpenFiles.white : before.semiOpenFiles.black;
  const playerSemiAfter = color === 'w' ? after.semiOpenFiles.white : after.semiOpenFiles.black;
  const semiGained = playerSemiAfter.filter(f => !playerSemiBefore.includes(f));
  const semiLost = playerSemiBefore.filter(f => !playerSemiAfter.includes(f));
  if (semiGained.length) {
    improved.push(
      `Gained semi‑open file(s): ${semiGained.join(', ')} (good for your rook)`
    );
  }
  if (semiLost.length) {
    worsened.push(
      `Lost semi‑open file(s): ${semiLost.join(', ')}`
    );
  }

  // 3. Passed pawns – passed pawns for the player
  const passedBefore = color === 'w' ? before.passedPawns.white : before.passedPawns.black;
  const passedAfter = color === 'w' ? after.passedPawns.white : after.passedPawns.black;
  const passedGained = passedAfter.filter(p => !passedBefore.includes(p));
  const passedLost = passedBefore.filter(p => !passedAfter.includes(p));
  if (passedGained.length) {
    improved.push(
      `Created passed pawn(s): ${passedGained.join(', ')}`
    );
  }
  if (passedLost.length) {
    worsened.push(
      `Lost passed pawn(s): ${passedLost.join(', ')}`
    );
  }

  // 4. Outposts – friendly outposts
  const outpostBefore = color === 'w' ? before.outposts.white : before.outposts.black;
  const outpostAfter = color === 'w' ? after.outposts.white : after.outposts.black;
  const outpostGained = outpostAfter.filter(o => !outpostBefore.includes(o));
  const outpostLost = outpostBefore.filter(o => !outpostAfter.includes(o));
  if (outpostGained.length) {
    improved.push(
      `Gained knight outpost(s): ${outpostGained.join(', ')} (safe, pawn‑supported square)`
    );
  }
  if (outpostLost.length) {
    worsened.push(
      `Lost knight outpost(s): ${outpostLost.join(', ')}`
    );
  }

  // 5. Isolated pawns – having fewer isolated pawns is good
  const isoBefore = color === 'w' ? before.isolatedPawns.white : before.isolatedPawns.black;
  const isoAfter = color === 'w' ? after.isolatedPawns.white : after.isolatedPawns.black;
  const isoRemoved = isoBefore.filter(p => !isoAfter.includes(p));
  const isoCreated = isoAfter.filter(p => !isoBefore.includes(p));
  if (isoRemoved.length) {
    improved.push(
      `Eliminated isolated pawn(s): ${isoRemoved.join(', ')} (improved pawn structure)`
    );
  }
  if (isoCreated.length) {
    worsened.push(
      `Created isolated pawn(s): ${isoCreated.join(', ')} (now a weakness)`
    );
  }

  // 6. Doubled pawns – fewer is better
  const dubBefore = color === 'w' ? before.doubledPawns.white : before.doubledPawns.black;
  const dubAfter = color === 'w' ? after.doubledPawns.white : after.doubledPawns.black;
  const dubRemoved = dubBefore.filter(p => !dubAfter.includes(p));
  const dubCreated = dubAfter.filter(p => !dubBefore.includes(p));
  if (dubRemoved.length) {
    improved.push(
      `Undoubled pawn(s): ${dubRemoved.join(', ')} (now a healthy structure)`
    );
  }
  if (dubCreated.length) {
    worsened.push(
      `Doubled pawn(s): ${dubCreated.join(', ')} (weakness)`
    );
  }

  // 7. Backward pawns
  const backBefore = color === 'w' ? before.backwardPawns.white : before.backwardPawns.black;
  const backAfter = color === 'w' ? after.backwardPawns.white : after.backwardPawns.black;
  const backRemoved = backBefore.filter(p => !backAfter.includes(p));
  const backCreated = backAfter.filter(p => !backBefore.includes(p));
  if (backRemoved.length) {
    improved.push(
      `Resolved backward pawn(s): ${backRemoved.join(', ')} (can now be advanced safely)`
    );
  }
  if (backCreated.length) {
    worsened.push(
      `Created backward pawn(s): ${backCreated.join(', ')} (difficult to advance)`
    );
  }

  // 8. Bishop pair
  const bishopPairBefore = color === 'w' ? before.bishopPair.white : before.bishopPair.black;
  const bishopPairAfter = color === 'w' ? after.bishopPair.white : after.bishopPair.black;
  if (!bishopPairBefore && bishopPairAfter) {
    improved.push('Obtained the bishop pair');
  } else if (bishopPairBefore && !bishopPairAfter) {
    worsened.push('Lost the bishop pair');
  }

  // 9. Central control – higher is better
  const centralBefore = color === 'w' ? before.centralControl.white : before.centralControl.black;
  const centralAfter = color === 'w' ? after.centralControl.white : after.centralControl.black;
  const centralDelta = centralAfter - centralBefore;
  if (centralDelta > 0) {
    improved.push(
      `Increased central control (${centralBefore} → ${centralAfter} attacks on d4/d5/e4/e5)`
    );
  } else if (centralDelta < 0) {
    worsened.push(
      `Decreased central control (${centralBefore} → ${centralAfter})`
    );
  }

  // 10. King safety – higher is safer
  const kingBefore = color === 'w' ? before.kingSafety.white : before.kingSafety.black;
  const kingAfter = color === 'w' ? after.kingSafety.white : after.kingSafety.black;
  const kingDelta = kingAfter - kingBefore;
  if (kingDelta > 0) {
    improved.push(
      `Improved king safety (score ${kingBefore} → ${kingAfter})`
    );
  } else if (kingDelta < 0) {
    worsened.push(
      `Reduced king safety (score ${kingBefore} → ${kingAfter})`
    );
  }

  // 11. Piece activity – undeveloped count (lower is better) & rook connection
  const activityBefore = color === 'w' ? before.pieceActivity.white : before.pieceActivity.black;
  const activityAfter = color === 'w' ? after.pieceActivity.white : after.pieceActivity.black;

  const undevelopedDelta = activityBefore.undevelopedCount - activityAfter.undevelopedCount;
  if (undevelopedDelta > 0) {
    improved.push(
      `Developed ${undevelopedDelta} minor piece(s) (remaining undeveloped: ${activityAfter.undevelopedCount})`
    );
  } else if (undevelopedDelta < 0) {
    worsened.push(
      `Increased undeveloped piece count (${activityBefore.undevelopedCount} → ${activityAfter.undevelopedCount})`
    );
  }

  if (!activityBefore.rooksConnected && activityAfter.rooksConnected) {
    improved.push('Rooks are now connected on the back rank');
  } else if (activityBefore.rooksConnected && !activityAfter.rooksConnected) {
    worsened.push('Rooks are no longer connected');
  }

  return { improved, worsened };
}

// ---------------------------------------------------------------------------
// Main functions
// ---------------------------------------------------------------------------

/**
 * Explains why a move is good (evaluation >= 0 from the player's perspective).
 *
 * @param fen            FEN of the position *before* the move.
 * @param move           The move played, in Standard Algebraic Notation (e.g. "Nf3").
 * @param analysisBefore Stockfish analysis of the position before the move.
 * @param analysisAfter  Stockfish analysis after the move.
 * @returns A human‑readable explanation of the positional improvements.
 */
export function explainGoodMove(
  fen: string,
  move: string,
  analysisBefore: StockfishAnalysis,
  analysisAfter: StockfishAnalysis
): string {
  const color = getMovedColor(fen);

  // Load positions
  const chessBefore = new Chess(fen);
  const chessAfter = new Chess(fen);
  try {
    const moveObj = chessAfter.move(move);
    if (!moveObj) throw new Error('Illegal move');
  } catch (e) {
    return `Invalid move: ${move}`;
  }

  const beforeThemes = getAllPositionalThemes(chessBefore);
  const afterThemes = getAllPositionalThemes(chessAfter);

  const diff = compareThemes(beforeThemes, afterThemes, color);

  const lines: string[] = [];
  if (diff.improved.length === 0) {
    lines.push(
      `Your move ${move} improved the evaluation, but no clear positional change was detected. The improvement may be tactical.`
    );
  } else {
    lines.push(
      `Your move ${move} improved your position. Key positional improvements:`
    );
    diff.improved.forEach((msg, i) => lines.push(`  ${i + 1}. ${msg}`));
  }

  return lines.join('\n');
}

/**
 * Explains why a move is bad / a mistake / a blunder (evaluation < 0 from the player's perspective).
 *
 * @param fen            FEN before the move.
 * @param move           Move in SAN.
 * @param analysisBefore Stockfish analysis before the move.
 * @param analysisAfter  Stockfish analysis after the move.
 * @returns A human‑readable explanation of the positional problems caused.
 */
export function explainBadMove(
  fen: string,
  move: string,
  analysisBefore: StockfishAnalysis,
  analysisAfter: StockfishAnalysis
): string {
  const color = getMovedColor(fen);

  const chessBefore = new Chess(fen);
  const chessAfter = new Chess(fen);
  try {
    chessAfter.move(move);
  } catch (e) {
    return `Invalid move: ${move}`;
  }

  const beforeThemes = getAllPositionalThemes(chessBefore);
  const afterThemes = getAllPositionalThemes(chessAfter);

  const diff = compareThemes(beforeThemes, afterThemes, color);

  const lines: string[] = [];
  if (diff.worsened.length === 0) {
    lines.push(
      `Your move ${move} worsened the evaluation, but no clear positional change was detected. The loss may be tactical or due to a hidden threat.`
    );
  } else {
    lines.push(
      `Your move ${move} is a mistake / blunder. It weakened your position in these ways:`
    );
    diff.worsened.forEach((msg, i) => lines.push(`  ${i + 1}. ${msg}`));
  }

  return lines.join('\n');
}