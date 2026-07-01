"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { motion } from "framer-motion";
import { FiRefreshCw, FiEye, FiZap } from "react-icons/fi";
import { useSelector } from "react-redux";
import type { ChessboardOptions, PieceRenderObject } from "react-chessboard";
import dynamic from "next/dynamic";
import { RootState } from "@/app/redux/store";
import { PuzzleLocal } from "@/app/types/types";
import { getPuzzleStreak } from "@/app/utils/api";

const LazyChessboard = dynamic(
    () => import("react-chessboard").then((mod) => ({ default: mod.Chessboard })),
    { ssr: false }
);

// ---------- Helpers ----------
const generateLocalPieces = (style: string): PieceRenderObject => {
    const base = `/piece/${style}`;
    const pieces = {
        wP: `${base}/wP.svg`, wN: `${base}/wN.svg`, wB: `${base}/wB.svg`, wR: `${base}/wR.svg`,
        wQ: `${base}/wQ.svg`, wK: `${base}/wK.svg`,
        bP: `${base}/bP.svg`, bN: `${base}/bN.svg`, bB: `${base}/bB.svg`, bR: `${base}/bR.svg`,
        bQ: `${base}/bQ.svg`, bK: `${base}/bK.svg`,
    };
    return Object.fromEntries(
        Object.entries(pieces).map(([piece, src]) => [
            piece,
            ({ squareWidth }: { squareWidth: number }) => (
                <img
                    src={src}
                    alt={piece}
                    style={{ width: squareWidth, height: squareWidth, objectFit: "contain" }}
                    draggable={true}
                />
            ),
        ])
    ) as PieceRenderObject;
};

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

