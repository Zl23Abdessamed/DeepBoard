import { Chess, Piece } from 'chess.js';

// ---------------------------------------------------------------------------
// Comprehensive positional themes interface
// ---------------------------------------------------------------------------
export interface PositionalThemes {
  openFiles: string[];
  semiOpenFiles: { white: string[]; black: string[] }; // files with only one side's pawns missing
  passedPawns: { white: string[]; black: string[] };
  outposts: {
    white: string[]; // squares ideal for white knights (defended, not attacked by pawns)
    black: string[];
  };
  isolatedPawns: { white: string[]; black: string[] };
  doubledPawns: { white: string[]; black: string[] };
  backwardPawns: { white: string[]; black: string[] };
  bishopPair: { white: boolean; black: boolean };
  centralControl: { white: number; black: number }; // weighted sum of attacks on central squares
  kingSafety: { white: number; black: number }; // heuristic (higher = safer)
  pieceActivity: {
    white: {
      undevelopedCount: number; // minor pieces still on starting squares
      rooksConnected: boolean;
    };
    black: {
      undevelopedCount: number;
      rooksConnected: boolean;
    };
  };
}

// ---------------------------------------------------------------------------
// Board helpers – chess.js board() rows: 0=8th rank, 7=1st rank
// ---------------------------------------------------------------------------
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

/** Convert file letter to column index */
function fileToCol(file: string): number {
  return FILES.indexOf(file as typeof FILES[number]);
}

/** Convert square string (e.g. 'e4') to [row, col] in board array */
function squareToCoords(sq: string): [number, number] {
  const file = sq[0];
  const rank = Number(sq[1]);
  const col = fileToCol(file);
  const row = 8 - rank; // chess.js board index: rank 8 -> row 0, rank 1 -> row 7
  return [row, col];
}

