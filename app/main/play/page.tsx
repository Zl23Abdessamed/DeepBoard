"use client"

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChessKnight,
  FaChessQueen,
  FaChessRook,
  FaChessBishop,
} from 'react-icons/fa';
import { FiChevronDown, FiZap } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import { getEngineMove } from '@/app/utils/server-actions';
import { getEngineMoveCrafty, terminateCraftyEngine } from '@/app/utils/crafty-client';
import { RootState } from '@/app/redux/store';
import { useSelector } from 'react-redux';
import { generateLocalPieces } from '@/app/lib/board-ui';
import { EngineChoice } from '@/app/types/types';

const LazyChessboard = dynamic(
  () => import('react-chessboard').then((mod) => ({ default: mod.Chessboard })),
  { ssr: false }
);

// ------------------------------------------------------
// Types
// ------------------------------------------------------
interface MoveHistoryItem {
  moveNumber: number;
  white?: string;
  black?: string;
}

interface EngineResponse {
  bestmove: string;
  score: number | null;
}

interface AnalysisLine {
  moveNumber: number;
  fen: string;
  san: string | null;
  bestmove: string;
  score: number | null;
  depth: number;
  pv: string[];
}

// ------------------------------------------------------
// Engine options (mirrors UploadPGNModal)
// ------------------------------------------------------
const ENGINE_OPTIONS: {
  value: EngineChoice;
  label: string;
  helper: string;
  defaultDepth: number;
  maxDepth: number;
}[] = [
  {
    value: 'stockfish',
    label: 'Stockfish (server)',
    helper: 'Runs server-side. Skill level 1–20 tunes its strength.',
    defaultDepth: 15,
    maxDepth: 30,
  },
  {
    value: 'crafty',
    label: 'Crafty (in-browser WASM)',
    helper: 'Runs locally in your browser. Skill level is approximated via search depth.',
    defaultDepth: 10,
    maxDepth: 20,
  },
];

