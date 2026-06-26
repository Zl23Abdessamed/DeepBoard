// app/actions/chess.ts
'use server';

import { Chess } from 'chess.js';
import { StockfishPool } from '@se-oss/stockfish';

// Global pool (shared across incoming requests to avoid slow cold-starts)
let pool: StockfishPool | null = null;

async function getPool() {
  if (!pool) {
    pool = new StockfishPool(2); // Adjust concurrency based on server CPU cores
    await pool.initialize();
  }
  return pool;
}

/**
 * FEATURE 1: PGN GAME REVIEW / ANALYSIS
 * Walks through an entire game history to provide engine evaluations and best moves for every position.
 */
export async function analyzePgn(
  pgn: string,
  depth: number = 16
): Promise<
  {
    moveNumber: number;
    fen: string;
    san: string | null;
    bestmove: string;
    score: number | null;
    depth: number;
    pv: string[];
  }[]
> {
  if (!pgn.trim()) throw new Error('PGN is required');

  const chess = new Chess();
  
  try {
    chess.loadPgn(pgn);
  } catch (error) {
    throw new Error('Invalid PGN format');
  }

  const moves = chess.history({ verbose: true });
  const positions: { fen: string; moveNumber: number; san?: string }[] = [];
  const temp = new Chess();
  positions.push({ fen: temp.fen(), moveNumber: 0 }); // Starting array position

  moves.forEach((move, idx) => {
    temp.move(move.san);
    positions.push({
      fen: temp.fen(),
      moveNumber: idx + 1,
      san: move.san,
    });
  });

  const poolInstance = await getPool();
  const engine = await poolInstance.acquire();

  try {
    // Reset to default max strength before running analysis batches
    await engine.send('setoption name Skill Level value 20');

    const results = [];
    for (const pos of positions) {
      const analysis = await engine.analyze(pos.fen, depth);
      
      const pvString = analysis.lines[0]?.pv;
      const pvArray = pvString ? pvString.trim().split(/\s+/) : [];

      results.push({
        moveNumber: pos.moveNumber,
        fen: pos.fen,
        san: pos.san || null,
        bestmove: analysis.bestmove,
        score: analysis.lines[0]?.score?.value ?? null,
        depth: analysis.lines[0]?.depth ?? depth,
        pv: pvArray,
      });
    }
    return results;
  } finally {
    poolInstance.release(engine);
  }
}

/**
 * FEATURE 2: PLAY VS ENGINE (Single Move Generator)
 * Accepts the current board position and calculates a single best response.
 * Includes adjustable 'skillLevel' (0 = easiest/blunder prone, 20 = grandmaster strength).
 */
export async function getEngineMove(
  fen: string,
  depth: number = 10,
  skillLevel: number = 20
): Promise<{
  bestmove: string;
  score: number | null;
}> {
  if (!fen.trim()) throw new Error('FEN position string is required');

  // Clamp the skill level between 0 and 20 to protect against invalid UCI inputs
  const clampedSkill = Math.max(0, Math.min(20, skillLevel));

  const poolInstance = await getPool();
  const engine = await poolInstance.acquire();

  try {
    // Configure engine difficulty dynamically via low-level UCI protocols
    await engine.send(`setoption name Skill Level value ${clampedSkill}`);
    
    // Calculate the move
    const analysis = await engine.analyze(fen, depth);
    
    return {
      bestmove: analysis.bestmove,
      score: analysis.lines[0]?.score?.value ?? null,
    };
  } finally {
    // Release the engine instance back into the pool so other active players can use it
    poolInstance.release(engine);
  }
}