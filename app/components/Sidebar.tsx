"use client"

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMenu,
  FiX,
  FiPlay,
  FiGrid,
  FiAward,
  FiTarget,
  FiDroplet,
  FiVideo,
  FiLogOut,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { IoIosAnalytics } from 'react-icons/io';
import { FaChess } from 'react-icons/fa';
import { FaChessBoard } from 'react-icons/fa6';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BoardSettingsPanel from './BoardSettingsPanel';
import { GiArtificialHive } from "react-icons/gi";

interface Route {
  path: string;
  icon: React.ElementType;
  label: string;
  chess: string;
}

const MotionLink = motion(Link);

// ---------- Shared routes ----------
const routes: Route[] = [
  { path: '/main/game-analysis', icon: IoIosAnalytics, label: 'Games Analyzer', chess: '♘' },
  { path: '/main/play', icon: FiPlay, label: 'Play Vs Bots', chess: '♞' },
  { path: '/main/puzzles-streak', icon: FiAward, label: 'Puzzle Streak', chess: '♟' },
  { path: '/main/puzzles-sets', icon: FiGrid, label: 'Puzzle Sets', chess: '♜' },
  { path: '/main/squares-training/coordinations', icon: FiTarget, label: 'Squares Coordinations', chess: '♝' },
  { path: '/main/squares-training/colors', icon: FiDroplet, label: 'Squares Colors', chess: '♛' },
  { path: '/main/ai-chat-bot', icon: GiArtificialHive, label: 'AI Chat Bot', chess: '♛' },
  { path: '/main/test', icon: GiArtificialHive, label: 'Test', chess: '♛' },
  { path: '/main/tutorials', icon: FiVideo, label: 'Tutorials', chess: '♚' },
];