// ------------------------------------------------------
// Promotion dialog
// ------------------------------------------------------
const PromotionDialog: React.FC<{
  onPromote: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}> = ({ onPromote, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      onClick={(e) => e.stopPropagation()}
      className="p-6 rounded-xl bg-linear-to-br from-[#FF4D00]/20 to-[#FF0000]/20 border border-[#FF4D00]/40 backdrop-blur-sm"
    >
      <h3 className="text-xl font-bold text-orange-100 mb-4 text-center">Choose Promotion</h3>
      <div className="grid grid-cols-4 gap-4">
        {[
          { piece: 'q', icon: FaChessQueen, name: 'Queen' },
          { piece: 'r', icon: FaChessRook, name: 'Rook' },
          { piece: 'b', icon: FaChessBishop, name: 'Bishop' },
          { piece: 'n', icon: FaChessKnight, name: 'Knight' },
        ].map(({ piece, icon: Icon, name }) => (
          <motion.button
            key={piece}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onPromote(piece as 'q' | 'r' | 'b' | 'n')}
            className="p-6 rounded-xl bg-[#FF4D00]/20 hover:bg-[#FF4D00]/30 border border-[#FF4D00]/40 transition-colors"
          >
            <Icon className="text-4xl text-orange-100 mx-auto mb-2" />
            <div className="text-sm text-orange-200/70">{name}</div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// ------------------------------------------------------
// Time parsing utility
// ------------------------------------------------------
function parseTimeControl(tc: string) {
  const [minutesStr, secondsStr] = tc.split('+');
  const minutes = parseInt(minutesStr) || 0;
  const increment = parseInt(secondsStr) || 0;
  return { minutes, increment };
}

// ------------------------------------------------------
// Main component
// ------------------------------------------------------
const TIME_CONTROLS = ['1+0', '3+0', '5+0', '10+0', '15+10', '30+0', '30+20'];

export default function PlayVsEngine() {
  const reduxBoard = useSelector((state: RootState) => state.boardSettings);
  // ---- Setup state ----
  const [setupComplete, setSetupComplete] = useState(false);
  const [timeControl, setTimeControl] = useState(TIME_CONTROLS[2]); // default 5+0
  const [side, setSide] = useState<'white' | 'black' | 'random'>('random');
  const [engine, setEngine] = useState<EngineChoice>('stockfish');
  const [depth, setDepth] = useState(ENGINE_OPTIONS[0].defaultDepth);
  const [skillLevel, setSkillLevel] = useState(20); // 1-20
  const [craftyReady, setCraftyReady] = useState(false);

  const activeEngineOption = ENGINE_OPTIONS.find((e) => e.value === engine)!;

  const handleEngineChange = (value: EngineChoice) => {
    setEngine(value);
    const opt = ENGINE_OPTIONS.find((e) => e.value === value)!;
    setDepth(opt.defaultDepth);
  };

  // Crafty's WASM module loads lazily inside the worker the first time it's
  // used. Mark it "ready" optimistically after mount so the status badge
  // (shown only once Crafty is selected) isn't stuck loading.
  useEffect(() => {
    const t = setTimeout(() => setCraftyReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Release the Crafty worker on unmount so we don't leak a WASM instance
  // per navigation (harmless no-op if Crafty was never used).
  useEffect(() => {
    return () => {
      terminateCraftyEngine();
    };
  }, []);

  // ---- Game state ----
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [engineThinking, setEngineThinking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [evalScore, setEvalScore] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  // ---- Clocks ----
  const [whiteTime, setWhiteTime] = useState(0); // in seconds
  const [blackTime, setBlackTime] = useState(0);
  const clockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Board interaction ----
  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
  const [pendingMove, setPendingMove] = useState<{ from: Square; to: Square } | null>(null);
  const [showPromotion, setShowPromotion] = useState(false);

  // ---- Analysis after game ----
  const [analysisLines, setAnalysisLines] = useState<AnalysisLine[] | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // ---- Derived state ----
  const isPlayerTurn = game.turn() === playerColor[0] && !gameOver;

  // Move history derived from game (no side‑effect)
  const moveHistory: MoveHistoryItem[] = useMemo(() => {
    const history = game.history({ verbose: true });
    const pairs: MoveHistoryItem[] = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: history[i]?.san,
        black: history[i + 1]?.san,
      });
    }
    return pairs;
  }, [game]);

  // ---- Clock management ----
  const startClocks = (initialMinutes: number, increment: number) => {
    const initialSeconds = initialMinutes * 60;
    setWhiteTime(initialSeconds);
    setBlackTime(initialSeconds);
  };

  // Tick clocks every second when game is running
  useEffect(() => {
    if (!setupComplete || gameOver) {
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
      return;
    }

    const { increment } = parseTimeControl(timeControl);

    clockTimerRef.current = setInterval(() => {
      const turn = game.turn();
      if (turn === 'w') {
        setWhiteTime((prev) => Math.max(0, prev - 1));
      } else {
        setBlackTime((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => {
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    };
  }, [setupComplete, gameOver, game, timeControl]);

  // Apply increment after a move
  useEffect(() => {
    const { increment } = parseTimeControl(timeControl);
    if (increment <= 0) return;
    // We need to know which side moved last. game.turn() is now the other side.
    const lastTurn = game.turn() === 'w' ? 'b' : 'w';
    if (lastTurn === 'w') {
      setWhiteTime((prev) => prev + increment);
    } else {
      setBlackTime((prev) => prev + increment);
    }
  }, [game.history().length]); // only when moves change

  // ---- Setup handlers ----
  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let chosenColor: 'white' | 'black' = 'white';
    if (side === 'random') {
      chosenColor = Math.random() < 0.5 ? 'white' : 'black';
    } else {
      chosenColor = side;
    }
    setPlayerColor(chosenColor);
    setSetupComplete(true);
    setGame(new Chess());
    setEngineError(null);

    const { minutes } = parseTimeControl(timeControl);
    startClocks(minutes, 0); // increment handled separately

    if (chosenColor === 'black') {
      setTimeout(() => makeEngineMove(new Chess()), 300);
    }
  };

  // ---- Engine move (dispatches to Stockfish or Crafty) ----
  const makeEngineMove = useCallback(
    async (currentGame: Chess) => {
      if (currentGame.isGameOver()) {
        checkGameOver(currentGame);
        return;
      }
      setEngineThinking(true);
      setEngineError(null);
      try {
        const response: EngineResponse =
          engine === 'crafty'
            ? await getEngineMoveCrafty(currentGame.fen(), depth, skillLevel)
            : await getEngineMove(currentGame.fen(), depth, skillLevel);

        const raw = (response.bestmove || '').trim();
        const newGame = new Chess(currentGame.fen());

        // Stockfish returns plain long-algebraic UCI ("e2e4", "e7e8q"), so a
        // fixed slice works. Crafty's worker does not reliably return that
        // exact shape (its raw output is closer to piece-letter coordinate
        // notation than pure UCI), so instead of slicing blindly we extract
        // every square-like token (e.g. "e2", "e4") from the string and
        // match the first legal move whose from/to pair appears in order.
        // This tolerates piece-letter prefixes, dashes, captures ('x'),
        // check/mate suffixes, or promotion suffixes.
        const squareTokens = raw.toLowerCase().match(/[a-h][1-8]/g) || [];
        const promoMatch = raw.toLowerCase().match(/[qrbn](?:\s|$|[+#!?])/);
        const promotion = promoMatch ? promoMatch[0][0] : undefined;

        let move = null;
        if (squareTokens.length >= 2) {
          const [from, to] = squareTokens as [Square, Square];
          const legalMoves = newGame.moves({ square: from, verbose: true });
          const candidate = legalMoves.find((m) => m.to === to);
          if (candidate) {
            move = newGame.move({
              from,
              to,
              promotion: candidate.promotion ? promotion || 'q' : undefined,
            });
          }
        }

        // Fallback: try chess.js's SAN parser directly in case the engine
        // returned SAN (e.g. "Nc6") rather than coordinate notation.
        if (!move) {
          try {
            move = newGame.move(raw);
          } catch {
            move = null;
          }
        }

        if (!move) {
          console.error('Engine returned unparseable/invalid move:', raw);
          setEngineError(`${engine === 'crafty' ? 'Crafty' : 'Stockfish'} returned an invalid move ("${raw}").`);
          setEngineThinking(false);
          return;
        }

        setGame(newGame);
        setEvalScore(response.score);

        checkGameOver(newGame);
      } catch (err: any) {
        console.error('Engine error:', err);
        setEngineError(err?.message || 'Engine failed to respond.');
      } finally {
        setEngineThinking(false);
      }
    },
    [depth, skillLevel, engine]
  );

  // ---- User move ----
  const makeMove = (from: Square, to: Square, promotion?: string) => {
    const newGame = new Chess(game.fen());
    const move = newGame.move({ from, to, promotion });
    if (!move) return false;
    setGame(newGame);
    setMoveFrom(null);
    setOptionSquares({});

    checkGameOver(newGame);

    if (!newGame.isGameOver()) {
      setTimeout(() => makeEngineMove(newGame), 100);
    }
    return true;
  };

  // ---- Game over check ----
  const checkGameOver = (currentGame: Chess) => {
    if (currentGame.isGameOver()) {
      setGameOver(true);
      if (currentGame.isCheckmate()) {
        const winner = currentGame.turn() === 'w' ? 'Black' : 'White';
        setStatus(`Checkmate! ${winner} wins!`);
      } else if (currentGame.isDraw()) {
        setStatus('Game drawn!');
      } else if (currentGame.isStalemate()) {
        setStatus('Stalemate!');
      } else {
        setStatus('Game over');
      }
    }
  };

  // ---- Square click ----
  const onSquareClick = useCallback(
    ({ square }: { square: string }) => {
      if (!isPlayerTurn || engineThinking) return;
      const typedSquare = square as Square;
      if (!moveFrom) {
        const tempGame = new Chess(game.fen());
        const moves = tempGame.moves({ square: typedSquare, verbose: true });
        if (moves.length === 0) return;
        const newSquares: Record<string, any> = {};
        moves.forEach((move) => {
          newSquares[move.to] = {
            background:
              tempGame.get(move.to as Square) &&
              tempGame.get(move.to as Square)?.color !== tempGame.get(typedSquare)?.color
                ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
            borderRadius: '50%',
          };
        });
        newSquares[typedSquare] = { background: 'rgba(255, 255, 0, 0.4)' };
        setOptionSquares(newSquares);
        setMoveFrom(typedSquare);
        return;
      }
      // Second click
      const tempGame = new Chess(game.fen());
      const moves = tempGame.moves({ square: moveFrom, verbose: true });
      const foundMove = moves.find((m) => m.from === moveFrom && m.to === typedSquare);
      setMoveFrom(null);
      setOptionSquares({});
      if (!foundMove) {
        // Switch to new piece if valid
        const newMoves = tempGame.moves({ square: typedSquare, verbose: true });
        if (newMoves.length > 0) {
          const newSquares: Record<string, any> = {};
          newMoves.forEach((move) => {
            newSquares[move.to] = {
              background:
                tempGame.get(move.to as Square) &&
                tempGame.get(move.to as Square)?.color !== tempGame.get(typedSquare)?.color
                  ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                  : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
              borderRadius: '50%',
            };
          });
          newSquares[typedSquare] = { background: 'rgba(255, 255, 0, 0.4)' };
          setOptionSquares(newSquares);
          setMoveFrom(typedSquare);
        }
        return;
      }
      if (
        foundMove.promotion ||
        (foundMove.piece === 'p' &&
          ((foundMove.color === 'w' && typedSquare[1] === '8') ||
            (foundMove.color === 'b' && typedSquare[1] === '1')))
      ) {
        setPendingMove({ from: moveFrom, to: typedSquare });
        setShowPromotion(true);
        return;
      }
      makeMove(moveFrom, typedSquare);
    },
    [game, isPlayerTurn, engineThinking, moveFrom]
  );

  // Drag & drop
  const onDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
      if (!isPlayerTurn || engineThinking || !targetSquare) return false;
      const source = sourceSquare as Square;
      const target = targetSquare as Square;
      const tempGame = new Chess(game.fen());
      const moves = tempGame.moves({ square: source, verbose: true });
      const foundMove = moves.find((m) => m.from === source && m.to === target);
      if (!foundMove) return false;
      if (
        foundMove.promotion ||
        (foundMove.piece === 'p' &&
          ((foundMove.color === 'w' && target[1] === '8') ||
            (foundMove.color === 'b' && target[1] === '1')))
      ) {
        setPendingMove({ from: source, to: target });
        setShowPromotion(true);
        return false;
      }
      makeMove(source, target);
      return true;
    },
    [game, isPlayerTurn, engineThinking]
  );

  // Promotion callback
  const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingMove) {
      makeMove(pendingMove.from, pendingMove.to, piece);
      setPendingMove(null);
      setShowPromotion(false);
    }
  };

  // Post‑game analysis – placeholder
  const handleAnalyze = async () => {
    setAnalysisLoading(true);
    try {
      // TODO: call your actual analysis server action, e.g. analyzePgn(game.pgn())
      // For now we simulate a response with an empty array
      const dummy: AnalysisLine[] = [];
      // After receiving real data, setAnalysisLines(data)
      setAnalysisLines(dummy);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Rematch / change settings — also tears down any in-flight Crafty work
  const handleNewGame = () => {
    terminateCraftyEngine();
    setSetupComplete(false);
    setGame(new Chess());
    setGameOver(false);
    setStatus(null);
    setEvalScore(null);
    setEngineError(null);
    setAnalysisLines(null);
    setMoveFrom(null);
    setOptionSquares({});
  };

  // Format time (seconds → mm:ss)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Score formatting
  const formatScore = (score: number | null) => {
    if (score === null) return '?';
    if (Math.abs(score) > 10000) {
      const movesToMate = Math.abs(score) - 10000;
      return score > 0 ? `M${movesToMate}` : `-M${movesToMate}`;
    }
    return (score / 100).toFixed(1);
  };

  // Eval bar percentage
  const evalPercent = useMemo(() => {
    if (evalScore === null) return 50;
    const score = evalScore;
    if (Math.abs(score) > 10000) return score > 0 ? 95 : 5;
    const advantage = score / 100;
    const raw = 50 + advantage * 3.5;
    return Math.max(5, Math.min(95, raw));
  }, [evalScore]);

  // Board options
  // Board options (Redux + generateLocalPieces)
  const boardOptions = useMemo(() => ({
    id: 'PlayVsEngineBoard',
    boardOrientation: playerColor,
    position: game.fen(),
    onPieceDrop: onDrop,
    onSquareClick: onSquareClick,
    animationDurationInMs: 300,
    showAnimations: true,
    darkSquareStyle: { backgroundColor: reduxBoard.darkSquareColor },
    lightSquareStyle: { backgroundColor: reduxBoard.lightSquareColor },
    pieces: generateLocalPieces(reduxBoard.pieceStyle),
    squareStyles: { ...optionSquares },
  }), [playerColor, game, onDrop, onSquareClick, reduxBoard, optionSquares]);

  const engineLabel = engine === 'crafty' ? 'Crafty' : 'Stockfish';

  // ---- Render ----
  return (
    <div className="bg-black text-white min-h-screen p-6 overflow-hidden relative">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Engine status badge — shown once a game vs Crafty has started */}
      {setupComplete && engine === 'crafty' && (
        <div className="fixed top-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-[#FF4D00]/30 backdrop-blur-sm">
          <FiZap className={`text-sm ${craftyReady ? 'text-[#FF4D00]' : 'text-orange-400 animate-pulse'}`} />
          <span className="text-xs text-orange-100 font-medium">
            Crafty {craftyReady ? 'ready' : 'loading...'}
          </span>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
          Play vs {engineLabel}
        </h1>

        {!setupComplete ? (
          /* --------------- Setup form --------------- */
          <motion.form
            onSubmit={handleSetupSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto p-6 rounded-2xl backdrop-blur-sm bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 space-y-5"
          >
            <h2 className="text-xl font-bold text-orange-100">Game Settings</h2>

            {/* Engine Selector */}
            <div className="space-y-1.5">
              <label htmlFor="engine-select" className="block text-sm text-orange-200/80">
                Engine
              </label>
              <div className="relative">
                <select
                  id="engine-select"
                  value={engine}
                  onChange={(e) => handleEngineChange(e.target.value as EngineChoice)}
                  className="w-full appearance-none px-4 py-3 pr-10 bg-black/40 border border-[#FF4D00]/30 rounded-xl text-orange-100 text-sm font-medium focus:border-[#FF4D00]/60 focus:outline-none transition-colors cursor-pointer"
                >
                  {ENGINE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-black text-orange-100">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#FF4D00] text-lg" />
              </div>
              <p className="text-xs text-orange-200/40">{activeEngineOption.helper}</p>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">Time Control</label>
              <select
                value={timeControl}
                onChange={(e) => setTimeControl(e.target.value)}
                className="w-full bg-black/40 border border-[#FF4D00]/30 rounded-lg py-2 px-3 text-orange-100 text-sm"
              >
                {TIME_CONTROLS.map((tc) => (
                  <option key={tc} value={tc}>
                    {tc}
                  </option>
                ))}
              </select>
            </div>

            {/* Side */}
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">Play as</label>
              <div className="flex gap-3">
                {(['white', 'black', 'random'] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-1 cursor-pointer text-orange-100 text-sm">
                    <input
                      type="radio"
                      name="side"
                      value={opt}
                      checked={side === opt}
                      onChange={() => setSide(opt)}
                      className="accent-[#FF4D00]"
                    />
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Depth */}
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">
                Depth (max {activeEngineOption.maxDepth})
              </label>
              <input
                type="number"
                min={1}
                max={activeEngineOption.maxDepth}
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                className="w-full bg-black/40 border border-[#FF4D00]/30 rounded-lg py-2 px-3 text-orange-100 text-sm"
              />
              {engine === 'crafty' && (
                <p className="text-xs text-orange-200/40 mt-1">
                  Higher depths run noticeably slower in-browser — 8–12 keeps moves snappy.
                </p>
              )}
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">
                Skill Level: {skillLevel}
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={skillLevel}
                onChange={(e) => setSkillLevel(Number(e.target.value))}
                className="w-full accent-[#FF4D00]"
              />
              <div className="flex justify-between text-xs text-orange-300/60">
                <span>Beginner</span>
                <span>Grandmaster</span>
              </div>
              {engine === 'crafty' && (
                <p className="text-xs text-orange-200/40 mt-1">
                  Crafty has no native skill setting — this scales search depth to approximate it.
                </p>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-3 rounded-xl bg-linear-to-r from-[#FF4D00] to-[#FF0000] text-white font-bold shadow-lg"
            >
              Start Game
            </motion.button>
          </motion.form>
        ) : (
          /* --------------- Game board + panels --------------- */
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
            {/* Board + Clock + Eval */}
            <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
              {/* Clocks */}
              <div className="flex justify-between w-full max-w-[90vw] md:max-w-[500px] text-sm font-mono">
                <div className="flex items-center gap-2 text-orange-200">
                  <span className="text-xs uppercase">White</span>
                  <span className={game.turn() === 'w' && !gameOver ? 'text-white font-bold' : ''}>
                    {formatTime(whiteTime)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-orange-200">
                  <span className="text-xs uppercase">Black</span>
                  <span className={game.turn() === 'b' && !gameOver ? 'text-white font-bold' : ''}>
                    {formatTime(blackTime)}
                  </span>
                </div>
              </div>

              <div className="flex items-stretch gap-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl overflow-hidden shadow-2xl border border-[#FF4D00]/30 bg-black/30 aspect-square w-[90vw] md:w-125"
                >
                  <LazyChessboard options={boardOptions} />
                </motion.div>

                {/* Eval Bar */}
                {/* <div className="w-8 bg-black/30 rounded-r-xl border border-[#FF4D00]/30 border-l-0 overflow-hidden flex flex-col relative">
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 to-white/70 opacity-30" />
                  <div
                    className="w-full bg-white transition-all duration-300 ease-out"
                    style={{ height: `${evalPercent}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-[0_0_4px_black]">
                    {formatScore(evalScore)}
                  </div>
                </div> */}
              </div>

              {/* Engine error */}
              {engineError && (
                <div className="text-[#FF0000] text-sm text-center font-medium bg-red-950/30 py-2 px-3 rounded-lg border border-red-500/20 w-full max-w-[90vw] md:max-w-[500px]">
                  {engineError}
                </div>
              )}

              {/* Game status / engine thinking */}
              {status && (
                <div className="p-3 rounded-xl bg-linear-to-br from-[#FF4D00]/20 to-[#FF0000]/20 border border-[#FF4D00]/30 text-center w-full max-w-[90vw] md:max-w-[500px]">
                  <span className="font-bold text-orange-100">{status}</span>
                  {gameOver && (
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <button
                        onClick={handleAnalyze}
                        disabled={analysisLoading}
                        className="px-4 py-1 rounded-lg bg-linear-to-r from-[#FF4D00] to-[#FF0000] text-white text-sm font-semibold disabled:opacity-50"
                      >
                        {analysisLoading ? 'Analyzing...' : 'Analyze Game'}
                      </button>
                      <button
                        onClick={handleNewGame}
                        className="px-4 py-1 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 text-sm font-semibold transition"
                      >
                        New Game
                      </button>
                    </div>
                  )}
                </div>
              )}
              {engineThinking && !gameOver && (
                <div className="flex items-center gap-2 text-orange-300/80 text-sm">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-[#FF4D00] border-t-transparent rounded-full"
                  />
                  {engineLabel} thinking...
                </div>
              )}
            </div>

            {/* Right panel: move history + analysis */}
            <div className="flex-1 flex flex-col gap-4 w-full max-w-xl">
              {/* Move History */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-xl backdrop-blur-sm bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30"
              >
                <h2 className="text-sm font-bold text-orange-100 mb-2">Move History</h2>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {moveHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-xs"
                    >
                      <div className="w-6 text-[#FF4D00] font-semibold">{item.moveNumber}.</div>
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        <div className="font-mono text-orange-100 px-1.5 py-0.5 rounded">
                          {item.white || ''}
                        </div>
                        <div className="font-mono text-orange-100 px-1.5 py-0.5 rounded">
                          {item.black || ''}
                        </div>
                      </div>
                    </div>
                  ))}
                  {moveHistory.length === 0 && (
                    <div className="text-center text-orange-200/60 py-6 text-xs">No moves yet</div>
                  )}
                </div>
              </motion.div>

              {/* Analysis panel */}
              {analysisLines && analysisLines.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl backdrop-blur-sm bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 flex-1"
                >
                  <h2 className="text-sm font-bold text-orange-100 mb-2">Engine Analysis</h2>
                  <div className="max-h-80 overflow-y-auto space-y-0.5">
                    {analysisLines.map((line) => {
                      const isWhite = line.fen.split(' ')[1] === 'w';
                      const scoreText = formatScore(line.score);
                      const scoreColor =
                        line.score && line.score > 0
                          ? 'text-green-400'
                          : line.score && line.score < 0
                          ? 'text-red-400'
                          : 'text-gray-400';
                      return (
                        <div
                          key={line.moveNumber + (line.san ?? 'start')}
                          className="flex items-center gap-2 p-1.5 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-xs"
                        >
                          <div className="w-10 text-[#FF4D00] font-semibold">
                            {line.moveNumber === 0
                              ? 'Start'
                              : `${line.moveNumber}.${isWhite ? 'w' : 'b'}`}
                          </div>
                          <div className="flex-1 flex items-center gap-1.5 min-w-0">
                            {line.san && (
                              <span className="font-mono text-orange-100">{line.san}</span>
                            )}
                            <span className="text-orange-200/60">→</span>
                            <span className="font-mono text-yellow-300">{line.bestmove}</span>
                            <div className={`ml-auto font-mono font-bold ${scoreColor}`}>
                              {scoreText}
                            </div>
                          </div>
                          <div className="hidden md:block text-[10px] text-orange-200/40 truncate max-w-30">
                            {line.pv.join(' ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Promotion dialog */}
      <AnimatePresence>
        {showPromotion && (
          <PromotionDialog
            onPromote={handlePromotion}
            onCancel={() => {
              setShowPromotion(false);
              setPendingMove(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}