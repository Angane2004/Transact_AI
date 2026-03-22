"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService, onboardingService } from "@/lib/localStorageService";

/**
 * Root page handler.
 * Instead of showing a static landing page, we immediately redirect 
 * based on the user's state (Onboarding -> Login -> Dashboard).
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Perform check immediately on mount
    const hasSeenOnboarding = onboardingService.isComplete();
    const session = authService.getSession();
    
    if (!hasSeenOnboarding) {
      router.replace("/onboarding");
    } else if (!session) {
      router.replace("/login");
    } else {
      router.replace("/dashboard");
    }
  }, [router]);

  // Show a clean loading state while redirecting
  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 relative">
        <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <p className="mt-6 text-slate-500 font-medium animate-pulse">Initializing TransactAI...</p>
    </div>
  );
}