/** Check if a square is defended by a friendly pawn */
function isDefendedByPawn(
  board: (Piece | null)[][],
  row: number,
  col: number,
  color: 'w' | 'b'
): boolean {
  // A pawn defends squares diagonally forward.
  // For white (moves upward, decreasing row): defend squares are (row-1, col±1)
  // Thus a defending white pawn must be at (row+1, col±1) – one rank "below" the target.
  const pawnRow = color === 'w' ? row + 1 : row - 1;
  if (pawnRow < 0 || pawnRow > 7) return false;

  for (const c of [col - 1, col + 1]) {
    if (c >= 0 && c < 8) {
      const piece = board[pawnRow][c];
      if (piece && piece.type === 'p' && piece.color === color) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check whether an enemy pawn can ever attack the given square.
 * (Only looks at immediate pawn attacks – an enemy pawn must be exactly one
 * rank away on an adjacent file, in the direction that pawn moves.)
 */
function canBeAttackedByPawn(
  board: (Piece | null)[][],
  row: number,
  col: number,
  enemyColor: 'w' | 'b'
): boolean {
  const adjCols = [col - 1, col + 1].filter(c => c >= 0 && c < 8);
  if (enemyColor === 'w') {
    // White pawn attacks upward (decreasing row): it must be at row+1
    const pawnRow = row + 1;
    if (pawnRow > 7) return false;
    return adjCols.some(
      c => board[pawnRow][c]?.type === 'p' && board[pawnRow][c]?.color === 'w'
    );
  } else {
    // Black pawn attacks downward (increasing row): it must be at row-1
    const pawnRow = row - 1;
    if (pawnRow < 0) return false;
    return adjCols.some(
      c => board[pawnRow][c]?.type === 'p' && board[pawnRow][c]?.color === 'b'
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Open files (no pawns at all)
// ---------------------------------------------------------------------------
export function getOpenFiles(chess: Chess): string[] {
  const board = chess.board();
  const openFiles: string[] = [];
  for (let col = 0; col < 8; col++) {
    let hasPawn = false;
    for (let row = 0; row < 8; row++) {
      if (board[row][col]?.type === 'p') {
        hasPawn = true;
        break;
      }
    }
    if (!hasPawn) openFiles.push(FILES[col]);
  }
  return openFiles;
}

// ---------------------------------------------------------------------------
// 2. Semi‑open files (only one side’s pawns missing)
// ---------------------------------------------------------------------------
export function getSemiOpenFiles(
  chess: Chess
): { white: string[]; black: string[] } {
  const board = chess.board();
  const white: string[] = [];
  const black: string[] = [];

  for (let col = 0; col < 8; col++) {
    let whitePawn = false;
    let blackPawn = false;
    for (let row = 0; row < 8; row++) {
      const piece = board[row][col];
      if (piece?.type === 'p') {
        if (piece.color === 'w') whitePawn = true;
        else blackPawn = true;
        if (whitePawn && blackPawn) break; // both present -> not semi-open
      }
    }
    if (whitePawn && !blackPawn) black.push(FILES[col]); // semi-open for black
    if (!whitePawn && blackPawn) white.push(FILES[col]); // semi-open for white
  }
  return { white, black };
}

// ---------------------------------------------------------------------------
// 3. Passed pawns
// ---------------------------------------------------------------------------
export function getPassedPawns(chess: Chess): { white: string[]; black: string[] } {
  const board = chess.board();
  const passed = { white: [] as string[], black: [] as string[] };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.type !== 'p') continue;

      const isWhite = piece.color === 'w';
      let isPassed = true;
      const targetCols = [col - 1, col, col + 1].filter(c => c >= 0 && c < 8);

      if (isWhite) {
        // White pawn advances to lower row indices (toward rank 8)
        for (let r = 0; r < row; r++) {
          for (const c of targetCols) {
            const p = board[r][c];
            if (p && p.color === 'b' && p.type === 'p') {
              isPassed = false;
              break;
            }
          }
          if (!isPassed) break;
        }
        if (isPassed) passed.white.push(piece.square);
      } else {
        // Black pawn advances to higher row indices (toward rank 1)
        for (let r = row + 1; r < 8; r++) {
          for (const c of targetCols) {
            const p = board[r][c];
            if (p && p.color === 'w' && p.type === 'p') {
              isPassed = false;
              break;
            }
          }
          if (!isPassed) break;
        }
        if (isPassed) passed.black.push(piece.square);
      }
    }
  }
  return passed;
}

// ---------------------------------------------------------------------------
// 4. Knight outposts (defended by own pawn, not attacked by any enemy pawn)
//    Only squares on ranks 3‑6 for the side that owns the knight.
// ---------------------------------------------------------------------------
export function getOutposts(chess: Chess): { white: string[]; black: string[] } {
  const board = chess.board();
  const outposts = { white: [] as string[], black: [] as string[] };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.type !== 'n') continue;

      const isWhite = piece.color === 'w';
      const rank = 8 - row; // rank 1‑8

      // Only consider squares on appropriate ranks
      if (isWhite && (rank === 4 || rank === 5 || rank === 6)) {
        if (
          isDefendedByPawn(board, row, col, 'w') &&
          !canBeAttackedByPawn(board, row, col, 'b')
        ) {
          outposts.white.push(piece.square);
        }
      } else if (!isWhite && (rank === 3 || rank === 4 || rank === 5)) {
        if (
          isDefendedByPawn(board, row, col, 'b') &&
          !canBeAttackedByPawn(board, row, col, 'w')
        ) {
          outposts.black.push(piece.square);
        }
      }
    }
  }
  return outposts;
}


