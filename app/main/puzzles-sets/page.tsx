"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { motion } from "framer-motion";
import { FiRefreshCw, FiArrowRight, FiArrowLeft, FiEye } from "react-icons/fi";
import { useSelector } from "react-redux";
import type { ChessboardOptions, PieceRenderObject } from "react-chessboard";
import dynamic from "next/dynamic";
import { RootState } from "@/app/redux/store";
import chessOpenings from "@/app/utils/openings";
import chessThemes from "@/app/utils/themes";
import { PuzzleLocal } from "@/app/types/types";
import { getPuzzleSet } from "@/app/utils/api";

const LazyChessboard = dynamic(
    () => import("react-chessboard").then((mod) => ({ default: mod.Chessboard })),
    { ssr: false }
);


// ---------- Level presets ----------
const LEVEL_PRESETS: Record<
    string,
    { label: string; minDefault: number; maxDefault: number; minBound: number; maxBound: number; tier: string }
> = {
    beginner: {
        label: "Beginner (Under 1200)",
        minDefault: 0,
        maxDefault: 1199,
        minBound: 0,
        maxBound: 1199,
        tier: "beginner",
    },
    intermediate: {
        label: "Intermediate (1200 - 1799)",
        minDefault: 1200,
        maxDefault: 1799,
        minBound: 1200,
        maxBound: 1799,
        tier: "intermediate",
    },
    advanced: {
        label: "Advanced (1800+)",
        minDefault: 1800,
        maxDefault: 3000,
        minBound: 1800,
        maxBound: 3000,
        tier: "advanced",
    },
};

