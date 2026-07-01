'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown } from 'react-icons/fi';
import { analyzePgn } from '../utils/server-actions';
import { analyzePgnCrafty } from '../utils/crafty-client';
import { AnalysisResult, EngineChoice } from '../types/types';



interface UploadPGNModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAnalysisStart: () => void;
  onAnalysisComplete: (results: AnalysisResult[], engine: EngineChoice) => void;
}

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
    helper: 'Runs server-side. Handles higher depths comfortably.',
    defaultDepth: 16,
    maxDepth: 40,
  },
  {
    value: 'crafty',
    label: 'Crafty (in-browser WASM)',
    helper: 'Runs locally in your browser. Try 8–12 for a full game.',
    defaultDepth: 10,
    maxDepth: 20,
  },
];

const UploadPGNModal: React.FC<UploadPGNModalProps> = ({
  isVisible,
  onClose,
  onAnalysisStart,
  onAnalysisComplete,
}) => {
  const [pgnText, setPgnText] = useState('');
  const [engine, setEngine] = useState<EngineChoice>('stockfish');
  const [depthValue, setDepthValue] = useState(ENGINE_OPTIONS[0].defaultDepth);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const activeEngine = ENGINE_OPTIONS.find((e) => e.value === engine)!;

  const handleEngineChange = (value: EngineChoice) => {
    setEngine(value);
    const opt = ENGINE_OPTIONS.find((e) => e.value === value)!;
    setDepthValue(opt.defaultDepth);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!pgnText.trim()) {
      setError('Please paste a PGN game.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setProgress(null);

    onAnalysisStart();

    try {
      let results: AnalysisResult[];

      if (engine === 'crafty') {
        // Runs entirely in the browser via a Web Worker wrapping Crafty WASM.
        results = await analyzePgnCrafty(pgnText, depthValue, (_result, index, total) => {
          setProgress({ done: index + 1, total });
        });
      } else {
        // Server-side Stockfish analysis.
        results = await analyzePgn(pgnText, depthValue);
      }

      setStatus('success');
      setPgnText('');
      onAnalysisComplete(results, engine);

      setTimeout(() => {
        onClose();
        setStatus('idle');
        setProgress(null);
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Analysis failed. Please check your PGN format.');
    } finally {
      setLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="relative w-full max-w-lg p-6 rounded-2xl bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute cursor-pointer top-4 right-4 text-[#FF4D00] hover:text-orange-300 transition-colors text-2xl leading-none"
            >
              &times;
            </button>

            <h2 className="text-2xl font-bold text-center mb-2 bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
              Analyze PGN
            </h2>
            <p className="text-sm text-orange-200/70 text-center mb-6">
              Paste your game in PGN format and pick an engine to analyze it.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Engine Selector */}
              <div className="space-y-1.5">
                <label htmlFor="engine-select" className="text-orange-200/80 text-sm font-medium">
                  Engine
                </label>
                <div className="relative">
                  <select
                    id="engine-select"
                    value={engine}
                    disabled={loading}
                    onChange={(e) => handleEngineChange(e.target.value as EngineChoice)}
                    className="w-full appearance-none px-4 py-3 pr-10 bg-black/40 border border-[#FF4D00]/30 rounded-xl text-orange-100 text-sm font-medium focus:border-[#FF4D00]/60 focus:outline-none transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {ENGINE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-black text-orange-100">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#FF4D00] text-lg" />
                </div>
                <p className="text-xs text-orange-200/40">{activeEngine.helper}</p>
              </div>

              {/* PGN Textarea */}
              <textarea
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                rows={10}
                placeholder="Paste PGN here..."
                disabled={loading}
                className="w-full px-4 py-3 bg-black/40 border border-[#FF4D00]/30 rounded-xl text-orange-100 placeholder:text-orange-200/40 focus:border-[#FF4D00]/60 focus:outline-none text-sm resize-none disabled:opacity-50"
              />

              {/* Analysis Configuration */}
              <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-[#FF4D00]/10 w-fit">
                <label htmlFor="depth-input" className="text-orange-200/80 text-sm font-medium">
                  Analysis Depth:
                </label>
                <input
                  id="depth-input"
                  type="number"
                  min={1}
                  max={activeEngine.maxDepth}
                  disabled={loading}
                  value={depthValue}
                  onChange={(e) => setDepthValue(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded bg-black/50 border border-[#FF4D00]/30 text-orange-100 text-sm focus:border-[#FF4D00]/60 focus:outline-none transition-colors disabled:opacity-50 text-center font-semibold"
                />
              </div>
              {engine === 'crafty' && (
                <p className="text-xs text-orange-200/40 -mt-3">
                  Higher depths run noticeably slower in-browser than on a native engine — try 8–12 for a full game.
                </p>
              )}

              {/* Progress (Crafty only — Stockfish resolves server-side in one shot) */}
              {loading && engine === 'crafty' && progress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-orange-200/60">
                    <span>Analyzing position {progress.done} of {progress.total}</span>
                    <span>{Math.round((progress.done / progress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                    <motion.div
                      className="h-full bg-linear-to-r from-[#FF4D00] to-[#FF0000]"
                      animate={{ width: `${(progress.done / progress.total) * 100}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="text-[#FF0000] text-sm text-center font-medium bg-red-950/30 py-2 px-3 rounded-lg border border-red-500/20">
                  {error}
                </div>
              )}

              {/* Success message */}
              {status === 'success' && (
                <div className="text-green-400 text-center font-medium text-sm bg-green-950/30 py-2 px-3 rounded-lg border border-green-500/20">
                  Analysis completed successfully!
                </div>
              )}

              {/* Submit button */}
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-linear-to-r from-[#FF4D00] to-[#FF0000] text-white font-bold shadow-lg shadow-[#FF4D00]/30 hover:shadow-[#FF4D00]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Computing Engine Moves...
                  </>
                ) : (
                  'Analyze Game'
                )}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UploadPGNModal;