// ---------------------------------------------------------------------------
// 6. Pawn structure defects
// ---------------------------------------------------------------------------
export function getIsolatedPawns(
  chess: Chess
): { white: string[]; black: string[] } {
  const board = chess.board();
  const result = { white: [] as string[], black: [] as string[] };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.type !== 'p') continue;
      const color = piece.color;
      const adjFiles = [col - 1, col + 1].filter(c => c >= 0 && c < 8);
      let hasFriendOnAdjFile = false;
      for (const c of adjFiles) {
        // check whole file for friendly pawn of same colour
        for (let r = 0; r < 8; r++) {
          const p = board[r][c];
          if (p && p.type === 'p' && p.color === color) {
            hasFriendOnAdjFile = true;
            break;
          }
        }
        if (hasFriendOnAdjFile) break;
      }
      if (!hasFriendOnAdjFile) {
        (color === 'w' ? result.white : result.black).push(piece.square);
      }
    }
  }
  return result;
}

export function getDoubledPawns(
  chess: Chess
): { white: string[]; black: string[] } {
  const board = chess.board();
  const result = { white: [] as string[], black: [] as string[] };

  for (let col = 0; col < 8; col++) {
    const whitePawns: number[] = [];
    const blackPawns: number[] = [];
    for (let row = 0; row < 8; row++) {
      const piece = board[row][col];
      if (piece?.type === 'p') {
        if (piece.color === 'w') whitePawns.push(row);
        else blackPawns.push(row);
      }
    }
    // More than one pawn on the same file for a colour -> all of them are doubled
    if (whitePawns.length > 1) {
      for (const row of whitePawns) {
        result.white.push(board[row][col]!.square);
      }
    }
    if (blackPawns.length > 1) {
      for (const row of blackPawns) {
        result.black.push(board[row][col]!.square);
      }
    }
  }
  return result;
}

/**
 * Backward pawn: a pawn that cannot be safely advanced and is not defended
 * by another pawn, and whose adjacent files contain no friendly pawn behind it
 * (i.e. less advanced) that could support it.
 */
export function getBackwardPawns(
  chess: Chess
): { white: string[]; black: string[] } {
  const board = chess.board();
  const result = { white: [] as string[], black: [] as string[] };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece || piece.type !== 'p') continue;

      const color = piece.color;
      const isWhite = color === 'w';
      const forwardRow = isWhite ? row - 1 : row + 1; // square immediately in front
      const startRank = isWhite ? 6 : 1; // row index of starting rank

      // If the pawn can safely advance, it's not backward
      const canAdvance =
        forwardRow >= 0 &&
        forwardRow < 8 &&
        board[forwardRow][col] === null &&
        !canBeAttackedByPawn(
          board,
          forwardRow,
          col,
          isWhite ? 'b' : 'w'
        );
      if (canAdvance) continue;

      // Check if it's defended by a friendly pawn on an adjacent file
      if (isDefendedByPawn(board, row, col, color)) continue;

      // Check if there is a friendly pawn on an adjacent file that is less
      // advanced (i.e. behind this pawn) that could later support it.
      const adjFiles = [col - 1, col + 1].filter(c => c >= 0 && c < 8);
      let hasSupportBehind = false;
      for (const c of adjFiles) {
        for (let r = 0; r < 8; r++) {
          const p = board[r][c];
          if (p && p.type === 'p' && p.color === color) {
            // For white, "behind" means higher row index; for black, lower.
            const isBehind = isWhite ? r > row : r < row;
            if (isBehind) {
              hasSupportBehind = true;
              break;
            }
          }
        }
        if (hasSupportBehind) break;
      }
      if (hasSupportBehind) continue;

      // Finally, consider the pawn backward
      (color === 'w' ? result.white : result.black).push(piece.square);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 7. Bishop pair
// ---------------------------------------------------------------------------
export function hasBishopPair(chess: Chess, color: 'w' | 'b'): boolean {
  let lightBishop = false;
  let darkBishop = false;
  const board = chess.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'b' && piece.color === color) {
        const squareColor = (row + col) % 2;
        if (squareColor === 0) lightBishop = true;
        else darkBishop = true;
      }
    }
  }
  return lightBishop && darkBishop;
}

