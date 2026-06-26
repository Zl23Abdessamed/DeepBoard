"use client"

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
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
import { IoIosAnalytics } from "react-icons/io";
import { FaChess } from 'react-icons/fa';
import { FaChessBoard } from 'react-icons/fa6';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BoardSettingsPanel from './BoardSettingsPanel';

interface Route {
  path: string;
  icon: React.ElementType;
  label: string;
  chess: string;
}

const MotionLink = motion(Link);

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const pathname = usePathname();

  const routes: Route[] = [
    // { path: '/main', icon: FiHome, label: 'Dashboard', chess: '♔' },
    { path: '/main/game-analysis', icon: IoIosAnalytics, label: 'Games Analyzer', chess: '♘' },
    { path: '/main/play', icon: FiPlay, label: 'Play Vs Bots', chess: '♞' },
    { path: '/main/puzzles-streak', icon: FiAward, label: 'Puzzle Streak', chess: '♟' },
    { path: '/main/puzzles-sets', icon: FiGrid, label: 'Puzzle Sets', chess: '♜' },
    { path: '/main/squares-training/coordinations', icon: FiTarget, label: 'Squares Coordinations', chess: '♝' },
    { path: '/main/squares-training/colors', icon: FiDroplet, label: 'Squares Colors', chess: '♛' },
    { path: '/main/tutorials', icon: FiVideo, label: 'Tutorials', chess: '♚' },
  ];

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const sidebarVariants = {
    expanded: { width: '280px' },
    collapsed: { width: '80px' },
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  return (
    <motion.aside
      initial="expanded"
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

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleCollapse}
          className="text-[#FF4D00] hover:text-orange-300 transition-colors ml-auto"
        >
          {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
        </motion.button>
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
                  className={`text-xl shrink-0 relative z-10 ${isActive ? 'text-[#FF4D00]' : 'text-orange-300/70 group-hover:text-[#FF4D00]'
                    }`}
                />

                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={`text-sm font-medium relative z-10 ${isActive ? 'text-orange-100' : 'text-orange-200/70 group-hover:text-orange-100'
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

      {/* Board Settings Toggle Button – half outside the sidebar */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-40"
        aria-label="Board settings"
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 w-full h-full rounded-full bg-[#FF4D00] animate-ping opacity-30" />
        {/* Button */}
        <span className="relative flex items-center justify-center w-10 h-10 bg-linear-to-r from-[#FF4D00] to-[#FF0000] rounded-full shadow-lg shadow-[#FF4D00]/30">
          <FaChessBoard className="text-white text-lg" />
        </span>
      </motion.button>

      {/* Logout */}
      <div className="p-4 border-t border-orange-500/20">
        <motion.button
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
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

export default Sidebar;