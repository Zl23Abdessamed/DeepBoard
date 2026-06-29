"use client"

import { RootState } from '@/app/redux/store';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useMemo, useState, Suspense, useEffect } from 'react';
import type { ChessboardOptions } from 'react-chessboard';
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

const isDarkSquare = (square: string) => {
  const fileIndex = files.indexOf(square[0]);
  const rank = Number(square[1]);
  return (fileIndex + rank) % 2 !== 0;
};

const TrainingColorSquares: React.FC = () => {
  const reduxBoard = useSelector((state: RootState) => state.boardSettings);

  const [currentSquare, setCurrentSquare] = useState("");
  const [feedback, setFeedback] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  const handleAnswer = (choice: 'dark' | 'light') => {
    const correct = isDarkSquare(currentSquare) ? 'dark' : 'light';
    setAttempts((prev) => prev + 1);
    if (choice === correct) {
      setFeedback(`Correct! ${currentSquare} is ${correct}.`);
      setCorrectCount((prev) => prev + 1);
      setCurrentSquare(randomSquare(currentSquare));
    } else {
      setFeedback(`Wrong — ${currentSquare} is ${correct}. Try again.`);
    }
  };

  const squareStyles = useMemo(
    () =>
      showSolution
        ? {
          [currentSquare]: {
            backgroundColor: 'rgba(255, 77, 0, 0.75)',
            boxShadow: 'inset 0 0 0 4px rgba(255, 77, 0, 0.85)',
          },
        }
        : {},
    [currentSquare, showSolution]
  );

  const boardOptions: ChessboardOptions = useMemo(
    () => ({
      id: 'ColorSquareTrainingBoard',
      position: '8/8/8/8/8/8/8/8 w - - 0 1',
      boardOrientation: 'white',
      animationDurationInMs: 200,
      showAnimations: true,
      darkSquareStyle: { backgroundColor: reduxBoard.darkSquareColor },
      lightSquareStyle: { backgroundColor: reduxBoard.lightSquareColor },
      arePiecesDraggable: false,
      squareStyles,
    }),
    [squareStyles, reduxBoard.darkSquareColor, reduxBoard.lightSquareColor]
  );

  useEffect(() => {
    setCurrentSquare(randomSquare());
  }, []);

    return (
    <div className="bg-black text-white min-h-screen p-6 flex items-center justify-center overflow-hidden">
      {/* Background glows unchanged */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
            Color Square Training
          </h1>
          <Link
            href="/main"
            className="px-4 py-2 rounded-full border border-[#FF4D00]/50 text-[#FF4D00] hover:bg-[#FF4D00]/10 transition-colors text-sm font-medium"
          >
            Back Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls card – compact on mobile */}
          <div className="p-4 md:p-6 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 space-y-4">
            <h2 className="text-lg md:text-xl font-semibold text-orange-100">
              Current Square
            </h2>
            <div className="text-4xl md:text-6xl font-black text-[#FF4D00]">
              {currentSquare}
            </div>

            <div className="flex flex-wrap gap-2 md:gap-3">
              <button
                onClick={() => handleAnswer('dark')}
                className="flex-1 min-w-[80px] px-3 py-2 md:px-4 md:py-3 rounded-xl bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 transition-colors text-sm"
              >
                Dark
              </button>
              <button
                onClick={() => handleAnswer('light')}
                className="flex-1 min-w-[80px] px-3 py-2 md:px-4 md:py-3 rounded-xl bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 transition-colors text-sm"
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setShowSolution((prev) => !prev)}
                className="px-3 py-2 md:px-4 md:py-3 rounded-xl bg-black/40 border border-[#FF4D00]/30 hover:bg-[#FF4D00]/20 text-orange-100 transition-colors text-sm"
              >
                {showSolution ? 'Hide' : 'Show'}
              </button>
            </div>

            {feedback && (
              <div className="text-xs md:text-sm text-orange-200/90 bg-black/30 px-3 py-2 rounded-lg">
                {feedback}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs md:text-sm text-orange-200/80">
              <div>
                <span className="text-orange-400 font-semibold">{correctCount}</span> correct
              </div>
              <div>
                <span className="text-orange-400 font-semibold">{attempts}</span> attempts
              </div>
            </div>
          </div>

          {/* Board card – unchanged (already responsive) */}
          <div className="p-4 md:p-6 rounded-2xl backdrop-blur-sm bg-gradient-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30">
            <h2 className="text-lg md:text-xl font-semibold mb-4 text-orange-100">Board</h2>
            <div className="rounded-2xl overflow-hidden border border-[#FF4D00]/20 bg-black/20 max-w-[90vw] md:max-w-[400px] mx-auto">
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

export default TrainingColorSquares;