// ---------- Component ----------
const PuzzlesStreakTraining: React.FC = () => {
    const boardSettings = useSelector((state: RootState) => state.boardSettings);

    // Setup
    const [phase, setPhase] = useState<"setup" | "solving">("setup");
    const [startRating, setStartRating] = useState(1200);
    const [puzzleCount, setPuzzleCount] = useState(10);
    const [skipMode, setSkipMode] = useState<"manual" | "automatic">("automatic");

    // Solving state
    const [puzzles, setPuzzles] = useState<PuzzleLocal[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [puzzleFen, setPuzzleFen] = useState(new Chess().fen());
    const [puzzleMoveIndex, setPuzzleMoveIndex] = useState(0);
    const [userMoveCount, setUserMoveCount] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [playerOrientation, setPlayerOrientation] = useState<"white" | "black">("white");
    const [feedback, setFeedback] = useState("");
    const [puzzleCompleted, setPuzzleCompleted] = useState(false);
    const [showSolution, setShowSolution] = useState(false);
    const [streakCount, setStreakCount] = useState(0);
    const [streakBroken, setStreakBroken] = useState(false);

    // Timer
    const [puzzleElapsedMs, setPuzzleElapsedMs] = useState(0);
    const [lastSolveTimeMs, setLastSolveTimeMs] = useState<number | null>(null);
    const puzzleStartRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [fetchLoading, setFetchLoading] = useState(false);
    const currentPuzzle = puzzles[currentIndex];

    const boardPieces = useMemo(
        () => generateLocalPieces(boardSettings.pieceStyle),
        [boardSettings.pieceStyle]
    );

    // Timer effect
    useEffect(() => {
        if (phase !== "solving" || puzzleCompleted || streakBroken) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            return;
        }
        if (!puzzleStartRef.current) {
            puzzleStartRef.current = Date.now();
            setPuzzleElapsedMs(0);
        }
        timerIntervalRef.current = setInterval(() => {
            if (puzzleStartRef.current) setPuzzleElapsedMs(Date.now() - puzzleStartRef.current);
        }, 50);
        return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
    }, [phase, puzzleCompleted, streakBroken, currentIndex]);

    // Auto transition when puzzle completed and mode is automatic
    useEffect(() => {
        if (puzzleCompleted && skipMode === "automatic" && !streakBroken) {
            const timer = setTimeout(() => {
                if (currentIndex < puzzles.length - 1) {
                    goToNextPuzzle();
                }
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [puzzleCompleted, skipMode, currentIndex, puzzles.length, streakBroken]);

    // Load puzzle (apply opponent move)
    const loadPuzzle = useCallback((puzzle: PuzzleLocal) => {
        const game = new Chess(puzzle.fen_for_player);
        if (puzzle.first_opponent_move_uci) {
            try { game.move(puzzle.first_opponent_move_uci); } catch { }
        }
        const playerSide = game.turn() === 'w' ? 'white' : 'black';
        setPlayerOrientation(playerSide);
        setPuzzleFen(game.fen());
        setPuzzleMoveIndex(0);
        setUserMoveCount(0);
        setIsAutoPlaying(false);
        setPuzzleCompleted(false);
        setShowSolution(false);
        setFeedback("Make your move.");
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        puzzleStartRef.current = Date.now();
        setPuzzleElapsedMs(0);
        setLastSolveTimeMs(null);
    }, []);

    // Start solving
    const startSolving = async () => {
        setFetchLoading(true);
        setFeedback("");
        try {
            const fetched = await getPuzzleStreak(startRating, puzzleCount);
            if (fetched.length === 0) {
                setFeedback("No puzzles found for this rating.");
                setFetchLoading(false);
                return;
            }
            setPuzzles(fetched);
            setCurrentIndex(0);
            setStreakCount(0);
            setStreakBroken(false);
            setPhase("solving");
            loadPuzzle(fetched[0]);
        } catch (err: any) {
            setFeedback(err.message || "Error fetching puzzles");
        } finally {
            setFetchLoading(false);
        }
    };

    // When puzzle is solved
    const onPuzzleSolved = () => {
        setStreakCount(prev => prev + 1);
        setPuzzleCompleted(true);
        if (puzzleStartRef.current) {
            setLastSolveTimeMs(Date.now() - puzzleStartRef.current);
        }
    };

    // When puzzle is failed
    const onPuzzleFailed = () => {
        setStreakBroken(true);
        setFeedback("Wrong move! Streak broken.");
    };

    // Next puzzle
    const goToNextPuzzle = () => {
        if (currentIndex < puzzles.length - 1 && !streakBroken) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            loadPuzzle(puzzles[nextIdx]);
        }
    };

    // Repeat streak after failure: reduce rating of the failed puzzle by 50
    const handleRepeatStreak = async () => {
        if (!currentPuzzle) return;
        const newRating = Math.max(0, currentPuzzle.rating - 50);
        setFetchLoading(true);
        try {
            const fetched = await getPuzzleStreak(newRating, puzzleCount);
            if (fetched.length === 0) {
                setFeedback("No puzzles found. Try a higher rating?");
                setFetchLoading(false);
                return;
            }
            setPuzzles(fetched);
            setCurrentIndex(0);
            setStreakCount(0);
            setStreakBroken(false);
            loadPuzzle(fetched[0]);
        } catch (err: any) {
            setFeedback(err.message || "Error fetching puzzles");
        } finally {
            setFetchLoading(false);
        }
    };

    // Show solution (play move on board, then opponent reply) – only callable after streak broken
    const handleShowSolution = () => {
        if (!currentPuzzle || showSolution || !streakBroken) return;
        setShowSolution(true);
        const expectedMove = currentPuzzle.solution_moves_uci[puzzleMoveIndex];
        if (!expectedMove) return;
        const gameCopy = new Chess(puzzleFen);
        const from = expectedMove.slice(0, 2) as Square;
        const to = expectedMove.slice(2, 4) as Square;
        const promotion = expectedMove.length > 4 ? (expectedMove[4] as "q" | "r" | "b" | "n") : undefined;
        try { gameCopy.move({ from, to, promotion }); } catch { return; }
        const newFen = gameCopy.fen();
        setPuzzleFen(newFen);
        setUserMoveCount(prev => prev + 1);
        const nextIndex = puzzleMoveIndex + 1;
        if (nextIndex >= currentPuzzle.solution_moves_uci.length) {
            setPuzzleMoveIndex(nextIndex);
            setFeedback("Solution displayed.");
            return;
        }
        // Opponent reply
        const opponentUci = currentPuzzle.solution_moves_uci[nextIndex];
        setIsAutoPlaying(true);
        setTimeout(() => {
            const withOpponent = new Chess(newFen);
            const oppMove = applyUciMove(withOpponent, opponentUci);
            if (!oppMove) { setIsAutoPlaying(false); return; }
            setPuzzleFen(withOpponent.fen());
            setPuzzleMoveIndex(nextIndex + 1);
            setIsAutoPlaying(false);
            if (nextIndex + 1 >= currentPuzzle.solution_moves_uci.length) {
                setFeedback("Solution displayed.");
            } else {
                setFeedback(`Solution step: ${nextIndex + 2}/${currentPuzzle.solution_moves_uci.length}`);
            }
        }, 400);
    };

    // Drag-and-drop handler
    const onPuzzleDrop = useCallback(
        ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
            if (!targetSquare || !currentPuzzle || isAutoPlaying || puzzleCompleted || streakBroken || showSolution) return false;
            const gameCopy = new Chess(puzzleFen);
            let move;
            try {
                move = gameCopy.move({
                    from: sourceSquare as Square,
                    to: targetSquare as Square,
                    promotion: "q",
                });
            } catch { return false; }
            if (!move) return false;

            const playedUci = `${move.from}${move.to}${move.promotion ?? ""}`;
            const expected = currentPuzzle.solution_moves_uci[puzzleMoveIndex];

            if (expected && playedUci === expected) {
                const newMoveCount = userMoveCount + 1;
                setUserMoveCount(newMoveCount);
                const newFen = gameCopy.fen();
                setPuzzleFen(newFen);
                const nextIndex = puzzleMoveIndex + 1;
                if (nextIndex >= currentPuzzle.solution_moves_uci.length) {
                    setPuzzleMoveIndex(nextIndex);
                    onPuzzleSolved();
                } else {
                    const opponentUci = currentPuzzle.solution_moves_uci[nextIndex];
                    setFeedback("Correct! Opponent is replying...");
                    setIsAutoPlaying(true);
                    setTimeout(() => {
                        const withOpponent = new Chess(newFen);
                        const oppMove = applyUciMove(withOpponent, opponentUci);
                        if (!oppMove) { setIsAutoPlaying(false); return; }
                        setPuzzleFen(withOpponent.fen());
                        setPuzzleMoveIndex(nextIndex + 1);
                        setIsAutoPlaying(false);
                        if (nextIndex + 1 >= currentPuzzle.solution_moves_uci.length) {
                            onPuzzleSolved();
                        } else {
                            setFeedback(`Opponent played ${opponentUci}. Your turn — move ${nextIndex + 2}/${currentPuzzle.solution_moves_uci.length}.`);
                        }
                    }, 450);
                }
                return true;
            } else {
                onPuzzleFailed();
                return false;
            }
        },
        [currentPuzzle, isAutoPlaying, puzzleFen, puzzleMoveIndex, userMoveCount, puzzleCompleted, streakBroken, showSolution]
    );

    const applyUciMove = useCallback((game: Chess, uci: string) => {
        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        const promotion = uci.length > 4 ? (uci[4] as "q" | "r" | "b" | "n") : undefined;
        return game.move({ from, to, promotion });
    }, []);

    // Board options with Redux styles
    const puzzleBoardOptions: ChessboardOptions = useMemo(
        () => ({
            id: "PuzzleStreakBoard",
            position: puzzleFen,
            boardOrientation: playerOrientation,
            onPieceDrop: onPuzzleDrop,
            animationDurationInMs: 250,
            showAnimations: true,
            darkSquareStyle: { backgroundColor: boardSettings.darkSquareColor },
            lightSquareStyle: { backgroundColor: boardSettings.lightSquareColor },
            pieces: boardPieces,
        }),
        [puzzleFen, playerOrientation, onPuzzleDrop, boardPieces, boardSettings]
    );

     return (
    <div className="bg-black text-white min-h-screen p-6 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
          Puzzle Streak Training
        </h1>

        {phase === "setup" ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto p-6 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 space-y-5">
            <h2 className="text-xl font-bold text-orange-100">Streak Settings</h2>
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">Starting Rating</label>
              <input
                type="number"
                value={startRating}
                onChange={(e) => setStartRating(Number(e.target.value))}
                className="w-full bg-black/40 border border-[#FF4D00]/30 rounded-lg py-2 px-3 text-orange-100 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">
                Puzzle Count: {puzzleCount}
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={puzzleCount}
                onChange={(e) => setPuzzleCount(Number(e.target.value))}
                className="w-full accent-[#FF4D00]"
              />
            </div>
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">Skip Mode</label>
              <select
                value={skipMode}
                onChange={(e) => setSkipMode(e.target.value as "manual" | "automatic")}
                className="w-full bg-black/40 border border-[#FF4D00]/30 rounded-lg py-2 px-3 text-orange-100 text-sm"
              >
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startSolving}
              disabled={fetchLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF4D00] to-[#FF0000] text-white font-bold shadow-lg disabled:opacity-60"
            >
              {fetchLoading ? "Loading..." : "Start Streak"}
            </motion.button>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
            <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl overflow-hidden shadow-2xl border border-[#FF4D00]/30 bg-black/30 aspect-square w-[90vw] md:w-125"
              >
                <LazyChessboard options={puzzleBoardOptions} />
              </motion.div>
            </div>

            <div className="flex-1 flex flex-col gap-4 w-full max-w-xl">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30">
                <h2 className="text-sm font-bold text-orange-100 mb-3">Progress</h2>
                <div className="text-xs text-orange-200/70">
                  Puzzle {currentIndex + 1} of {puzzles.length}
                </div>

                {/* Skip Mode toggle */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-orange-200/80">Auto‑advance:</span>
                  <button
                    onClick={() =>
                      setSkipMode(prev =>
                        prev === "manual" ? "automatic" : "manual"
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      skipMode === "automatic"
                        ? "bg-[#FF4D00]"
                        : "bg-black/40 border border-[#FF4D00]/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        skipMode === "automatic" ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-xs text-orange-100/80 ml-1">
                    {skipMode === "automatic" ? "Automatic" : "Manual"}
                  </span>
                </div>

                {/* Streak broken actions */}
                {streakBroken && (
                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      onClick={handleShowSolution}
                      disabled={showSolution}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 disabled:opacity-50 text-orange-100 text-sm transition w-fit"
                    >
                      <FiEye size={14} /> Show Solution
                    </button>
                    <button
                      onClick={handleRepeatStreak}
                      disabled={fetchLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF4D00] to-[#FF0000] text-white text-sm font-semibold transition disabled:opacity-50 w-fit"
                    >
                      <FiRefreshCw size={14} /> Try again (rating -50)
                    </button>
                  </div>
                )}
              </motion.div>

              <div className="text-center space-y-2 w-full">
                <div className="flex items-center justify-center gap-2">
                  <FiZap className="text-yellow-400 text-2xl" />
                  <span className="text-4xl font-bold text-yellow-400">{streakCount}</span>
                </div>
                <div className="text-sm text-orange-200/70">
                  You are playing {playerOrientation === "white" ? "White" : "Black"}
                </div>
                <div className="text-sm text-orange-200/60">Elapsed</div>
                <div className="text-3xl font-mono text-orange-100">{formatTime(puzzleElapsedMs)}</div>
                {lastSolveTimeMs !== null && (
                  <div className="text-sm text-orange-300/80">Last solve: {formatTime(lastSolveTimeMs)}</div>
                )}
                {feedback && <div className="text-sm text-orange-200/80 mt-1">{feedback}</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PuzzlesStreakTraining;