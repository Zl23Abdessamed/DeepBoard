import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzePgn } from '../utils/server-actions';
// Adjust this import path to match your file structure

interface UploadPGNModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAnalysisStart: () => void;
  onAnalysisComplete: (results: any[]) => void;
}

const UploadPGNModal: React.FC<UploadPGNModalProps> = ({
  isVisible,
  onClose,
  onAnalysisStart,
  onAnalysisComplete,
}) => {
  const [pgnText, setPgnText] = useState('');
  const [depthValue, setDepthValue] = useState(16);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!pgnText.trim()) {
      setError('Please paste a PGN game.');
      return;
    }
    
    setLoading(true);
    setStatus('idle');
    
    // Notify parent component that calculation has begun
    onAnalysisStart();

    try {
      // Execute server-side analysis with chosen depth
      const results = await analyzePgn(pgnText, depthValue);
      
      setStatus('success');
      setPgnText('');
      
      // Pass the computed chess engine metrics back to parent dashboard
      onAnalysisComplete(results);
      
      setTimeout(() => {
        onClose();
        setStatus('idle');
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
              Paste your game in PGN format for Stockfish server-side analysis.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  max={40}
                  disabled={loading}
                  value={depthValue}
                  onChange={(e) => setDepthValue(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded bg-black/50 border border-[#FF4D00]/30 text-orange-100 text-sm focus:border-[#FF4D00]/60 focus:outline-none transition-colors disabled:opacity-50 text-center font-semibold"
                />
              </div>

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