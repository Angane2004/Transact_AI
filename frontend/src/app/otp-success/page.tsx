"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { authService, userService, initializeData } from "@/lib/localStorageService";
import { saveLoginToFirebase } from "@/lib/firebaseAuthStore";

export default function OTPSuccessPage() {
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const [dots, setDots] = useState("");

    useEffect(() => {
        // Get session and initialize data
        const session = authService.getSession();
        if (!session) {
            router.replace("/login");
            return;
        }

        const phone = session.phone;
        const userId = phone.replace(/\+/g, '');

        // Initialize data for the user
        initializeData(userId);

        // Save to Firebase (non-blocking)
        saveLoginToFirebase(phone);

        // Animate dots
        const dotsInterval = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);

        // Progress animation
        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                return Math.min(oldProgress + Math.random() * 8 + 2, 100);
            });
        }, 150);

        return () => {
            clearInterval(timer);
            clearInterval(dotsInterval);
        };
    }, [router]);

    // Navigate after progress completes
    useEffect(() => {
        if (progress >= 100) {
            const timeout = setTimeout(() => {
                // Check if profile is complete
                const session = authService.getSession();
                const userId = session?.phone.replace(/\+/g, '');
                const profile = userService.getProfile(userId);

                if (!profile || !profile.fullName) {
                    router.replace("/setup");
                } else {
                    router.replace("/dashboard");
                }
            }, 500);

            return () => clearTimeout(timeout);
        }
    }, [progress, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 relative overflow-hidden">
            {/* Animated gradient orbs */}
            <motion.div
                className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 opacity-20 blur-3xl"
                animate={{
                    y: [0, 30, 0],
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.3, 0.2],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-gradient-to-l from-blue-500 via-cyan-500 to-teal-500 opacity-20 blur-3xl"
                animate={{
                    y: [0, -30, 0],
                    scale: [1, 1.15, 1],
                    opacity: [0.2, 0.35, 0.2],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center w-full max-w-md relative z-10"
            >
                {/* Animated Logo */}
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 mb-8 sm:mb-12">
                    <motion.div
                        className="absolute inset-0 border-4 border-emerald-500/30 rounded-full"
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 180, 360],
                        }}
                        transition={{
                            duration: 3,
                            ease: "easeInOut",
                            repeat: Infinity,
                        }}
                    />
                    <motion.div
                        className="absolute inset-2 border-4 border-emerald-500/50 rounded-full"
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [360, 180, 0],
                        }}
                        transition={{
                            duration: 2.5,
                            ease: "easeInOut",
                            repeat: Infinity,
                        }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.span
                            className="text-3xl sm:text-4xl font-bold text-emerald-500"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{
                                duration: 1.5,
                                ease: "easeInOut",
                                repeat: Infinity,
                            }}
                        >
                            ✓
                        </motion.span>
                    </div>
                </div>

                {/* Main Text */}
                <motion.h2
                    className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    OTP Verified Successfully{dots}
                </motion.h2>

                <motion.p
                    className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8 text-center max-w-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    Setting up your account and preparing your dashboard
                </motion.p>

                {/* Progress Bar */}
                <div className="w-full max-w-xs sm:max-w-sm">
                    <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 text-center">
                        {Math.round(progress)}%
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
