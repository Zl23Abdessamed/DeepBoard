'use client';

/**
 * crafty-client.ts
 *
 * Browser-side counterpart to app/utils/server-actions.ts, but for the
 * Crafty WASM engine instead of the server-pooled Stockfish. Crafty's
 * compiled output (crafty.js / crafty.wasm) lives in /public, so it can
 * only execute in the browser — there's no server action here, just a
 * thin wrapper around a dedicated Web Worker (see crafty.worker.ts).
 *
 * The exported functions intentionally mirror analyzePgn() and
 * getEngineMove() from server-actions.ts so existing UI code can switch
 * engines by swapping the import.
 */

import { Chess } from 'chess.js';

export interface CraftyAnalysisResult {
  moveNumber: number;
  fen: string;
  san: string | null;
  bestmove: string;
  score: number | null;
  depth: number;
  pv: string[];
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class CraftyClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  private ensureWorker(): Worker {
    if (typeof window === 'undefined') {
      throw new Error('Crafty engine can only run in the browser');
    }
    if (!this.worker) {
      // Root-relative URL to a plain JS file in /public — NOT a bundler
      // module path (`new URL('./x.ts', import.meta.url)`). Crafty's
      // worker needs importScripts('/crafty.js') against a public-folder
      // script, which doesn't play well with Next's worker-loader, so we
      // skip bundling it entirely and load it as a static asset instead.
      this.worker = new Worker('/crafty-worker.js');
      this.worker.onmessage = (event: MessageEvent<any>) => {
        const msg = event.data;
        if (msg.id === undefined) {
          // Module-load lifecycle messages ('ready' / startup error) have
          // no request id attached — nothing pending to resolve.
          return;
        }
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        this.pending.delete(msg.id);
        if (msg.type === 'result') {
          pending.resolve(msg.payload);
        } else {
          pending.reject(new Error(msg.message || 'Crafty engine error'));
        }
      };
      this.worker.onerror = (err) => {
        // Surface fatal worker errors (e.g. wasm failed to fetch) to every
        // request still waiting on a response.
        for (const [id, pending] of this.pending) {
          pending.reject(new Error(err.message || 'Crafty worker crashed'));
          this.pending.delete(id);
        }
      };
    }
    return this.worker;
  }

  private send<T>(message: Record<string, any>): Promise<T> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ ...message, id });
    });
  }

  async analyzePosition(fen: string, depth: number) {
    return this.send<{
      bestmove: string;
      score: number | null;
      mate: boolean;
      stalemate: boolean;
      depth: number;
      pv: string[];
    }>({ type: 'analyze', fen, depth });
  }

  async bestMove(fen: string, depth: number, skillLevel: number) {
    return this.send<{ bestmove: string; score: number | null }>({
      type: 'bestmove',
      fen,
      depth,
      skillLevel,
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}

// Singleton: one Crafty instance per tab, matching how the Stockfish pool
// is shared server-side rather than spun up per request.
let client: CraftyClient | null = null;
function getClient(): CraftyClient {
  if (!client) client = new CraftyClient();
  return client;
}

/**
 * FEATURE 1: PGN GAME REVIEW / ANALYSIS (Crafty)
 * Mirrors analyzePgn() from server-actions.ts. Walks every position in the
 * game and asks Crafty for a best move + score at each one.
 *
 * onProgress is optional and lets the caller show incremental results,
 * since this runs in-browser and can take a while at higher depths.
 */
export async function analyzePgnCrafty(
  pgn: string,
  depth: number = 12,
  onProgress?: (result: CraftyAnalysisResult, index: number, total: number) => void
): Promise<CraftyAnalysisResult[]> {
  if (!pgn.trim()) throw new Error('PGN is required');

  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    throw new Error('Invalid PGN format');
  }

  const moves = chess.history({ verbose: true });
  const positions: { fen: string; moveNumber: number; san?: string }[] = [];
  const temp = new Chess();
  positions.push({ fen: temp.fen(), moveNumber: 0 });

  moves.forEach((move, idx) => {
    temp.move(move.san);
    positions.push({ fen: temp.fen(), moveNumber: idx + 1, san: move.san });
  });

  const engine = getClient();
  const results: CraftyAnalysisResult[] = [];

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const analysis = await engine.analyzePosition(pos.fen, depth);
    const result: CraftyAnalysisResult = {
      moveNumber: pos.moveNumber,
      fen: pos.fen,
      san: pos.san || null,
      bestmove: analysis.bestmove,
      score: analysis.score,
      depth: analysis.depth,
      pv: analysis.pv,
    };
    results.push(result);
    onProgress?.(result, i, positions.length);
  }

  return results;
}

/**
 * FEATURE 2: PLAY VS ENGINE (Crafty)
 * Mirrors getEngineMove() from server-actions.ts. Crafty has no native
 * "Skill Level" option, so skillLevel is approximated by scaling search
 * depth (see crafty.worker.ts runBestMove for the exact mapping).
 */
export async function getEngineMoveCrafty(
  fen: string,
  depth: number = 10,
  skillLevel: number = 20
): Promise<{ bestmove: string; score: number | null }> {
  if (!fen.trim()) throw new Error('FEN position string is required');
  const clampedSkill = Math.max(0, Math.min(20, skillLevel));
  const engine = getClient();
  return engine.bestMove(fen, depth, clampedSkill);
}

/** Releases the worker. Call on unmount of the last consumer if desired. */
export function terminateCraftyEngine() {
  client?.terminate();
  client = null;
}
