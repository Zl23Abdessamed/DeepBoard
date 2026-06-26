// components/BoardSettingsPanel.tsx
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { setPieceStyle, setBoardColors, setLightSquareColor, setDarkSquareColor } from '../redux/board-settings-slice';
import { RootState } from '../redux/store';

interface BoardSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_THEMES = [
  { name: 'Classic', light: '#eeeed2', dark: '#769656' },
  { name: 'Lichess', light: '#f0d9b5', dark: '#b58863' },
  { name: 'Wikipedia', light: '#fff', dark: '#d18b47' },
  { name: 'Green', light: '#e8e8b8', dark: '#77a366' },
  { name: 'Blue', light: '#dee3e6', dark: '#8ca2ad' },
  { name: 'Purple', light: '#e0d4f5', dark: '#b98cd5' },
  { name: 'Wood', light: '#d7b899', dark: '#8b5a2b' },
  { name: 'Tournament', light: '#ebdbb2', dark: '#cc9966' },
];

const PIECE_STYLES = [
  'cburnett', 'merida', 'alpha', 'staunty', 'tatiana',
  'horsey', 'cardinal', 'governor', 'pirouetti', 'fantasy',
  'pixel', 'spatial', 'california', 'kosal', 'fresca'
];

const BoardSettingsPanel: React.FC<BoardSettingsPanelProps> = ({ isOpen, onClose }) => {
  const boardSettings = useSelector((state: RootState) => state.boardSettings);
  const dispatch = useDispatch();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Global styles for the scrollbar – scoped to the panel via class */}
          <style jsx global>{`
            .settings-panel-scroll::-webkit-scrollbar {
              width: 3px !important;
            }
            .settings-panel-scroll::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.3) !important;
              border-radius: 10px !important;
            }
            .settings-panel-scroll::-webkit-scrollbar-thumb {
              background: #FF4D00 !important;
              border-radius: 10px !important;
              box-shadow: 0 0 6px rgba(255, 77, 0, 0.5) !important;
            }
            .settings-panel-scroll::-webkit-scrollbar-thumb:hover {
              background: #FF6A33 !important;
            }
            /* Firefox */
            .settings-panel-scroll {
              scrollbar-width: thin !important;
              scrollbar-color: #FF4D00 rgba(0, 0, 0, 0.3) !important;
            }
          `}</style>

          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 z-50 h-full bg-gradient-to-b from-black/95 via-gray-900/95 to-black/95 backdrop-blur-2xl border-r border-[#FF4D00]/20 overflow-y-auto settings-panel-scroll"
            style={{ width: '280px' }} // Original width restored
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold bg-gradient-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
                  Board Settings
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-black/40 border border-[#FF4D00]/20 text-[#FF4D00] hover:text-white hover:bg-[#FF4D00] transition-all"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Piece Style */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-orange-200/80 mb-3">
                  Piece Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PIECE_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => dispatch(setPieceStyle(style))}
                      className={`relative p-2 rounded-lg border transition-all group ${
                        boardSettings.pieceStyle === style
                          ? 'bg-[#FF4D00]/20 border-[#FF4D00]'
                          : 'bg-black/30 border-[#FF4D00]/10 hover:border-[#FF4D00]/40'
                      }`}
                    >
                      <div className="w-full h-12 flex items-center justify-center mb-1">
                        <img
                          src={`/piece/${style}/wK.svg`}
                          alt={style}
                          className="h-8 object-contain"
                        />
                      </div>
                      <span className="text-xs text-orange-100/80 capitalize">{style}</span>
                      {boardSettings.pieceStyle === style && (
                        <motion.div
                          layoutId="activePiece"
                          className="absolute inset-0 border-2 border-[#FF4D00] rounded-lg pointer-events-none"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Themes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-orange-200/80 mb-3">
                  Preset Themes
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() =>
                        dispatch(setBoardColors({ light: theme.light, dark: theme.dark }))
                      }
                      className={`p-2 rounded-lg border transition-all ${
                        boardSettings.lightSquareColor === theme.light &&
                        boardSettings.darkSquareColor === theme.dark
                          ? 'bg-[#FF4D00]/20 border-[#FF4D00]'
                          : 'bg-black/30 border-[#FF4D00]/10 hover:border-[#FF4D00]/40'
                      }`}
                    >
                      <div
                        className="grid grid-cols-4 rounded overflow-hidden w-full aspect-square mb-1"
                        style={{
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gridTemplateRows: 'repeat(2, 1fr)',
                        }}
                      >
                        <div style={{ backgroundColor: theme.light }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.light }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.light }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.light }} />
                      </div>
                      <span className="text-[10px] text-orange-100/80 leading-tight">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div>
                <label className="block text-sm font-medium text-orange-200/80 mb-3">
                  Custom Colors
                </label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-orange-200/60 mb-1 block">Light</label>
                    <input
                      type="color"
                      value={boardSettings.lightSquareColor}
                      onChange={(e) => dispatch(setLightSquareColor(e.target.value))}
                      className="w-full h-10 rounded bg-black/40 border border-[#FF4D00]/20 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-orange-200/60 mb-1 block">Dark</label>
                    <input
                      type="color"
                      value={boardSettings.darkSquareColor}
                      onChange={(e) => dispatch(setDarkSquareColor(e.target.value))}
                      className="w-full h-10 rounded bg-black/40 border border-[#FF4D00]/20 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BoardSettingsPanel;