"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { authService } from "@/lib/localStorageService";
import { motion, AnimatePresence } from "framer-motion";

// Firebase imports
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth, isSimulationMode } from "@/lib/firebase";

declare global {
    interface Window {
        recaptchaVerifier: any;
        grecaptcha: any;
    }
}

export default function LoginPage() {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [step, setStep] = useState<"phone" | "otp">("phone");
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const router = useRouter();

    // Refs for OTP inputs to manage focus
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Initialize RecaptchaVerifier on mount
        const auth = getFirebaseAuth();
        if (!auth) return;

        if (!window.recaptchaVerifier && document.getElementById('recaptcha-container')) {
            try {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': (response: any) => {
                        console.log("reCAPTCHA solved");
                    },
                    'expired-callback': () => {
                        console.log("reCAPTCHA expired");
                        toast.error("reCAPTCHA expired. Please try again.");
                    }
                });
                console.log("✅ RecaptchaVerifier initialized");
            } catch (error) {
                console.error("Error initializing RecaptchaVerifier:", error);
            }
        }
    }, []);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, ""); // Only allow numbers
        if (value.length <= 10) {
            setPhoneNumber(value);
        }
    };

    const handleSendOtp = async () => {
        if (!phoneNumber || phoneNumber.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        setLoading(true);

        try {
            const formattedPhone = `+91${phoneNumber}`;
            const auth = getFirebaseAuth();
            
            if (!auth) {
                toast.error("Firebase Auth not initialized");
                setLoading(false);
                return;
            }

            if (!window.recaptchaVerifier) {
               toast.error("Please wait, reCAPTCHA is initializing...");
               setLoading(false);
               return;
            }

            console.log(`📱 Sending OTP to ${formattedPhone} via Firebase...`);
            
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
            setConfirmationResult(confirmation);
            
            toast.success(`OTP sent to ${formattedPhone}`);
            setStep("otp");
        } catch (error: any) {
            console.error("Firebase Login Error:", error);
            let errMsg = "Failed to send OTP";
            
            // Handle common Firebase errors gracefully
            if (error.code === 'auth/invalid-phone-number') {
                errMsg = "Invalid phone number format.";
            } else if (error.code === 'auth/too-many-requests') {
                errMsg = "Too many requests. Please try again later.";
            } else if (error.code === 'auth/billing-not-enabled') {
                errMsg = "Firebase requires a billing account to send real SMS. Please add a test number in the Firebase Console, or enable billing.";
            } else if (error.message) {
                errMsg = error.message;
            }
            
            toast.error(errMsg);
            
            // Reset recpatcha on error to allow retry
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.render().then((widgetId: any) => {
                    window.grecaptcha.reset(widgetId);
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) {
            // Handle paste or auto-fill (simplified for single char input mostly)
            value = value[value.length - 1];
        }

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move focus to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Move focus to previous input on Backspace if current is empty
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        const otpString = otp.join("");
        if (otpString.length !== 6) {
            toast.error("Please enter the complete 6-digit OTP");
            return;
        }

        setLoading(true);
        try {
            if (!confirmationResult) {
                toast.error("Verification session expired. Please request a new OTP.");
                setStep("phone");
                return;
            }

            // Verify OTP with Firebase
            const result = await confirmationResult.confirm(otpString);
            const user = result.user;
            
            console.log("✅ Firebase Auth Success:", user.uid);
            
            // Extract phone safely (fallback to our input if somehow null)
            const formattedPhone = user.phoneNumber || `+91${phoneNumber}`;

            // Save session to localStorage to maintain compatibility with existing app logic
            authService.saveSession(formattedPhone);

            toast.success("Login Successful!");
            // Navigate directly to setup page or dashboard based on onboarding
            router.push("/setup");
            
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/invalid-verification-code') {
                 toast.error("Incorrect OTP");
            } else if (error.code === 'auth/code-expired') {
                 toast.error("OTP expired. Please request a new one.");
                 setStep("phone");
                 setOtp(["", "", "", "", "", ""]);
            } else {
                 toast.error("Invalid OTP");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            if (isSimulationMode) {
                // Mock Google Login for demo
                const mockEmail = "demo.user@gmail.com";
                authService.saveSession(mockEmail);
                toast.success("Demo Google Login Successful!");
                router.push("/setup");
                return;
            }

            const auth = getFirebaseAuth();
            if (!auth) throw new Error("Auth not initialized");

            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            console.log("✅ Google Auth Success:", user.email);
            
            // Save session (use email as primary ID for Google users)
            authService.saveSession(user.email || user.uid);

            toast.success("Login Successful!");
            router.push("/setup");
        } catch (error: any) {
            console.error("Google Login Error:", error);
            toast.error(error.message || "Google Login failed");
        } finally {
            setLoading(false);
        }
    };

    // Auto-focus first OTP input when step changes
    useEffect(() => {
        if (step === "otp") {
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
    }, [step]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-transparent p-4 relative">
            {/* Invisible recaptcha container required by Firebase */}
            <div id="recaptcha-container"></div>
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center font-bold bg-gradient-to-r from-black to-gray-300 bg-clip-text text-transparent">
                            {step === "phone" ? "Welcome Back" : "Verify OTP"}
                        </CardTitle>
                        <CardDescription className="text-center text-gray-500">
                            {step === "phone"
                                ? "Enter your 10-digit mobile number"
                                : `Enter the code sent to +91 ${phoneNumber}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <AnimatePresence mode="wait">
                                {step === "phone" ? (
                                    <motion.div
                                        key="phone-step"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-4"
                                    >
                                        <div className="relative group">
                                            <div className="absolute left-3 top-3 flex items-center gap-2 border-r pr-2 border-gray-300">
                                                <span className="text-sm font-semibold text-gray-500">🇮🇳 +91</span>
                                            </div>
                                            <Input
                                                placeholder="00000 00000"
                                                className="pl-24 h-12 text-lg tracking-widest transition-all border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                value={phoneNumber}
                                                onChange={handlePhoneChange}
                                                type="tel"
                                                maxLength={10}
                                            />
                                        </div>
                                        <Button
                                            className="w-full h-11 bg-gradient-to-r from-black to-gray-600 hover:from-black hover:to-fray-600 transition-all duration-300 shadow-lg hover:shadow-blue-500/25"
                                            onClick={handleSendOtp}
                                            disabled={loading || phoneNumber.length !== 10}
                                        >
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                                            Send OTP
                                        </Button>

                                        <div className="relative my-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-gray-200"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-white px-2 text-gray-500">Or continue with</span>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full h-11 border-2 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                                            onClick={handleGoogleLogin}
                                            disabled={loading}
                                        >
                                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                                <path
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                    fill="#4285F4"
                                                />
                                                <path
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                    fill="#34A853"
                                                />
                                                <path
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                                    fill="#FBBC05"
                                                />
                                                <path
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                    fill="#EA4335"
                                                />
                                            </svg>
                                            Google Account
                                        </Button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="otp-step"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex justify-between gap-2">
                                            {otp.map((digit, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <Input
                                                        ref={(el) => { inputRefs.current[index] = el }}
                                                        value={digit}
                                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                        type="number"
                                                        className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 transition-all duration-200 ${digit
                                                                ? "border-gray-200 bg-blue-50 text-gray-600"
                                                                : "border-gray-200 focus:border-gray-500 focus:ring-4 focus:ring-purple-100"
                                                            }`}
                                                        maxLength={1}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>

                                        <Button
                                            className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-green-500/25"
                                            onClick={handleVerifyOtp}
                                            disabled={loading || otp.some(d => !d)}
                                        >
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                            Verify & Login
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            className="w-full text-gray-500 hover:text-gray-700"
                                            onClick={() => {
                                                setStep("phone");
                                                setOtp(["", "", "", "", "", ""]);
                                                setConfirmationResult(null);
                                            }}
                                            disabled={loading}
                                        >
                                            Change Phone Number
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