// ---------- Helpers ----------
const generateLocalPieces = (style: string): PieceRenderObject => {
    const base = `/piece/${style}`;
    const pieces = {
        wP: `${base}/wP.svg`,
        wN: `${base}/wN.svg`,
        wB: `${base}/wB.svg`,
        wR: `${base}/wR.svg`,
        wQ: `${base}/wQ.svg`,
        wK: `${base}/wK.svg`,
        bP: `${base}/bP.svg`,
        bN: `${base}/bN.svg`,
        bB: `${base}/bB.svg`,
        bR: `${base}/bR.svg`,
        bQ: `${base}/bQ.svg`,
        bK: `${base}/bK.svg`,
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
const OPENINGS_RENDER_LIMIT = 120;

const PuzzlesSetsTraining: React.FC = () => {
    // Redux board settings
    const boardSettings = useSelector((state: RootState) => state.boardSettings);

    // Setup phase
    const [phase, setPhase] = useState<"setup" | "solving">("setup");
    const [level, setLevel] = useState("intermediate");

    // Raw input strings for ratings
    const [minRatingInput, setMinRatingInput] = useState(
        String(LEVEL_PRESETS.intermediate.minDefault)
    );
    const [maxRatingInput, setMaxRatingInput] = useState(
        String(LEVEL_PRESETS.intermediate.maxDefault)
    );
    // Parsed and clamped values used for API
    const [minRating, setMinRating] = useState(LEVEL_PRESETS.intermediate.minDefault);
    const [maxRating, setMaxRating] = useState(LEVEL_PRESETS.intermediate.maxDefault);

    const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
    const [selectedOpenings, setSelectedOpenings] = useState<string[]>([]);
    const [puzzleCount, setPuzzleCount] = useState(10);

    // Dropdown states
    const [themesDropdownOpen, setThemesDropdownOpen] = useState(false);
    const [openingsDropdownOpen, setOpeningsDropdownOpen] = useState(false);
    const [openingsSearch, setOpeningsSearch] = useState("");

    const themesDropdownRef = useRef<HTMLDivElement | null>(null);
    const openingsDropdownRef = useRef<HTMLDivElement | null>(null);
    const themesListRef = useRef<HTMLDivElement | null>(null);
    const openingsListRef = useRef<HTMLDivElement | null>(null);

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
    const [skipMode, setSkipMode] = useState<"manual" | "automatic">("manual");

    // Timer
    const [puzzleElapsedMs, setPuzzleElapsedMs] = useState(0);
    const [lastSolveTimeMs, setLastSolveTimeMs] = useState<number | null>(null);
    const puzzleStartRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [fetchLoading, setFetchLoading] = useState(false);
    

    const currentPuzzle = puzzles[currentIndex];

    // Board pieces (memoized based on Redux piece style)
    const boardPieces = useMemo(
        () => generateLocalPieces(boardSettings.pieceStyle),
        [boardSettings.pieceStyle]
    );

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (themesDropdownRef.current && !themesDropdownRef.current.contains(e.target as Node)) {
                setThemesDropdownOpen(false);
            }
            if (openingsDropdownRef.current && !openingsDropdownRef.current.contains(e.target as Node)) {
                setOpeningsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Timer effect
    useEffect(() => {
        if (phase !== "solving" || puzzleCompleted) {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
            return;
        }

        if (!puzzleStartRef.current) {
            puzzleStartRef.current = Date.now();
            setPuzzleElapsedMs(0);
        }

        timerIntervalRef.current = setInterval(() => {
            if (puzzleStartRef.current) {
                setPuzzleElapsedMs(Date.now() - puzzleStartRef.current);
            }
        }, 50);

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [phase, puzzleCompleted, currentIndex]);

    // Automatic transition when puzzle completed and mode is automatic
    useEffect(() => {
        if (puzzleCompleted && skipMode === "automatic") {
            const timer = setTimeout(() => {
                if (currentIndex < puzzles.length - 1) {
                    goToNextPuzzle();
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [puzzleCompleted, skipMode, currentIndex, puzzles.length]);

    // Update ratings when level changes
    const handleLevelChange = (newLevel: string) => {
        setLevel(newLevel);
        const preset = LEVEL_PRESETS[newLevel];
        setMinRatingInput(String(preset.minDefault));
        setMaxRatingInput(String(preset.maxDefault));
        setMinRating(preset.minDefault);
        setMaxRating(preset.maxDefault);
    };

    // Clamp min rating on blur/enter
    const handleMinBlur = () => {
        const preset = LEVEL_PRESETS[level];
        let val = parseInt(minRatingInput, 10);
        if (isNaN(val)) val = preset.minDefault;
        val = Math.max(preset.minBound, Math.min(preset.maxBound, val));
        setMinRating(val);
        setMinRatingInput(String(val));
    };

    const handleMaxBlur = () => {
        const preset = LEVEL_PRESETS[level];
        let val = parseInt(maxRatingInput, 10);
        if (isNaN(val)) val = preset.maxDefault;
        val = Math.max(preset.minBound, Math.min(preset.maxBound, val));
        setMaxRating(val);
        setMaxRatingInput(String(val));
    };

    const handleMinKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleMinBlur();
    };

    const handleMaxKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleMaxBlur();
    };

    // Keyboard first-letter search for dropdowns
    const handleThemesKeyDown = (e: React.KeyboardEvent) => {
        if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
            const letter = e.key.toLowerCase();
            const items = themesListRef.current?.querySelectorAll("label");
            if (!items) return;
            for (const item of items) {
                const text = item.textContent?.trim().toLowerCase();
                if (text?.startsWith(letter)) {
                    item.scrollIntoView({ block: "nearest" });
                    break;
                }
            }
        }
    };

    const handleOpeningsKeyDown = (e: React.KeyboardEvent) => {
        if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
            const letter = e.key.toLowerCase();
            const items = openingsListRef.current?.querySelectorAll("label");
            if (!items) return;
            for (const item of items) {
                const text = item.textContent?.trim().toLowerCase();
                if (text?.startsWith(letter)) {
                    item.scrollIntoView({ block: "nearest" });
                    break;
                }
            }
        }
    };

    // Load a specific puzzle into the board (reset state)
    const loadPuzzle = useCallback((puzzle: PuzzleLocal) => {
        const game = new Chess(puzzle.fen_for_player); // start from position before opponent move

        // Apply the opponent's first move
        if (puzzle.first_opponent_move_uci) {
            try {
                game.move(puzzle.first_opponent_move_uci);
            } catch {
                // fallback – shouldn't happen
            }
        }

        // Now it's the player's turn
        const playerSide = game.turn() === 'w' ? 'white' : 'black';
        setPlayerOrientation(playerSide);
        setPuzzleFen(game.fen());
        // Reset puzzle state...
        setPuzzleMoveIndex(0);
        setUserMoveCount(0);
        setIsAutoPlaying(false);
        setPuzzleCompleted(false);
        setShowSolution(false);
        setFeedback("Make your move.");
        // Reset timer...
    }, []);

    // Initialize solving
    const startSolving = async () => {
    setFetchLoading(true);
    setFeedback("");

    try {
        const fetched = await getPuzzleSet({
            tier: LEVEL_PRESETS[level].tier,
            minRating,
            maxRating,
            puzzleCount,
            selectedThemes,
            selectedOpenings,
        });

        if (fetched.length === 0) {
            setFeedback("No puzzles found for the selected criteria.");
            return;
        }

        setPuzzles(fetched);
        setCurrentIndex(0);
        setPhase("solving");
        loadPuzzle(fetched[0]);
    } catch (err: any) {
        setFeedback(err.message || "Error fetching puzzles");
    } finally {
        setFetchLoading(false);
    }
};

    // Move to next puzzle
    const goToNextPuzzle = () => {
        if (currentIndex < puzzles.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            loadPuzzle(puzzles[nextIdx]);
        }
    };

    // Move to previous puzzle
    const goToPrevPuzzle = () => {
        if (currentIndex > 0) {
            const prevIdx = currentIndex - 1;
            setCurrentIndex(prevIdx);
            loadPuzzle(puzzles[prevIdx]);
        }
    };

    // Repeat current puzzle
    const repeatPuzzle = () => {
        if (!currentPuzzle) return;
        loadPuzzle(currentPuzzle);
    };

    // Show solution – play the correct move on the board
    const handleShowSolution = () => {
        if (!currentPuzzle || showSolution || puzzleCompleted) return;
        setShowSolution(true);

        const expectedMove = currentPuzzle.solution_moves_uci[puzzleMoveIndex];
        if (!expectedMove) return;

        const gameCopy = new Chess(puzzleFen);
        const from = expectedMove.slice(0, 2) as Square;
        const to = expectedMove.slice(2, 4) as Square;
        const promotion = expectedMove.length > 4 ? (expectedMove[4] as "q" | "r" | "b" | "n") : undefined;
        let move;
        try {
            move = gameCopy.move({ from, to, promotion });
        } catch {
            return; // silently ignore invalid solution move (should not happen)
        }
        if (!move) return;

        const newFen = gameCopy.fen();
        setPuzzleFen(newFen);
        setUserMoveCount((prev) => prev + 1);
        const nextIndex = puzzleMoveIndex + 1;

        if (nextIndex >= currentPuzzle.solution_moves_uci.length) {
            setPuzzleMoveIndex(nextIndex);
            setFeedback("Solution displayed.");
            setPuzzleCompleted(true);
            return;
        }

        // Opponent reply auto-play
        const opponentUci = currentPuzzle.solution_moves_uci[nextIndex];
        setIsAutoPlaying(true);
        setTimeout(() => {
            const withOpponent = new Chess(newFen);
            const oppMove = applyUciMove(withOpponent, opponentUci);
            if (!oppMove) {
                setIsAutoPlaying(false);
                return;
            }
            const afterOpponentIndex = nextIndex + 1;
            setPuzzleFen(withOpponent.fen());
            setPuzzleMoveIndex(afterOpponentIndex);
            setIsAutoPlaying(false);

            if (afterOpponentIndex >= currentPuzzle.solution_moves_uci.length) {
                setFeedback("Solution displayed.");
                setPuzzleCompleted(true);
            } else {
                setFeedback(
                    `Solution step: ${afterOpponentIndex + 1}/${currentPuzzle.solution_moves_uci.length}.`
                );
            }
        }, 400);
    };

    // Puzzle drop handler (with silent catch for invalid moves)
    const onPuzzleDrop = useCallback(
        ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
            if (!targetSquare || !currentPuzzle || isAutoPlaying || puzzleCompleted || showSolution) return false;

            const gameCopy = new Chess(puzzleFen);
            let move;
            try {
                move = gameCopy.move({
                    from: sourceSquare as Square,
                    to: targetSquare as Square,
                    promotion: "q",
                });
            } catch {
                return false; // invalid move – silent rejection
            }
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
                    setFeedback("Great! Puzzle solved.");
                    setPuzzleCompleted(true);
                    if (puzzleStartRef.current) {
                        const solveTime = Date.now() - puzzleStartRef.current;
                        setLastSolveTimeMs(solveTime);
                    }
                } else {
                    const opponentUci = currentPuzzle.solution_moves_uci[nextIndex];
                    setFeedback("Correct! Opponent is replying...");
                    setIsAutoPlaying(true);

                    setTimeout(() => {
                        const withOpponent = new Chess(newFen);
                        const oppMove = applyUciMove(withOpponent, opponentUci);
                        if (!oppMove) {
                            setIsAutoPlaying(false);
                            setFeedback("Failed to apply opponent move. Please try again.");
                            return;
                        }
                        const afterIndex = nextIndex + 1;
                        setPuzzleFen(withOpponent.fen());
                        setPuzzleMoveIndex(afterIndex);
                        setIsAutoPlaying(false);

                        if (afterIndex >= currentPuzzle.solution_moves_uci.length) {
                            setFeedback("Great! Puzzle solved.");
                            setPuzzleCompleted(true);
                            if (puzzleStartRef.current) {
                                const solveTime = Date.now() - puzzleStartRef.current;
                                setLastSolveTimeMs(solveTime);
                            }
                        } else {
                            setFeedback(
                                `Opponent played ${opponentUci}. Your turn — move ${afterIndex + 1
                                }/${currentPuzzle.solution_moves_uci.length}.`
                            );
                        }
                    }, 450);
                }
                return true;
            } else {
                setFeedback(`Incorrect move: ${playedUci}. Try again.`);
                return false;
            }
        },
        [
            currentPuzzle,
            isAutoPlaying,
            puzzleFen,
            puzzleMoveIndex,
            userMoveCount,
            puzzleCompleted,
            showSolution,
        ]
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
            id: "PuzzleTrainingBoard",
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

    // Filtered openings for search
    const filteredOpenings = useMemo(() => {
        const search = openingsSearch.trim().toLowerCase();
        const pool = search
            ? chessOpenings.filter((o) => o.toLowerCase().includes(search))
            : chessOpenings;
        return pool.slice(0, OPENINGS_RENDER_LIMIT);
    }, [openingsSearch]);

    const toggleSelection = (
        value: string,
        setter: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        setter((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
        );
    };

    return (
    <div className="bg-black text-white min-h-screen p-6 overflow-hidden relative">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
          Puzzle Sets Training
        </h1>

        {phase === "setup" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto p-6 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 space-y-5"
          >
            <h2 className="text-xl font-bold text-orange-100">Create Your Puzzle Set</h2>

            {/* Level Selector */}
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">Level</label>
              <select
                value={level}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full bg-black/40 border border-[#FF4D00]/30 rounded-lg py-2 px-3 text-orange-100 text-sm"
              >
                {Object.entries(LEVEL_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-orange-200/80 mb-1">Min Rating</label>
                <input
                  type="number"
                  value={minRatingInput}
                  onChange={(e) => setMinRatingInput(e.target.value)}
                  onBlur={handleMinBlur}
                  onKeyDown={handleMinKeyDown}
                  min={LEVEL_PRESETS[level].minBound}
                  max={LEVEL_PRESETS[level].maxBound}
                  className="w-full bg-black/40 border border-[#FF4D00]/30 rounded-lg py-2 px-3 text-orange-100 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-orange-200/80 mb-1">Max Rating</label>
                <input
                  type="number"
                  value={maxRatingInput}
                  onChange={(e) => setMaxRatingInput(e.target.value)}
                  onBlur={handleMaxBlur}
                  onKeyDown={handleMaxKeyDown}
                  min={LEVEL_PRESETS[level].minBound}
                  max={LEVEL_PRESETS[level].maxBound}
                  className="w-full bg-black/40 border border-[#FF4D00]/30 rounded-lg py-2 px-3 text-orange-100 text-sm"
                />
              </div>
            </div>

            {/* Themes multi-select with keyboard search */}
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">Themes</label>
              <div ref={themesDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setThemesDropdownOpen((prev) => !prev)}
                  onKeyDown={handleThemesKeyDown}
                  className="w-full p-2 rounded bg-black/40 border border-[#FF4D00]/30 text-left text-sm flex justify-between items-center"
                >
                  <span className="truncate">
                    {selectedThemes.length === 0
                      ? "Select themes"
                      : `${selectedThemes.length} selected`}
                  </span>
                  <span>{themesDropdownOpen ? "▴" : "▾"}</span>
                </button>
                {themesDropdownOpen && (
                  <div className="absolute z-20 mt-2 w-full rounded-lg bg-black/95 border border-[#FF4D00]/30 shadow-lg p-2">
                    <div ref={themesListRef} className="max-h-44 overflow-y-auto space-y-1 pr-1">
                      {chessThemes.map((theme) => (
                        <label
                          key={theme}
                          className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-[#FF4D00]/10 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedThemes.includes(theme)}
                            onChange={() => toggleSelection(theme, setSelectedThemes)}
                            className="accent-[#FF4D00]"
                          />
                          <span>{theme}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Openings multi-select with keyboard search */}
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">Openings</label>
              <div ref={openingsDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOpeningsDropdownOpen((prev) => !prev)}
                  onKeyDown={handleOpeningsKeyDown}
                  className="w-full p-2 rounded bg-black/40 border border-[#FF4D00]/30 text-left text-sm flex justify-between items-center"
                >
                  <span className="truncate">
                    {selectedOpenings.length === 0
                      ? "Select openings"
                      : `${selectedOpenings.length} selected`}
                  </span>
                  <span>{openingsDropdownOpen ? "▴" : "▾"}</span>
                </button>
                {openingsDropdownOpen && (
                  <div className="absolute z-20 mt-2 w-full rounded-lg bg-black/95 border border-[#FF4D00]/30 shadow-lg p-2">
                    <input
                      className="w-full p-2 rounded bg-black/70 border border-[#FF4D00]/30 mb-2 text-sm"
                      placeholder="Search openings..."
                      value={openingsSearch}
                      onChange={(e) => setOpeningsSearch(e.target.value)}
                    />
                    <div className="text-xs text-orange-300/70 mb-1 px-1">
                      Showing {filteredOpenings.length} / {chessOpenings.length}
                    </div>
                    <div ref={openingsListRef} className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {filteredOpenings.map((opening) => (
                        <label
                          key={opening}
                          className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-[#FF4D00]/10 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedOpenings.includes(opening)}
                            onChange={() => toggleSelection(opening, setSelectedOpenings)}
                            className="accent-[#FF4D00]"
                          />
                          <span>{opening}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Puzzle count slider */}
            <div>
              <label className="block text-sm text-orange-200/80 mb-1">
                Puzzle Count: {puzzleCount}
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={puzzleCount}
                onChange={(e) => setPuzzleCount(Number(e.target.value))}
                className="w-full accent-[#FF4D00]"
              />
            </div>

            {/* Skip Mode Selector */}
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
              {fetchLoading ? "Loading puzzles..." : "Start Training"}
            </motion.button>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
            {/* Board + Timer */}
            <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl overflow-hidden shadow-2xl border border-[#FF4D00]/30 bg-black/30 aspect-square w-[90vw] md:w-125"
              >
                <LazyChessboard options={puzzleBoardOptions} />
              </motion.div>
              

              <div className="text-center space-y-2 w-[90vw] md:w-125">
                <div className="text-sm text-orange-200/70">
                  You are playing {playerOrientation === "white" ? "White" : "Black"}
                </div>
                <div className="text-sm text-orange-200/60">Elapsed</div>
                <div className="text-3xl font-mono text-orange-100">
                  {formatTime(puzzleElapsedMs)}
                </div>
                {lastSolveTimeMs !== null && (
                  <div className="text-sm text-orange-300/80">
                    Last solve: {formatTime(lastSolveTimeMs)}
                  </div>
                )}
                {feedback && (
                  <div className="text-sm text-orange-200/80 mt-1">{feedback}</div>
                )}
                {showSolution && currentPuzzle && (
                  <div className="mt-2 text-sm text-yellow-300">
                    Solution: {currentPuzzle.solution_moves_uci.join(" ")}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: Controls */}
            <div className="flex-1 flex flex-col gap-4 w-full max-w-xl">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30"
              >
                <h2 className="text-sm font-bold text-orange-100 mb-3">Progress</h2>
                <div className="text-xs text-orange-200/70">
                  Puzzle {currentIndex + 1} of {puzzles.length}
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  <button
                    onClick={goToPrevPuzzle}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 disabled:opacity-50 text-orange-100 text-sm transition"
                  >
                    <FiArrowLeft size={14} /> Previous
                  </button>
                  <button
                    onClick={goToNextPuzzle}
                    disabled={currentIndex >= puzzles.length - 1}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 disabled:opacity-50 text-orange-100 text-sm transition"
                  >
                    Next <FiArrowRight size={14} />
                  </button>
                  <button
                    onClick={handleShowSolution}
                    disabled={showSolution || puzzleCompleted}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 disabled:opacity-50 text-orange-100 text-sm transition"
                  >
                    <FiEye size={14} /> Show Solution
                  </button>
                </div>

                {/* Completion actions */}
                {puzzleCompleted && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={repeatPuzzle}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 text-sm transition"
                    >
                      <FiRefreshCw /> Repeat
                    </button>
                    {currentIndex < puzzles.length - 1 && (
                      <button
                        onClick={goToNextPuzzle}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#FF4D00] to-[#FF0000] text-white text-sm font-semibold transition"
                      >
                        <FiArrowRight /> Next
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PuzzlesSetsTraining;