// ---------------------------------------------------------------------------
// 8. Central control (weighted attacks on d4,d5,e4,e5)
// ---------------------------------------------------------------------------
function centralAttacks(
  chess: Chess,
  color: 'w' | 'b'
): number {
  const board = chess.board();
  const centralSquares = ['d4', 'd5', 'e4', 'e5'];
  let total = 0;
  const enemyColor = color === 'w' ? 'b' : 'w';

  for (const sq of centralSquares) {
    const [row, col] = squareToCoords(sq);

    // Count attackers from the given color on that central square
    // We do a simple manual attack detection based on piece types.
    const piece = board[row][col];
    const isOccupiedByOwn = piece?.color === color;
    // We count even if square is occupied – it still exerts control
    // (unless we want to exclude own pieces; we'll just count attacks)

    // Knight attacks
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightMoves) {
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = board[r][c];
        if (p && p.type === 'n' && p.color === color) total++;
      }
    }

    // King attacks (if you want to include king proximity)
    const kingMoves = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];
    for (const [dr, dc] of kingMoves) {
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) total++;
      }
    }

    // Pawn attacks (the color attacks opposite direction)
    if (color === 'w') {
      // White pawn attacks upward: target square from (r+1, c±1)
      const pawnRow = row + 1;
      if (pawnRow <= 7) {
        for (const dc of [-1, 1]) {
          const c2 = col + dc;
          if (c2 >= 0 && c2 < 8) {
            const p = board[pawnRow][c2];
            if (p && p.type === 'p' && p.color === 'w') total++;
          }
        }
      }
    } else {
      const pawnRow = row - 1;
      if (pawnRow >= 0) {
        for (const dc of [-1, 1]) {
          const c2 = col + dc;
          if (c2 >= 0 && c2 < 8) {
            const p = board[pawnRow][c2];
            if (p && p.type === 'p' && p.color === 'b') total++;
          }
        }
      }
    }

    // Rook/queen – horizontal/vertical rays
    const slidingDirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1], // rook
      [-1, -1], [-1, 1], [1, -1], [1, 1], // bishop
    ];
    const rookLike = [0, 1, 2, 3]; // indices for horizontal/vertical
    const bishopLike = [4, 5, 6, 7];
    for (let di = 0; di < slidingDirs.length; di++) {
      const [dr, dc] = slidingDirs[di];
      for (let step = 1; ; step++) {
        const r = row + dr * step, c = col + dc * step;
        if (r < 0 || r > 7 || c < 0 || c > 7) break;
        const p = board[r][c];
        if (p) {
          // If it's our piece and can move like that direction
          if (p.color === color) {
            if (p.type === 'q') total++;
            else if (di < 4 && p.type === 'r') total++;
            else if (di >= 4 && p.type === 'b') total++;
          }
          break; // piece blocks further ray
        }
      }
    }
  }
  return total;
}

export function getCentralControl(
  chess: Chess
): { white: number; black: number } {
  return {
    white: centralAttacks(chess, 'w'),
    black: centralAttacks(chess, 'b'),
  };
}

// ---------------------------------------------------------------------------
// 9. King safety (basic heuristic)
// ---------------------------------------------------------------------------
function kingSafetyScore(chess: Chess, color: 'w' | 'b'): number {
  const board = chess.board();
  // Find king position
  let kingRow = -1, kingCol = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        kingRow = r;
        kingCol = c;
        break;
      }
    }
  }
  if (kingRow < 0) return 0; // shouldn't happen

  let score = 0;
  // Pawn shield: count own pawns on the three files in front of the king
  const shieldCols = [kingCol - 1, kingCol, kingCol + 1].filter(c => c >= 0 && c < 8);
  // For white: pawn shield rows are smaller row indices (forward)
  const forwardDirection = color === 'w' ? -1 : 1;
  // Consider up to 3 ranks forward
  for (const c of shieldCols) {
    for (let step = 1; step <= 3; step++) {
      const r = kingRow + forwardDirection * step;
      if (r < 0 || r > 7) break;
      const p = board[r][c];
      if (p && p.type === 'p' && p.color === color) score += 2; // pawn shield
    }
  }

  // Open files near king: penalty for each open or semi-open file on king file or adjacent
  const openFiles = getOpenFiles(chess);
  const semiOpen = getSemiOpenFiles(chess);
  const enemySemiOpen = color === 'w' ? semiOpen.black : semiOpen.white;
  for (const c of shieldCols) {
    const file = FILES[c];
    if (openFiles.includes(file)) score -= 3;
    else if (enemySemiOpen.includes(file)) score -= 2;
  }

  return Math.max(score, -20); // clamp negative side but keep meaningful
}

export function getKingSafety(
  chess: Chess
): { white: number; black: number } {
  return {
    white: kingSafetyScore(chess, 'w'),
    black: kingSafetyScore(chess, 'b'),
  };
}

// ---------------------------------------------------------------------------
// 10. Piece activity (development, rooks connected)
// ---------------------------------------------------------------------------
export function getPieceActivity(
  chess: Chess
): {
  white: { undevelopedCount: number; rooksConnected: boolean };
  black: { undevelopedCount: number; rooksConnected: boolean };
} {
  const board = chess.board();
  const startingSquares: Record<'w' | 'b', string[]> = {
    w: ['b1', 'c1', 'f1', 'g1'], // knights and bishops
    b: ['b8', 'c8', 'f8', 'g8'],
  };

  function countUndeveloped(color: 'w' | 'b'): number {
    const starting = startingSquares[color];
    let count = 0;
    for (const sq of starting) {
      const [row, col] = squareToCoords(sq);
      const piece = board[row][col];
      // A minor piece still on its starting square is considered undeveloped
      if (
        piece &&
        (piece.type === 'n' || piece.type === 'b') &&
        piece.color === color
      ) {
        count++;
      }
    }
    return count;
  }

  function areRooksConnected(color: 'w' | 'b'): boolean {
    // Rooks are connected if there are no minor pieces (or queen) between them on the back rank
    // and the king is not in between? Simplistic: check if there are no pieces of either colour
    // between the two rooks on the back rank.
    const backRank = color === 'w' ? 7 : 0; // row index
    // Find rook columns
    const rookCols: number[] = [];
    for (let col = 0; col < 8; col++) {
      const p = board[backRank][col];
      if (p && p.type === 'r' && p.color === color) {
        rookCols.push(col);
      }
    }
    if (rookCols.length < 2) return false;
    const minCol = Math.min(...rookCols);
    const maxCol = Math.max(...rookCols);
    // Check squares between them on the back rank (exclusive)
    for (let c = minCol + 1; c < maxCol; c++) {
      if (board[backRank][c] !== null) return false;
    }
    // Also require that the king is not on the back rank between them?
    // We'll keep it simple.
    return true;
  }

  return {
    white: {
      undevelopedCount: countUndeveloped('w'),
      rooksConnected: areRooksConnected('w'),
    },
    black: {
      undevelopedCount: countUndeveloped('b'),
      rooksConnected: areRooksConnected('b'),
    },
  };
}

// ---------------------------------------------------------------------------
// Master function: gather all themes into one object
// ---------------------------------------------------------------------------
export function getAllPositionalThemes(chess: Chess): PositionalThemes {
  return {
    openFiles: getOpenFiles(chess),
    semiOpenFiles: getSemiOpenFiles(chess),
    passedPawns: getPassedPawns(chess),
    outposts: getOutposts(chess),
    isolatedPawns: getIsolatedPawns(chess),
    doubledPawns: getDoubledPawns(chess),
    backwardPawns: getBackwardPawns(chess),
    bishopPair: {
      white: hasBishopPair(chess, 'w'),
      black: hasBishopPair(chess, 'b'),
    },
    centralControl: getCentralControl(chess),
    kingSafety: getKingSafety(chess),
    pieceActivity: getPieceActivity(chess),
  };
}