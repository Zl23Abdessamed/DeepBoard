"use client";

import React, { useState, useMemo } from "react";
import { Chess } from "chess.js";
import dynamic from "next/dynamic";
import { useSelector } from "react-redux";
import type { ChessboardOptions, PieceRenderObject } from "react-chessboard";
import { getAllPositionalThemes } from "@/app/lib/theme-detector";
import { RootState } from "@/app/redux/store";

// Lazy-load the Chessboard component (SSR disabled)
const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  { ssr: false }
);

// Helper to generate piece images (identical to GameAnalyzer)
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

export default function TestThemesPage() {
  // Read board appearance settings from Redux (same as GameAnalyzer)
  const boardSettings = useSelector((state: RootState) => state.boardSettings);

  const [pgn, setPgn] = useState("");
  const [fenHistory, setFenHistory] = useState<string[]>([]);
  const [moveIndex, setMoveIndex] = useState(-1); // -1 = initial board
  const [themeResult, setThemeResult] = useState<any>(null);
  const [error, setError] = useState("");

  const loadPgn = () => {
    setError("");
    setThemeResult(null);
    try {
      const chess = new Chess();
      chess.loadPgn(pgn.trim());
      const allMoves = chess.history({ verbose: true });

      const temp = new Chess();
      const fens = [temp.fen()];
      for (const move of allMoves) {
        temp.move(move.san);
        fens.push(temp.fen());
      }

      setFenHistory(fens);
      setMoveIndex(0);
    } catch (err: any) {
      setError("Invalid PGN: " + err.message);
      setFenHistory([]);
      setMoveIndex(-1);
    }
  };

  const currentFen = fenHistory[moveIndex] ?? "";

  const goToMove = (index: number) => {
    if (index >= 0 && index < fenHistory.length) {
      setMoveIndex(index);
      setThemeResult(null);
    }
  };

  const runAnalysis = () => {
    if (!currentFen) return;
    try {
      const chess = new Chess(currentFen);
      const result = getAllPositionalThemes(chess);
      setThemeResult(result);
    } catch (err: any) {
      setError("Analysis error: " + err.message);
    }
  };

  // Board pieces (memoized based on Redux piece style)
  const boardPieces = useMemo(
    () => generateLocalPieces(boardSettings.pieceStyle),
    [boardSettings.pieceStyle]
  );

  // Build ChessboardOptions exactly like GameAnalyzer does
  const boardOptions: ChessboardOptions = useMemo(
    () => ({
      id: "TestThemesBoard",
      position: currentFen,
      boardOrientation: "white",
      arePiecesDraggable: false,
      customBoardStyle: {
        borderRadius: "4px",
      },
      darkSquareStyle: { backgroundColor: boardSettings.darkSquareColor },
      lightSquareStyle: { backgroundColor: boardSettings.lightSquareColor },
      pieces: boardPieces,
    }),
    [currentFen, boardPieces, boardSettings]
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-orange-400">
        Positional Themes Tester
      </h1>

      {/* PGN input */}
      <div className="max-w-4xl mx-auto mb-6">
        <label className="block text-sm mb-1">Paste PGN:</label>
        <textarea
          className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono"
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          placeholder="1. e4 e5 2. Nf3 Nc6 ..."
        />
        <button
          onClick={loadPgn}
          className="mt-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold"
        >
          Load PGN
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Board + Navigation */}
      {fenHistory.length > 0 && (
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-[min(80vw,400px)] aspect-square">
              <Chessboard options={boardOptions} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button
                onClick={() => goToMove(0)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                disabled={moveIndex === 0}
              >
                ⏮ Start
              </button>
              <button
                onClick={() => goToMove(moveIndex - 1)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                disabled={moveIndex <= 0}
              >
                ◀ Prev
              </button>
              <span className="text-gray-300">
                Move {moveIndex}/{fenHistory.length - 1}
              </span>
              <button
                onClick={() => goToMove(moveIndex + 1)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                disabled={moveIndex >= fenHistory.length - 1}
              >
                Next ▶
              </button>
              <button
                onClick={() => goToMove(fenHistory.length - 1)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                disabled={moveIndex === fenHistory.length - 1}
              >
                End ⏭
              </button>
            </div>
          </div>

          <div className="flex-1">
            <button
              onClick={runAnalysis}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold mb-4"
            >
              Analyse Current Position
            </button>

            {themeResult && (
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 max-h-[600px] overflow-y-auto">
                <h2 className="text-lg font-bold text-orange-300 mb-2">Results</h2>
                <pre className="text-sm text-gray-200 whitespace-pre-wrap">
                  {JSON.stringify(themeResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}