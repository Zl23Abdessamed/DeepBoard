"use client"

import { RootState } from '@/app/redux/store';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useMemo, useState, Suspense, useEffect } from 'react';
import type { ChessboardOptions, PieceRenderObject } from 'react-chessboard';
import { useSelector } from 'react-redux';

const LazyChessboard = dynamic(() =>
  import('react-chessboard').then((mod) => ({
    default: mod.Chessboard,
  })), { ssr: false }
);

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

const randomSquare = (exclude?: string) => {
  let square = '';
  do {
    const file = files[Math.floor(Math.random() * files.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    square = `${file}${rank}`;
  } while (exclude && square === exclude);
  return square;
};

const generateLocalPieces = (style: string) => {
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
          style={{ width: squareWidth, height: squareWidth, objectFit: 'contain' }}
          draggable={true}
        />
      ),
    ])
  ) as PieceRenderObject;
};

const TrainingClickSquares: React.FC = () => {
  const reduxBoard = useSelector((state: RootState) => state.boardSettings);

  const [targetSquare, setTargetSquare] = useState("");
  const [feedback, setFeedback] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [clickedSquare, setClickedSquare] = useState<string | null>(null);
  const boardPieces = useMemo(() => generateLocalPieces('cburnett'), []);

  const handleSquareClick = (square: string) => {
    setAttempts((prev) => prev + 1);
    setClickedSquare(square);
    if (square === targetSquare) {
      setCorrectCount((prev) => prev + 1);
      setFeedback(`Nice! ${square} was the right square.`);
      setTargetSquare(randomSquare(targetSquare));
    } else {
      setFeedback(`Oops, ${square} is not right. Try again.`);
    }
  };

  const boardOptions: ChessboardOptions = {
    id: 'ClickSquareTrainingBoard',
    position: '8/8/8/8/8/8/8/8 w - - 0 1',
    boardOrientation: 'white',
    animationDurationInMs: 150,
    showAnimations: false,
    darkSquareStyle: { backgroundColor: reduxBoard.darkSquareColor },
    lightSquareStyle: { backgroundColor: reduxBoard.lightSquareColor },
    pieces: boardPieces,
    squareStyles: {
      ...(showSolution
        ? {
          [targetSquare]: {
            backgroundColor: 'rgba(255, 77, 0, 0.8)',
            boxShadow: 'inset 0 0 0 4px rgba(255, 77, 0, 0.8)',
          },
        }
        : {}),
      ...(clickedSquare && clickedSquare !== targetSquare
        ? {
          [clickedSquare]: {
            boxShadow: 'inset 0 0 0 4px rgba(255, 0, 0, 0.9)',
          },
        }
        : {}),
    },
    onSquareClick: ({ square }) => handleSquareClick(square),
  };

  useEffect(() => {
    setTargetSquare(randomSquare());
  }, []);

  return (
    <div className="bg-black text-white min-h-screen p-6 flex items-center justify-center overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
            Click Square Training
          </h1>
          <Link
            href="/main"
            className="px-4 py-2 rounded-full border border-[#FF4D00]/50 text-[#FF4D00] hover:bg-[#FF4D00]/10 transition-colors text-sm font-medium"
          >
            Back Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Info card */}
          <div className="p-6 rounded-2xl backdrop-blur-sm bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 space-y-5">
            <h2 className="text-xl font-semibold text-orange-100">Target Square</h2>
            <div className="text-5xl md:text-6xl font-black text-[#FF4D00]">{targetSquare}</div>
            <p className="text-sm text-orange-200/80">
              Click the matching square on the board below.
            </p>

            <button
              type="button"
              onClick={() => setShowSolution((prev) => !prev)}
              className="px-4 py-3 rounded-xl bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 transition-colors"
            >
              {showSolution ? 'Hide solution' : 'Show solution'}
            </button>

            {feedback && (
              <div className="text-sm text-orange-200/90 bg-black/30 px-3 py-2 rounded-lg">
                {feedback}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm text-orange-200/80">
              <div>
                <span className="text-orange-400 font-semibold">{correctCount}</span> correct clicks
              </div>
              <div>
                <span className="text-orange-400 font-semibold">{attempts}</span> attempts
              </div>
            </div>
          </div>

          {/* Board card */}
          <div className="p-6 rounded-2xl backdrop-blur-sm bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30">
            <h2 className="text-xl font-semibold mb-4 text-orange-100">Board</h2>
            <div className="rounded-2xl overflow-hidden border border-[#FF4D00]/20 bg-black/20">
              <Suspense
                fallback={
                  <div className="aspect-square flex items-center justify-center text-orange-200/70">
                    Loading board...
                  </div>
                }
              >
                <LazyChessboard options={boardOptions} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingClickSquares;