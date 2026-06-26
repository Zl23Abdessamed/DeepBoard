"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiMenu, FiX, FiZap,FiTrendingUp,
  FiArrowRight, FiDownload, FiVideo, FiGrid
} from 'react-icons/fi';
import {
  FaChess, FaRobot, FaChessKnight, FaChessQueen,
  FaChessPawn, FaTwitter, FaGithub, FaDiscord
} from 'react-icons/fa';
import { GiChessKing, GiChessRook } from 'react-icons/gi';

const ZChessLanding: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Floating chess pieces for background
  const chessPieces = ['♔', '♕', '♖', '♗', '♘', '♙'];

  return (
    <div className="bg-black text-white min-h-screen overflow-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed w-full z-50 backdrop-blur-md bg-black/30 border-b border-[#FF4D00]/20"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 text-2xl font-bold"
          >
            <FaChess className="text-[#FF4D00]" />
            <span className="bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
              Z-Chess
            </span>
          </motion.div>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            {['Home', 'Features', 'Coaches', 'Build'].map((item) => (
              <motion.a
                key={item}
                href={`#${item.toLowerCase()}`}
                whileHover={{ scale: 1.1 }}
                className="text-orange-200 hover:text-[#FF4D00] transition-colors"
              >
                {item}
              </motion.a>
            ))}
          </div>

          <motion.a
            href="/auth/signin"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden md:block px-6 py-2 bg-linear-to-r from-[#FF4D00] to-[#FF0000] rounded-full font-semibold"
          >
            Sign In
          </motion.a>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-[#FF4D00]"
          >
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden bg-black/90 backdrop-blur-lg border-t border-[#FF4D00]/20"
          >
            <div className="px-6 py-4 space-y-4">
              {['Home', 'Features', 'Coaches', 'Build'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="block text-orange-200 hover:text-[#FF4D00]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </motion.nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

          {/* Floating Chess Pieces */}
          {chessPieces.map((piece, index) => (
            <motion.div
              key={index}
              className="absolute text-6xl opacity-10"
              style={{
                left: `${(index * 15) % 90}%`,
                top: `${(index * 20) % 80}%`,
              }}
              animate={{
                y: [0, -30, 0],
                rotate: [0, 10, -10, 0],
                opacity: [0.05, 0.15, 0.05]
              }}
              transition={{
                duration: 8 + index,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.5
              }}
            >
              {piece}
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex justify-center mb-6">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <FaChessKnight className="text-8xl text-[#FF4D00] drop-shadow-2xl" />
              </motion.div>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent leading-tight">
              Master Chess
              <br />
              Studies
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl md:text-2xl text-orange-200/80 mb-8 max-w-2xl mx-auto"
          >
            AI coaching, custom puzzle sets, and the best video tutorials.
            Study with Stockfish, Lc0, Berserk, and Ethereal — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-linear-to-r from-[#FF4D00] to-[#FF0000] rounded-full font-semibold text-lg shadow-lg shadow-[#FF4D00]/50 flex items-center gap-2"
            >
              Start Studying Free <FiArrowRight />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 border-2 border-[#FF4D00] rounded-full font-semibold text-lg hover:bg-[#FF4D00]/10 transition-colors"
            >
              Watch Demo
            </motion.button>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16"
          >
            {[
              { label: 'AI Engines', value: '4' },
              { label: 'Puzzle Themes', value: '70+' },
              { label: 'Chess Openings variations', value: '1500+' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-[#FF4D00]">{stat.value}</div>
                <div className="text-sm text-orange-200/60">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-4 bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
              Study Smarter
            </h2>
            <p className="text-orange-200/70 text-lg">
              Everything you need to elevate your chess understanding
            </p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: FiZap,
                title: 'Lightning Analysis',
                description: 'Instant Stockfish evaluation with configurable depth. See the best moves in milliseconds.',
                chess: '♜'
              },
              {
                icon: FaRobot,
                title: 'AI Coaching',
                description: 'Gemini-powered explanations in plain English. Understand every mistake and the reasoning behind each move.',
                chess: '♝'
              },
              {
                icon: FiTrendingUp,
                title: 'Progress Dashboard',
                description: 'Rating trends, puzzle accuracy, time spent. All your stats beautifully visualised.',
                chess: '♞'
              },
              {
                icon: FiGrid,
                title: 'Custom Puzzle Sets',
                description: 'Build sets by theme, rating, or opening. Train exactly what you need, when you need it.',
                chess: '♟'
              },
              {
                icon: FiVideo,
                title: 'Video Tutorials',
                description: 'Curated playlists from top coaches. Learn openings, endgames, and strategy at your own pace.',
                chess: '♛'
              },
              {
                icon: FiDownload,
                title: 'Export & Share',
                description: 'Download PGN, FEN, and analysis reports. Share your studies with friends and coaches.',
                chess: '♚'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative p-8 rounded-2xl backdrop-blur-sm bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/20 hover:border-[#FF4D00]/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-linear-to-br from-[#FF4D00]/5 to-[#FF0000]/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:opacity-30 transition-opacity">
                  {feature.chess}
                </div>
                <feature.icon className="text-5xl text-[#FF4D00] mb-4 relative z-10" />
                <h3 className="text-2xl font-bold mb-3 text-orange-100 relative z-10">{feature.title}</h3>
                <p className="text-orange-200/70 relative z-10">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Coaches / Engines Section */}
      <section id="coaches" className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-4 bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
              Your AI Coaches
            </h2>
            <p className="text-orange-200/70 text-lg">
              Four world-class engines, each with a unique style
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: FaChessKnight, title: 'Stockfish', desc: 'The legendary open-source engine. Deep, precise, and endlessly configurable.', color: 'from-[#FF4D00]/20' },
              { icon: FaChessQueen, title: 'Lc0', desc: 'Neural network creativity. Human-like play and positional genius.', color: 'from-[#FF0000]/20' },
              { icon: FaChessPawn, title: 'Berserk', desc: 'Aggressive, tactical, and lightning fast. Punishes the smallest mistake.', color: 'from-[#FF4D00]/30' },
              { icon: GiChessRook, title: 'Ethereal', desc: 'Balanced and deadly in the endgame. A perfect training partner.', color: 'from-[#FF0000]/30' }
            ].map((mode, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, rotate: 1 }}
                className={`p-6 rounded-xl bg-linear-to-br ${mode.color} to-transparent border border-[#FF4D00]/30 hover:border-[#FF4D00]/60 transition-all`}
              >
                <mode.icon className="text-4xl text-[#FF4D00] mb-4" />
                <h3 className="text-xl font-bold text-orange-100 mb-2">{mode.title}</h3>
                <p className="text-orange-200/70 text-sm">{mode.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Puzzle Sets Section */}
      <section id="build" className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
                Build Your Own Puzzle Sets
              </h2>
              <p className="text-orange-100/90 text-lg mb-6">
                Stop solving random puzzles. Create training sets that match your exact needs —
                by theme, rating, or even your favourite openings.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Choose from 50+ tactical themes (fork, pin, skewer, etc.)',
                  'Filter by rating range (500 – 2500 ELO)',
                  'Select specific openings (Sicilian, King\'s Indian, Ruy Lopez…)',
                  'Export sets as PGN for use anywhere',
                  'Share custom sets with friends and study groups'
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#FF4D00] shadow-lg shadow-[#FF4D00]/50" />
                    <span className="text-orange-100/80">{item}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-linear-to-r from-[#FF4D00] to-[#FF0000] rounded-full font-semibold shadow-lg shadow-[#FF4D00]/30"
              >
                Start Building Sets
              </motion.button>
            </motion.div>

            {/* Right Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative w-full h-96 rounded-2xl bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 shadow-xl flex items-center justify-center">
                {/* Center Glow */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute w-48 h-48 bg-linear-to-r from-[#FF4D00]/30 to-[#FF0000]/30 rounded-full blur-3xl"
                />

                {/* Icon Grid */}
                <div className="grid grid-cols-2 gap-8 z-10">
                  <motion.div whileHover={{ scale: 1.1 }} className="p-6 rounded-xl bg-[#FF4D00]/20 border border-[#FF4D00]/30 text-center">
                    <FiGrid className="text-4xl text-[#FF4D00] mx-auto mb-2" />
                    <p className="text-sm text-orange-100/80">Themes</p>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.1 }} className="p-6 rounded-xl bg-[#FF0000]/20 border border-[#FF0000]/30 text-center">
                    <FiTrendingUp className="text-4xl text-[#FF4D00] mx-auto mb-2" />
                    <p className="text-sm text-orange-100/80">Ratings</p>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.1 }} className="p-6 rounded-xl bg-[#FF4D00]/20 border border-[#FF4D00]/30 text-center">
                    <FaChessKnight className="text-4xl text-[#FF4D00] mx-auto mb-2" />
                    <p className="text-sm text-orange-100/80">Openings</p>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.1 }} className="p-6 rounded-xl bg-[#FF0000]/20 border border-[#FF0000]/30 text-center">
                    <FiDownload className="text-4xl text-[#FF4D00] mx-auto mb-2" />
                    <p className="text-sm text-orange-100/80">Export</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-linear-to-br from-[#FF4D00]/20 to-[#FF0000]/20 border border-[#FF4D00]/30 backdrop-blur-sm"
          >
            <GiChessKing className="text-7xl text-[#FF4D00] mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
              Ready to Master Chess Studies?
            </h2>
            <p className="text-xl text-orange-200/80 mb-8">
              Join Z-Chess today. AI coaching, custom puzzles, and the best video lessons — all free.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-linear-to-r from-[#FF4D00] to-[#FF0000] rounded-full font-bold text-xl shadow-2xl shadow-[#FF4D00]/50"
            >
              Create Free Account
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer - Simplified */}
      <footer className="relative border-t border-[#FF4D00]/20 py-8 px-6 mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FaChess className="text-2xl text-[#FF4D00]" />
            <span className="text-xl font-bold bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
              Z-Chess
            </span>
          </div>
          
          <div className="flex space-x-4">
            {[FaTwitter, FaGithub, FaDiscord].map((Icon, index) => (
              <motion.a
                key={index}
                href="#"
                whileHover={{ scale: 1.2, rotate: 5 }}
                className="text-[#FF4D00] hover:text-[#FF0000] transition-colors"
              >
                <Icon size={24} />
              </motion.a>
            ))}
          </div>
        </div>
        <div className="text-center mt-4 text-orange-200/60 text-sm">
          &copy; 2026 Z-Chess. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default ZChessLanding;