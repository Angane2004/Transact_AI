"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PinSetup from "@/components/PinSetup";
import { toast } from "sonner";
import { authService, pinService, biometricService } from "@/lib/localStorageService";
import { BiometricPrompt } from "@/components/BiometricPrompt";

export default function UnlockPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [showLoading, setShowLoading] = useState(false);
    const [showBioPrompt, setShowBioPrompt] = useState(false);
    const [bioType, setBioType] = useState<"face" | "fingerprint" | "both">("both");

    useEffect(() => {
        // Check if user is logged in via localStorage
        const session = authService.getSession();
        if (!session) {
            // If no session, redirect to login
            router.replace("/login");
            return;
        }

        // If session exists, we are ready to unlock
        const phone = session.phone.replace(/\+/g, "");
        setUserId(phone);
        setLoading(false);

        // Check if biometrics is enabled to show the prompt
        const bioConfig = biometricService.get(phone);
        if (bioConfig?.enabled) {
            setBioType(bioConfig.type);
            // WE NO LONGER AUTO-TRIGGER (causes NotAllowedError)
            // SHOW the prompt, but the user must click "Scan" inside it.
            setShowBioPrompt(true);
        }
    }, [router]);

    const handleUnlockSuccess = () => {
        if (!userId) return;
        const unlockKey = `app_unlocked_${userId}`;
        sessionStorage.setItem(unlockKey, "true");
        toast.success("Unlocked successfully!");
        setShowBioPrompt(false);
        setShowLoading(true);
        setTimeout(() => {
            router.replace("/dashboard");
        }, 1500);
    };

    const handlePinComplete = (pin: string) => {
        if (!userId) return;

        try {
            const isValid = pinService.verify(pin, userId);
            if (isValid) {
                handleUnlockSuccess();
            } else {
                toast.error("Incorrect PIN");
            }
        } catch (error) {
            console.error("Unlock error:", error);
            toast.error("Failed to verify PIN");
        }
    };

    if (loading) return null;

    if (showLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <PinSetup
                title="Welcome Back"
                subtitle="Enter your PIN to continue"
                onPinComplete={handlePinComplete}
                showBiometric={biometricService.isEnabled(userId || undefined)}
                onBiometricClick={() => setShowBioPrompt(true)}
            />
            <BiometricPrompt 
                open={showBioPrompt}
                onOpenChange={setShowBioPrompt}
                onSuccess={handleUnlockSuccess}
                onCancel={() => setShowBioPrompt(false)}
                type={bioType}
                mode="verify"
            />
        </>
    );
}
