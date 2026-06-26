"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { FaChess, FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

interface SignInFormData {
  usernameOrEmail: string;
  password: string;
}

const ZChessSignIn: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignInFormData>({});

  const onSubmit = async (data: SignInFormData) => {
    setIsSubmitting(true);
    setSubmitSuccess(false);

    // Simulate sign in without API
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSubmitSuccess(true);
    setIsSubmitting(false);

    // Auto reset
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center p-6 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FF4D00]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FF0000]/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Floating Chess Pieces */}
      {['♔', '♕', '♖', '♗', '♘', '♙'].map((piece, index) => (
        <motion.div
          key={index}
          className="absolute text-4xl opacity-5"
          style={{
            left: `${(index * 15) % 90}%`,
            top: `${(index * 20) % 80}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{
            duration: 6 + index,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.3
          }}
        >
          {piece}
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            whileHover={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4"
          >
            <FaChess className="text-6xl text-[#FF4D00] mx-auto" />
          </motion.div>
          <h1 className="text-4xl font-bold bg-linear-to-r from-[#FF4D00] to-[#FF0000] bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-orange-200/70 mt-2">Sign in to continue your chess studies journey</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="backdrop-blur-xl bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 rounded-2xl p-8 shadow-2xl"
        >
          <div className="space-y-6">
            {/* Username or Email Field */}
            <div>
              <label className="block text-orange-200/90 mb-2 text-sm font-medium">
                Username or Email
              </label>
              <div className="relative">
                <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#FF4D00]/50" />
                <input
                  {...register('usernameOrEmail', {
                    required: 'Username or email is required',
                    minLength: {
                      value: 3,
                      message: 'Must be at least 3 characters'
                    }
                  })}
                  className="w-full bg-black/50 border border-[#FF4D00]/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-orange-200/30 focus:outline-none focus:border-[#FF4D00]/60 focus:ring-2 focus:ring-[#FF4D00]/20 transition-all"
                  placeholder="username or email@example.com"
                />
              </div>
              {errors.usernameOrEmail && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#FF0000] text-sm mt-1"
                >
                  {errors.usernameOrEmail.message}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-orange-200/90 text-sm font-medium">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-[#FF4D00] hover:text-[#FF0000] transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#FF4D00]/50" />
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-black/50 border border-[#FF4D00]/30 rounded-lg pl-12 pr-12 py-3 text-white placeholder-orange-200/30 focus:outline-none focus:border-[#FF4D00]/60 focus:ring-2 focus:ring-[#FF4D00]/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#FF4D00]/50 hover:text-[#FF4D00] transition-colors"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#FF0000] text-sm mt-1"
                >
                  {errors.password.message}
                </motion.p>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting || submitSuccess}
              className={`w-full py-3 rounded-lg font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                submitSuccess
                  ? 'bg-green-500 shadow-green-500/50'
                  : 'bg-linear-to-r from-[#FF4D00] to-[#FF0000] shadow-[#FF4D00]/50 hover:shadow-[#FF4D00]/70'
              } disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Signing In...
                </>
              ) : submitSuccess ? (
                <>
                  <FiCheck className="text-xl" />
                  Welcome Back!
                </>
              ) : (
                <>
                  Sign In
                  <FiArrowRight />
                </>
              )}
            </motion.button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#FF4D00]/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-orange-200/50">New to Z-Chess?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            href="/auth/signup"
            className="block w-full py-3 border-2 border-[#FF4D00]/50 rounded-lg font-semibold text-[#FF4D00] hover:bg-[#FF4D00]/10 transition-all text-center"
          >
            Create Account
          </motion.a>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default ZChessSignIn;