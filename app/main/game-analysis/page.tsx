"use client"

import React, { useState, useMemo, useCallback, Suspense, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChessKnight, FaChessQueen, FaChessRook, FaChessBishop, FaAngleLeft, FaAngleRight, FaStepBackward, FaStepForward } from 'react-icons/fa';
import { FiCpu, FiUpload, FiZap } from 'react-icons/fi';
import type { ChessboardOptions, PieceRenderObject } from 'react-chessboard';
import UploadPGNModal from '@/app/components/PgnModal';
import dynamic from 'next/dynamic';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/redux/store';
import { generateGeminiText, generateGroqText, generateOpenRouterText, generateCerebrasText } from '@/app/utils/ai';
import { terminateCraftyEngine } from '@/app/utils/crafty-client';
import { AnalysisResult, EngineChoice } from '@/app/types/types';
import { generateLocalPieces } from '@/app/lib/board-ui';

const LazyChessboard = dynamic(() =>
    import('react-chessboard').then((mod) => ({
        default: mod.Chessboard,
    })), { ssr: false }
);

const GameAnalyzer: React.FC = () => {
    // Game state
    const reduxBoard = useSelector((state: RootState) => state.boardSettings);

    const [game, setGame] = useState(new Chess());
    const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1); // -1 = start position
    const [moveFrom, setMoveFrom] = useState<Square | null>(null);
    const [rightClickedSquares, setRightClickedSquares] = useState<Record<string, any>>({});
    const [moveSquares, setMoveSquares] = useState<Record<string, any>>({});
    const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
    const [playerColor] = useState<'white' | 'black'>('white');
    const [showPromotionDialog, setShowPromotionDialog] = useState(false);
    const [pendingMove, setPendingMove] = useState<{ from: Square; to: Square } | null>(null);
    const [boardSettings] = useState({
        pieceStyle: 'cburnett',
        lightSquareColor: '#eeeed2',
        darkSquareColor: '#769656',
        squareWidth: 60,
        animationSpeed: 300,
    });
    const [showUploadModal, setShowUploadModal] = useState(false);

    // PGN analysis integration (engine-agnostic)
    const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [activeEngine, setActiveEngine] = useState<EngineChoice | null>(null);
    const [craftyReady, setCraftyReady] = useState(false);

    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Crafty's WASM module loads lazily inside the worker the first time it's
    // used. We mark it "ready" optimistically after mount so a status badge
    // (shown only once Crafty has been selected/used) isn't stuck loading.
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
    

    // Move history pairs for display
    const moveHistory = useMemo(() => {
        const history = game.history({ verbose: true });
        const pairs: { moveNumber: number; white?: string; black?: string }[] = [];
        for (let i = 0; i < history.length; i += 2) {
            pairs.push({
                moveNumber: Math.floor(i / 2) + 1,
                white: history[i]?.san,
                black: history[i + 1]?.san,
            });
        }
        return pairs;
    }, [game]);

    // Compute FEN at a given move index
    const fenAtMoveIndex = useCallback(
        (index: number) => {
            if (index < 0) return new Chess().fen();
            const tempChess = new Chess();
            const history = game.history({ verbose: true });
            for (let i = 0; i <= index; i++) {
                if (i >= history.length) break;
                tempChess.move(history[i].san);
            }
            return tempChess.fen();
        },
        [game]
    );

    // Current position based on navigation
    const currentPosition = useMemo(() => {
        return fenAtMoveIndex(currentMoveIndex);
    }, [fenAtMoveIndex, currentMoveIndex]);

    // Get possible moves for a given square
    const getMoveOptions = useCallback(
        (square: Square) => {
            const tempGame = new Chess(currentPosition);
            const moves = tempGame.moves({ square, verbose: true });
            if (moves.length === 0) {
                setOptionSquares({});
                return false;
            }
            const newSquares: Record<string, any> = {};
            const sourcePiece = tempGame.get(square);
            if (!sourcePiece) {
                setOptionSquares({});
                return false;
            }
            moves.forEach((move) => {
                const targetPiece = tempGame.get(move.to as Square);
                newSquares[move.to] = {
                    background:
                        targetPiece && targetPiece.color !== sourcePiece.color
                            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
                            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
                    borderRadius: '50%',
                };
            });
            newSquares[square] = { background: 'rgba(255, 255, 0, 0.4)' };
            setOptionSquares(newSquares);
            return true;
        },
        [currentPosition]
    );

    // Make a move on the board (always at the latest position)
    const makeMove = (from: Square, to: Square, promotion?: string) => {
        const gameCopy = new Chess(currentPosition);
        const move = gameCopy.move({ from, to, promotion: promotion as any });
        if (move) {
            if (currentMoveIndex < game.history().length - 1) {
                const tempGame = new Chess();
                const history = game.history({ verbose: true });
                for (let i = 0; i <= currentMoveIndex && i < history.length; i++) {
                    tempGame.move(history[i].san);
                }
                tempGame.move(move.san);
                setGame(tempGame);
                setCurrentMoveIndex(-1);
            } else {
                const newGame = new Chess(game.fen());
                newGame.move(move.san);
                setGame(newGame);
                setCurrentMoveIndex(-1);
            }
            setMoveSquares({
                [from]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
                [to]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' },
            });
            return true;
        }
        return false;
    };

    // Promotion handling
    const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
        if (pendingMove) {
            makeMove(pendingMove.from, pendingMove.to, piece);
            setPendingMove(null);
            setShowPromotionDialog(false);
        }
    };

    // Square click handler
    const onSquareClick = useCallback(
        ({ square }: { square: string }) => {
            const typedSquare = square as Square;
            setRightClickedSquares({});
            if (!moveFrom) {
                const hasMoveOptions = getMoveOptions(typedSquare);
                if (hasMoveOptions) setMoveFrom(typedSquare);
                return;
            }
            const tempGame = new Chess(currentPosition);
            const moves = tempGame.moves({ square: moveFrom, verbose: true });
            const foundMove = moves.find((m) => m.from === moveFrom && m.to === typedSquare);
            setMoveFrom(null);
            setOptionSquares({});
            if (!foundMove) {
                const hasMoveOptions = getMoveOptions(typedSquare);
                if (hasMoveOptions) setMoveFrom(typedSquare);
                return;
            }
            if (
                foundMove.promotion ||
                (foundMove.piece === 'p' &&
                    ((foundMove.color === 'w' && typedSquare[1] === '8') ||
                        (foundMove.color === 'b' && typedSquare[1] === '1')))
            ) {
                setPendingMove({ from: moveFrom, to: typedSquare });
                setShowPromotionDialog(true);
                return;
            }
            makeMove(moveFrom, typedSquare);
        },
        [moveFrom, currentPosition, getMoveOptions]
    );

    // Drag & drop handler
    const onDrop = useCallback(
        ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
            if (!targetSquare) return false;
            const source = sourceSquare as Square;
            const target = targetSquare as Square;
            const tempGame = new Chess(currentPosition);
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
                setShowPromotionDialog(true);
                return false;
            }
            makeMove(source, target);
            return true;
        },
        [currentPosition]
    );

    const onSquareRightClick = useCallback(({ square }: { square: string }) => {
        const color = 'rgba(255, 0, 0, 0.4)';
        setRightClickedSquares((prev) => ({
            ...prev,
            [square]: prev[square] ? undefined : { backgroundColor: color },
        }));
    }, []);

    // Board options
    const chessboardOptions: ChessboardOptions = {
        id: 'GameAnalyzerBoard',
        boardOrientation: playerColor,
        position: currentPosition,
        onPieceDrop: onDrop,
        onSquareClick: onSquareClick,
        onSquareRightClick: onSquareRightClick,
        animationDurationInMs: boardSettings.animationSpeed,
        showAnimations: boardSettings.animationSpeed > 0,
        darkSquareStyle: { backgroundColor: reduxBoard.darkSquareColor },
        lightSquareStyle: { backgroundColor: reduxBoard.lightSquareColor },
        pieces: generateLocalPieces(reduxBoard.pieceStyle),
        squareStyles: {
            ...moveSquares,
            ...optionSquares,
            ...rightClickedSquares,
        },
    };

    // Game status string
    const gameStatus = useMemo(() => {
        const tempGame = new Chess(currentPosition);
        if (tempGame.isCheckmate()) return `Checkmate! ${tempGame.turn() === 'w' ? 'Black' : 'White'} wins!`;
        if (tempGame.isDraw()) return 'Game drawn!';
        if (tempGame.isStalemate()) return 'Stalemate!';
        if (tempGame.isThreefoldRepetition()) return 'Draw by threefold repetition!';
        if (tempGame.isInsufficientMaterial()) return 'Draw by insufficient material!';
        if (tempGame.isCheck()) return 'Check!';
        return null;
    }, [currentPosition]);

    // Move navigation
    const goToStart = () => setCurrentMoveIndex(-1);
    const goToEnd = () => setCurrentMoveIndex(game.history().length - 1);
    const prevMove = () => setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
    const nextMove = () =>
        setCurrentMoveIndex((prev) => Math.min(game.history().length - 1, prev + 1));

    const totalMoves = game.history().length;
    const currentMoveDisplay = currentMoveIndex < 0 ? 0 : currentMoveIndex + 1;

    // ---- Analysis integration ----
    const handleAnalysisStart = () => {
        setAnalysisLoading(true);
        setAnalysisResults(null);
    };

    const handleAnalysisComplete = (results: AnalysisResult[], engine: EngineChoice) => {
        setAnalysisResults(results);
        setActiveEngine(engine);
        setAnalysisLoading(false);

        const newGame = new Chess();
        results.forEach((r) => {
            if (r.moveNumber > 0 && r.san) {
                try {
                    newGame.move(r.san);
                } catch {
                    // Ignore invalid moves; they shouldn't happen with real PGN
                }
            }
        });
        setGame(newGame);
        setCurrentMoveIndex(newGame.history().length - 1);
    };

    // Get analysis for the current position
    const currentAnalysis = useMemo(() => {
        if (!analysisResults) return null;
        const index = currentMoveIndex + 1; // -1 → 0, 0 → 1, etc.
        if (index < 0 || index >= analysisResults.length) return null;
        return analysisResults[index];
    }, [analysisResults, currentMoveIndex]);

    // Stockfish (server) returns a raw score relative to side-to-move, so we
    // flip to White's perspective. Crafty's worker already normalizes to
    // White's perspective, so no flip is needed there.
    const displayScore = useMemo(() => {
        if (!currentAnalysis || currentAnalysis.score === null) return null;
        if (activeEngine === 'crafty') {
            return currentAnalysis.score;
        }
        const fen = currentAnalysis.fen;
        const sideToMove = fen.split(' ')[1]; // 'w' or 'b'
        return sideToMove === 'b' ? -currentAnalysis.score : currentAnalysis.score;
    }, [currentAnalysis, activeEngine]);

    // Compute eval bar fill percentage (0 = black wins, 100 = white wins)
    const evalPercent = useMemo(() => {
        if (displayScore === null) return 50;
        const score = displayScore;
        if (Math.abs(score) > 10000) {
            return score > 0 ? 95 : 5;
        }
        const advantage = score / 100;
        const raw = 50 + advantage * 3.5;
        return Math.max(5, Math.min(95, raw));
    }, [displayScore]);

    // Format score for display
    const formatScore = (score: number | null) => {
        if (score === null) return '?';
        if (Math.abs(score) > 10000) {
            const movesToMate = Math.abs(score) - 10000;
            return score > 0 ? `M${movesToMate}` : `-M${movesToMate}`;
        }
        return (score / 100).toFixed(1);
    };

    const handleExplainWithAI = async () => {
        if (!analysisResults || analysisResults.length === 0) return;
        setAiLoading(true);
        setAiError(null);
        setAiExplanation(null);

        const pgn = game.pgn();
        const evaluationSummary = analysisResults
            .map((m) => {
                const score = m.score !== null ? (m.score / 100).toFixed(1) : '?';
                return `Move ${m.moveNumber}: ${m.san || 'start'} | Best: ${m.bestmove} | Eval: ${score}`;
            })
            .join('\n');

        const engineName = activeEngine === 'crafty' ? 'Crafty' : 'Stockfish';
        const prompt = `You are a chess coach. The user has just analyzed a chess game using the ${engineName} engine. Below is the complete PGN followed by a move-by-move analysis summary.

PGN:
${pgn}

Move-by-move analysis:
${evaluationSummary}

Please explain the key moments of this game in a clear, educational way. Highlight critical mistakes, brilliant moves, tactical themes, and suggest improvements. Keep it engaging and suitable for a club-level player.`;

        const models = [
            { name: 'Gemini', generate: generateGeminiText },
            { name: 'Groq', generate: generateGroqText },
            { name: 'OpenRouter', generate: generateOpenRouterText },
            { name: 'Cerebras', generate: generateCerebrasText },
        ];

        let lastError = '';
        for (const model of models) {
            try {
                const response = await model.generate(prompt);
                setAiExplanation(response);
                setAiLoading(false);
                return;
            } catch (err: any) {
                console.warn(`AI model ${model.name} failed:`, err.message);
                lastError = err.message || 'Unknown error';
            }
        }

        setAiError(`AI explanation failed: ${lastError}`);
        setAiLoading(false);
    };

    const engineLabel = activeEngine === 'crafty' ? 'Crafty' : activeEngine === 'stockfish' ? 'Stockfish' : null;

    return (
        <div className="bg-black text-white min-h-screen p-6 overflow-hidden relative">
            {/* Background glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Engine status badge — shown once an engine has been used, esp. useful for Crafty's local load state */}
            {activeEngine === 'crafty' && (
                <div className="fixed top-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-[#FF4D00]/30 backdrop-blur-sm">
                    <FiZap className={`text-sm ${craftyReady ? 'text-[#FF4D00]' : 'text-orange-400 animate-pulse'}`} />
                    <span className="text-xs text-orange-100 font-medium">
                        Crafty {craftyReady ? 'ready' : 'loading...'}
                    </span>
                </div>
            )}

            {/* Floating upload button */}
            <motion.button
                className="fixed cursor-pointer top-6 right-6 z-40 p-3 bg-linear-to-r from-[#FF4D00] to-[#FF0000] rounded-full shadow-lg shadow-[#FF4D00]/30 hover:shadow-[#FF4D00]/50 transition-all"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowUploadModal(true)}
                aria-label="Upload PGN for analysis"
            >
                <FiUpload className="text-white text-xl" />
            </motion.button>

            {analysisResults && !aiLoading && !aiExplanation && (
                <motion.button
                    className="fixed cursor-pointer top-24 right-6 z-40 p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleExplainWithAI}
                    aria-label="Explain with AI"
                >
                    <FiCpu className="text-white text-xl" />
                </motion.button>
            )}

            {/* Upload PGN Modal — engine selectable inside */}
            <UploadPGNModal
                isVisible={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onAnalysisStart={handleAnalysisStart}
                onAnalysisComplete={handleAnalysisComplete}
            />

            <div className="relative z-10 w-full max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
                        Game Analyzer
                    </h1>
                    <p className="text-orange-200/70 text-sm mt-1">
                        Import or play moves to analyze positions — choose Stockfish or Crafty
                    </p>
                </motion.div>

                <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
                    {/* Board + Eval Bar */}
                    <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-stretch gap-2 w-full justify-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="rounded-xl overflow-hidden shadow-2xl border border-[#FF4D00]/30 bg-black/30 aspect-square w-[90vw] md:w-125"
                            >
                                <Suspense
                                    fallback={
                                        <div className="aspect-square bg-black/30 flex items-center justify-center text-orange-200/70">
                                            Loading board...
                                        </div>
                                    }
                                >
                                    <LazyChessboard options={chessboardOptions} />
                                </Suspense>
                            </motion.div>

                            {/* Eval Bar */}
                            <div className="w-8 bg-black/30 rounded-r-xl border border-[#FF4D00]/30 border-l-0 overflow-hidden flex flex-col relative">
                                <div className="absolute inset-0 bg-linear-to-t from-black/70 to-white/70 opacity-30" />
                                <div
                                    className="w-full bg-white transition-all duration-300 ease-out"
                                    style={{ height: `${evalPercent}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-[0_0_4px_black] pointer-events-none">
                                    {displayScore !== null ? formatScore(displayScore) : '?'}
                                </div>
                            </div>
                        </div>

                        {/* Game status */}
                        {gameStatus && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-linear-to-br from-[#FF4D00]/20 to-[#FF0000]/20 border border-[#FF4D00]/30 text-center w-full max-w-[90vw] md:max-w-[500px]"
                            >
                                <div className="text-xl font-bold text-orange-100">{gameStatus}</div>
                            </motion.div>
                        )}
                    </div>

                    {/* Right panel: Move History + Engine Analysis */}
                    <div className="flex-1 flex flex-col gap-4 w-full max-w-xl">
                        {/* Move Navigation */}
                        <div className="flex justify-center gap-2">
                            <button onClick={goToStart} className="px-3 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 font-bold transition" title="Go to start">
                                <FaStepBackward />
                            </button>
                            <button onClick={prevMove} className="px-3 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 font-bold transition" title="Previous move">
                                <FaAngleLeft />
                            </button>
                            <button onClick={nextMove} className="px-3 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 font-bold transition" title="Next move">
                                <FaAngleRight />
                            </button>
                            <button onClick={goToEnd} className="px-3 py-2 rounded-lg bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 font-bold transition" title="Go to end">
                                <FaStepForward />
                            </button>
                            <span className="self-center text-sm text-orange-300/70 ml-2">
                                Move {currentMoveDisplay} / {totalMoves}
                            </span>
                        </div>

                        {/* Move History */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-4 rounded-2xl backdrop-blur-sm bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30"
                        >
                            <h2 className="text-lg font-bold text-orange-100 mb-3">Move History</h2>
                            <div className="max-h-64 overflow-y-auto space-y-1">
                                {moveHistory.length === 0 ? (
                                    <div className="text-center text-orange-200/60 py-8">No moves yet</div>
                                ) : (
                                    moveHistory.map((item, idx) => {
                                        const whiteMoveIdx = idx * 2;
                                        const blackMoveIdx = idx * 2 + 1;
                                        return (
                                            <div
                                                key={item.moveNumber}
                                                className="flex items-center gap-2 p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
                                            >
                                                <div className="w-8 text-[#FF4D00] font-semibold">{item.moveNumber}.</div>
                                                <div className="flex-1 grid grid-cols-2 gap-2">
                                                    <div
                                                        className={`font-mono text-orange-100 px-2 py-1 rounded ${currentMoveIndex === whiteMoveIdx ? 'bg-[#FF4D00]/30' : ''}`}
                                                    >
                                                        {item.white || ''}
                                                    </div>
                                                    <div
                                                        className={`font-mono text-orange-100 px-2 py-1 rounded ${currentMoveIndex === blackMoveIdx ? 'bg-[#FF4D00]/30' : ''}`}
                                                    >
                                                        {item.black || ''}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>

                        {/* Engine Analysis */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-4 rounded-2xl backdrop-blur-sm bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 flex-1"
                        >
                            <h2 className="text-lg font-bold text-orange-100 mb-3">
                                Engine Analysis{engineLabel ? ` (${engineLabel})` : ''}
                            </h2>

                            {analysisLoading && (
                                <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        className="w-10 h-10 border-4 border-[#FF4D00] border-t-transparent rounded-full"
                                    />
                                    <p className="text-orange-200/70 text-sm">Running engine analysis...</p>
                                </div>
                            )}

                            {!analysisLoading && !analysisResults && (
                                <div className="text-center text-orange-200/60 py-8">
                                    Click the upload button to import a PGN and see engine evaluations.
                                </div>
                            )}

                            {!analysisLoading && analysisResults && analysisResults.length > 0 && (
                                <div className="max-h-80 overflow-y-auto space-y-1">
                                    {analysisResults.map((line) => {
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
                                                className="flex items-center gap-3 p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-sm"
                                            >
                                                <div className="w-12 text-[#FF4D00] font-semibold">
                                                    {line.moveNumber === 0
                                                        ? 'Start'
                                                        : `${line.moveNumber}.${isWhite ? 'w' : 'b'}`}
                                                </div>
                                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                                    {line.san && (
                                                        <span className="font-mono text-orange-100 shrink-0">{line.san}</span>
                                                    )}
                                                    <span className="text-orange-200/60">→</span>
                                                    <span className="font-mono text-yellow-300 shrink-0">{line.bestmove}</span>
                                                    <div className={`ml-auto font-mono font-bold ${scoreColor}`}>
                                                        {scoreText}
                                                    </div>
                                                </div>
                                                <div className="hidden md:block text-xs text-orange-200/40 truncate max-w-37.5">
                                                    {line.pv.join(' ')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>

                        {/* AI Explanation */}
                        {(aiLoading || aiExplanation || aiError) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/30 flex-1"
                            >
                                <h2 className="text-lg font-bold text-purple-200 mb-3">AI Game Explanation</h2>

                                {aiLoading && (
                                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                            className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full"
                                        />
                                        <p className="text-purple-200/70 text-sm">AI is analyzing the game...</p>
                                    </div>
                                )}

                                {aiError && (
                                    <div className="text-red-400 text-sm">{aiError}</div>
                                )}

                                {aiExplanation && (
                                    <div className="max-h-96 overflow-y-auto">
                                        <div className="text-sm text-purple-100/90 whitespace-pre-wrap">{aiExplanation}</div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Promotion Dialog */}
            <AnimatePresence>
                {showPromotionDialog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => {
                            setShowPromotionDialog(false);
                            setPendingMove(null);
                        }}
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
                                        onClick={() => handlePromotion(piece as 'q' | 'r' | 'b' | 'n')}
                                        className="p-6 rounded-xl bg-[#FF4D00]/20 hover:bg-[#FF4D00]/30 border border-[#FF4D00]/40 transition-colors"
                                    >
                                        <Icon className="text-4xl text-orange-100 mx-auto mb-2" />
                                        <div className="text-sm text-orange-200/70">{name}</div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GameAnalyzer;