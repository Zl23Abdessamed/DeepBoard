import { Chess } from 'chess.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type MoveClassification =
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder';

export interface StockfishAnalysis {
  /** Evaluation from white's perspective (e.g., 1.5 = +1.5 pawns, -3.0 = -3.0 pawns) */
  score: number;
  depth?: number;
  bestMove?: string;
  /** Ordered list of top moves with their scores */
  topMoves?: Array<{ move: string; score: number }>;
}

export interface ClassifyMoveInput {
  fen: string;
  move: string; // SAN format (e.g., "Nf5")
  analysisBefore: StockfishAnalysis;
  analysisAfter: StockfishAnalysis;
}

export interface MoveClassificationResult {
  classification: MoveClassification;
  reason: string;
}

// ---------------------------------------------------------------------------
// Core Data Science Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a raw engine evaluation into Expected Points (0.00 to 1.00)
 * Uses a fixed, normalized scaling factor (k = 0.55) independent of player rating.
 */
function calculateExpectedPoints(score: number): number {
  const clampedScore = Math.max(-15, Math.min(15, score));
  
  // Standardized scaling factor for normalized adult/club level winning chances
  const k = 0.55; 
  
  return 1 / (1 + Math.exp(-k * clampedScore));
}

function playerScore(score: number, color: 'w' | 'b'): number {
  return color === 'w' ? score : -score;
}

function getMovedColor(fen: string): 'w' | 'b' {
  const parts = fen.split(' ');
  if (parts.length < 2) throw new Error('Invalid FEN');
  return parts[1] as 'w' | 'b';
}

// ---------------------------------------------------------------------------
// Main Classification Logic
// ---------------------------------------------------------------------------
export function classifyMove(input: ClassifyMoveInput): MoveClassificationResult {
  const { fen, move, analysisBefore, analysisAfter } = input;
  const color = getMovedColor(fen);

  const chessBefore = new Chess(fen);
  let sanMove: string;
  try {
    const m = chessBefore.move(move);
    sanMove = m ? m.san : move;
  } catch {
    return { classification: 'blunder', reason: 'Illegal move played.' };
  }

  // Calculate Expected Points Before (assuming optimal move) and After
  const rawBestBefore = analysisBefore.topMoves && analysisBefore.topMoves.length > 0
    ? playerScore(analysisBefore.topMoves[0].score, color)
    : playerScore(analysisBefore.score, color);

  const rawScoreAfter = playerScore(analysisAfter.score, color);

  const xpBeforeBest = calculateExpectedPoints(rawBestBefore);
  const xpAfter = calculateExpectedPoints(rawScoreAfter);
  
  // Loss in Win Opportunity
  const xpLoss = xpBeforeBest - xpAfter;

  // -----------------------------------------------------------------------
  // Standard Expected Points Math-Cutoffs
  // -----------------------------------------------------------------------
  if (xpLoss <= 0.00) {
    return {
      classification: 'best',
      reason: `Best move! Matches top engine evaluations perfectly.`,
    };
  }
  if (xpLoss <= 0.02) {
    return {
      classification: 'excellent',
      reason: `Excellent move. Highly precise choice, conceding only ${(xpLoss * 100).toFixed(1)}% win equity.`,
    };
  }
  if (xpLoss <= 0.05) {
    return {
      classification: 'good',
      reason: `Good move. Keeps your structural goals intact while sacrificing minimal tactical edge.`,
    };
  }
  if (xpLoss <= 0.10) {
    return {
      classification: 'inaccuracy',
      reason: `Inaccuracy. A slightly suboptimal route. You gave away ${(xpLoss * 100).toFixed(0)}% points conversion capacity.`,
    };
  }
  if (xpLoss <= 0.20) {
    return {
      classification: 'mistake',
      reason: `Mistake. The alternative paths were demonstrably better. Your position degraded significantly.`,
    };
  }
  
  return {
    classification: 'blunder',
    reason: `Blunder! You severely damaged your structural stability. Your winning chance collapsed by ${(xpLoss * 100).toFixed(0)}%.`,
  };
}