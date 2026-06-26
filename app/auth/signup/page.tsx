"use client"

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { FaChess, FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

interface SignupFormData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

const ZChessSignup: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm<SignupFormData>();

    const password = watch('password');

    const onSubmit = async (data: SignupFormData) => {
        setIsSubmitting(true);
        setSubmitSuccess(false);

        // Simulate account creation without API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // For demo purposes, always succeed
        setSubmitSuccess(true);
        setIsSubmitting(false);

        // Auto-reset after 3 seconds
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
                        Join Z-Chess
                    </h1>
                    <p className="text-orange-200/70 mt-2">Start studying instantly. No verification needed.</p>
                </motion.div>

                {/* Form Card */}
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    className="backdrop-blur-xl bg-linear-to-br from-[#FF4D00]/10 to-[#FF0000]/10 border border-[#FF4D00]/30 rounded-2xl p-8 shadow-2xl"
                >
                    <div className="space-y-6">
                        {/* Username Field */}
                        <div>
                            <label className="block text-orange-200/90 mb-2 text-sm font-medium">
                                Username
                            </label>
                            <div className="relative">
                                <FaUser className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#FF4D00]/50" />
                                <input
                                    {...register('username', {
                                        required: 'Username is required',
                                        minLength: {
                                            value: 3,
                                            message: 'Username must be at least 3 characters'
                                        },
                                        maxLength: {
                                            value: 20,
                                            message: 'Username must be less than 20 characters'
                                        },
                                        pattern: {
                                            value: /^[a-zA-Z0-9_]+$/,
                                            message: 'Username can only contain letters, numbers, and underscores'
                                        }
                                    })}
                                    className="w-full bg-black/50 border border-[#FF4D00]/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-orange-200/30 focus:outline-none focus:border-[#FF4D00]/60 focus:ring-2 focus:ring-[#FF4D00]/20 transition-all"
                                    placeholder="chess_master"
                                />
                            </div>
                            {errors.username && (
                                <motion.p
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[#FF0000] text-sm mt-1"
                                >
                                    {errors.username.message}
                                </motion.p>
                            )}
                        </div>

                        {/* Email Field */}
                        <div>
                            <label className="block text-orange-200/90 mb-2 text-sm font-medium">
                                Email
                            </label>
                            <div className="relative">
                                <FaEnvelope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#FF4D00]/50" />
                                <input
                                    {...register('email', {
                                        required: 'Email is required',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Invalid email address'
                                        }
                                    })}
                                    type="email"
                                    className="w-full bg-black/50 border border-[#FF4D00]/30 rounded-lg pl-12 pr-4 py-3 text-white placeholder-orange-200/30 focus:outline-none focus:border-[#FF4D00]/60 focus:ring-2 focus:ring-[#FF4D00]/20 transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                            {errors.email && (
                                <motion.p
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[#FF0000] text-sm mt-1"
                                >
                                    {errors.email.message}
                                </motion.p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-orange-200/90 mb-2 text-sm font-medium">
                                Password
                            </label>
                            <div className="relative">
                                <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#FF4D00]/50" />
                                <input
                                    {...register('password', {
                                        required: 'Password is required',
                                        minLength: {
                                            value: 8,
                                            message: 'Password must be at least 8 characters'
                                        },
                                        pattern: {
                                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                                            message: 'Password must contain uppercase, lowercase, and number'
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

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-orange-200/90 mb-2 text-sm font-medium">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <FaLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#FF4D00]/50" />
                                <input
                                    {...register('confirmPassword', {
                                        required: 'Please confirm your password',
                                        validate: value =>
                                            value === password || 'Passwords do not match'
                                    })}
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    className="w-full bg-black/50 border border-[#FF4D00]/30 rounded-lg pl-12 pr-12 py-3 text-white placeholder-orange-200/30 focus:outline-none focus:border-[#FF4D00]/60 focus:ring-2 focus:ring-[#FF4D00]/20 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#FF4D00]/50 hover:text-[#FF4D00] transition-colors"
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <motion.p
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[#FF0000] text-sm mt-1"
                                >
                                    {errors.confirmPassword.message}
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
                                    Creating Account...
                                </>
                            ) : submitSuccess ? (
                                <>
                                    <FiCheck className="text-xl" />
                                    Account Created!
                                </>
                            ) : (
                                <>
                                    Create Account
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
                            <span className="px-4 bg-transparent text-orange-200/50">Already have an account?</span>
                        </div>
                    </div>

                    {/* Sign In Link */}
                    <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href="/auth/signin"
                        className="block w-full py-3 border-2 border-[#FF4D00]/50 rounded-lg font-semibold text-[#FF4D00] hover:bg-[#FF4D00]/10 transition-all text-center"
                    >
                        Sign In
                    </motion.a>
                </motion.div>

                {/* Footer Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-orange-200/50 text-sm mt-6"
                >
                    By signing up, you agree to our Terms of Service and Privacy Policy
                </motion.p>
            </motion.div>
        </div>
    );
};

export default ZChessSignup;