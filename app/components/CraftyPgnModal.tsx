'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzePgnCrafty, type CraftyAnalysisResult } from '../utils/crafty-client';

interface UploadPGNModalCraftyProps {
  isVisible: boolean;
  onClose: () => void;
  onAnalysisStart: () => void;
  onAnalysisComplete: (results: CraftyAnalysisResult[]) => void;
}

const UploadPGNModalCrafty: React.FC<UploadPGNModalCraftyProps> = ({
  isVisible,
  onClose,
  onAnalysisStart,
  onAnalysisComplete,
}) => {
  const [pgnText, setPgnText] = useState('');
  const [depthValue, setDepthValue] = useState(10); // Crafty is single-threaded WASM in-browser; default lower than the SF default of 16.
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

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
      // Runs entirely in the browser via a Web Worker wrapping Crafty WASM —
      // there's no network round trip per move like the server-action path.
      const results = await analyzePgnCrafty(pgnText, depthValue, (_result, index, total) => {
        setProgress({ done: index + 1, total });
      });

      setStatus('success');
      setPgnText('');
      onAnalysisComplete(results);

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
            className="relative w-full max-w-lg p-6 rounded-2xl bg-linear-to-br from-purple-600/10 to-indigo-600/10 border border-purple-500/30 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute cursor-pointer top-4 right-4 text-purple-400 hover:text-purple-200 transition-colors text-2xl leading-none"
            >
              &times;
            </button>

            <h2 className="text-2xl font-bold text-center mb-2 bg-linear-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Analyze PGN — Crafty Engine
            </h2>
            <p className="text-sm text-purple-200/70 text-center mb-6">
              Paste your game in PGN format. Analysis runs locally in your browser via WASM.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* PGN Textarea */}
              <textarea
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                rows={10}
                placeholder="Paste PGN here..."
                disabled={loading}
                className="w-full px-4 py-3 bg-black/40 border border-purple-500/30 rounded-xl text-purple-100 placeholder:text-purple-200/40 focus:border-purple-400/60 focus:outline-none text-sm resize-none disabled:opacity-50"
              />

              {/* Analysis Configuration */}
              <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-purple-500/10 w-fit">
                <label htmlFor="crafty-depth-input" className="text-purple-200/80 text-sm font-medium">
                  Analysis Depth:
                </label>
                <input
                  id="crafty-depth-input"
                  type="number"
                  min={1}
                  max={20}
                  disabled={loading}
                  value={depthValue}
                  onChange={(e) => setDepthValue(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded bg-black/50 border border-purple-500/30 text-purple-100 text-sm focus:border-purple-400/60 focus:outline-none transition-colors disabled:opacity-50 text-center font-semibold"
                />
              </div>
              <p className="text-xs text-purple-200/40 -mt-3">
                Higher depths run noticeably slower in-browser than on a native engine — try 8–12 for a full game.
              </p>

              {/* Progress */}
              {loading && progress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-purple-200/60">
                    <span>Analyzing position {progress.done} of {progress.total}</span>
                    <span>{Math.round((progress.done / progress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                    <motion.div
                      className="h-full bg-linear-to-r from-purple-500 to-indigo-500"
                      animate={{ width: `${(progress.done / progress.total) * 100}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="text-red-400 text-sm text-center font-medium bg-red-950/30 py-2 px-3 rounded-lg border border-red-500/20">
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
                className="w-full py-3 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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

export default UploadPGNModalCrafty;