// ==========================================================
// MOBILE SIDEBAR — floating hamburger + full-screen overlay
// Board settings button floats independently at bottom-left
// ==========================================================
const MobileSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const pathname = usePathname();

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Floating hamburger — bottom-right */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-[#FF4D00] to-[#FF0000] rounded-full shadow-lg shadow-[#FF4D00]/30 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <FiMenu className="text-white text-2xl" />
      </motion.button>

      {/* Floating board settings — bottom-left */}
      <motion.button
        className="fixed bottom-6 left-6 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        aria-label="Board settings"
      >
        <span className="absolute inset-0 w-full h-full rounded-full bg-[#FF4D00] animate-ping opacity-30" />
        <span className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-[#FF4D00] to-[#FF0000] rounded-full shadow-lg shadow-[#FF4D00]/30">
          <FaChessBoard className="text-white text-xl" />
        </span>
      </motion.button>

      {/* Full-screen nav overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col"
          >
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button onClick={closeMenu} className="text-[#FF4D00] p-2">
                <FiX size={28} />
              </button>
            </div>

            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <FaChess className="text-3xl text-[#FF4D00]" />
              <span className="text-2xl font-bold bg-gradient-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
                Z-Chess
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-6 overflow-y-auto">
              <div className="space-y-2">
                {routes.map((route) => {
                  const isActive = pathname === route.path;
                  const Icon = route.icon;
                  return (
                    <MotionLink
                      key={route.path}
                      href={route.path}
                      onClick={closeMenu}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-[#FF4D00]/20 to-[#FF0000]/20 border border-[#FF4D00]/40'
                          : 'hover:bg-[#FF4D00]/10 border border-transparent'
                      }`}
                    >
                      <Icon className={`text-xl ${isActive ? 'text-[#FF4D00]' : 'text-orange-300/70'}`} />
                      <span className={`text-sm font-medium ${isActive ? 'text-orange-100' : 'text-orange-200/70'}`}>
                        {route.label}
                      </span>
                    </MotionLink>
                  );
                })}
              </div>
            </nav>

            {/* Logout */}
            <div className="p-6 border-t border-[#FF4D00]/20">
              <button
                onClick={closeMenu}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#FF4D00]/10 border border-transparent text-orange-200/70 hover:text-orange-100 transition-all"
              >
                <FiLogOut className="text-xl" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board settings panel — rendered outside the overlay so it persists */}
      <BoardSettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

// ==========================================================
// DESKTOP SIDEBAR
// forcedCollapsed=true  → always collapsed, no toggle (tablet/sm)
// forcedCollapsed=false → collapsible freely (md+)
// Board settings button always visible (half-outside the sidebar)
// ==========================================================
const DesktopSidebar: React.FC<{ forcedCollapsed?: boolean }> = ({ forcedCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(forcedCollapsed);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (forcedCollapsed) setIsCollapsed(true);
  }, [forcedCollapsed]);

  const toggleCollapse = useCallback(() => {
    if (forcedCollapsed) return;
    setIsCollapsed((prev) => !prev);
  }, [forcedCollapsed]);

  const sidebarVariants = {
    expanded: { width: '280px' },
    collapsed: { width: '80px' },
  };

  return (
    <motion.aside
      initial={forcedCollapsed ? 'collapsed' : 'expanded'}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative bg-linear-to-b from-black via-gray-900 to-black border-r border-orange-500/20 flex flex-col overflow-visible"
    >
      {/* Header */}
      <div className="p-6 border-b border-orange-500/20 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <FaChess className="text-2xl text-[#FF4D00]" />
              <span className="text-xl font-bold bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
                Z-Chess
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button — hidden when forced collapsed */}
        {!forcedCollapsed && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleCollapse}
            className="text-[#FF4D00] hover:text-orange-300 transition-colors ml-auto"
          >
            {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
          </motion.button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {routes.map((route) => {
            const isActive = pathname === route.path;
            const Icon = route.icon;

            return (
              <MotionLink
                key={route.path}
                href={route.path}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-300 relative overflow-hidden group cursor-pointer
                  ${isActive
                    ? 'bg-linear-to-r from-[#FF4D00]/20 to-[#FF0000]/20 border border-[#FF4D00]/40'
                    : 'hover:bg-[#FF4D00]/10 border border-transparent hover:border-[#FF4D00]/20'
                  }
                `}
              >
                <motion.div
                  className="absolute inset-0 bg-linear-to-r from-[#FF4D00]/10 to-[#FF0000]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={false}
                />

                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xl opacity-5 group-hover:opacity-10 transition-opacity">
                  {route.chess}
                </span>

                <Icon
                  className={`text-xl shrink-0 relative z-10 ${
                    isActive ? 'text-[#FF4D00]' : 'text-orange-300/70 group-hover:text-[#FF4D00]'
                  }`}
                />

                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={`text-sm font-medium relative z-10 ${
                        isActive ? 'text-orange-100' : 'text-orange-200/70 group-hover:text-orange-100'
                      }`}
                    >
                      {route.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </MotionLink>
            );
          })}
        </div>
      </nav>

      {/* Board Settings Button — always visible, half-outside the sidebar edge */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-40"
        aria-label="Board settings"
      >
        <span className="absolute inset-0 w-full h-full rounded-full bg-[#FF4D00] animate-ping opacity-30" />
        <span className="relative flex items-center justify-center w-10 h-10 bg-linear-to-r from-[#FF4D00] to-[#FF0000] rounded-full shadow-lg shadow-[#FF4D00]/30">
          <FaChessBoard className="text-white text-lg" />
        </span>
      </motion.button>

      {/* Logout */}
      <div className="p-4 border-t border-orange-500/20">
        <motion.button
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => console.log('Logout clicked')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#FF4D00]/10 border border-transparent hover:border-[#FF4D00]/20 transition-all group"
        >
          <FiLogOut className="text-xl text-orange-300/70 group-hover:text-[#FF4D00] shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm font-medium text-orange-200/70 group-hover:text-orange-100"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Settings Panel */}
      <BoardSettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </motion.aside>
  );
};

// ==========================================================
// MAIN SIDEBAR — responsive router
//
// Breakpoints (matching Tailwind defaults):
//   < 640px  → phone   → MobileSidebar (floating hamburger + floating settings)
//   640–767px → sm     → DesktopSidebar forcedCollapsed (icons only, no toggle)
//   ≥ 768px  → md+    → DesktopSidebar normal (collapsible)
// ==========================================================
const Sidebar: React.FC = () => {
  const [screenSize, setScreenSize] = useState<'phone' | 'sm' | 'desktop'>('desktop');

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setScreenSize('phone');
      else if (w < 768) setScreenSize('sm');
      else setScreenSize('desktop');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (screenSize === 'phone') return <MobileSidebar />;
  return <DesktopSidebar forcedCollapsed={screenSize === 'sm'} />;
};

export default Sidebar;