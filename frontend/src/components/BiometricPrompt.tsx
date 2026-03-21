import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, ScanFace, ShieldCheck, X, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BiometricPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel: () => void;
  type?: "face" | "fingerprint" | "both";
  mode?: "enroll" | "verify";
}

export function BiometricPrompt({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  type = "both",
  mode = "verify"
}: BiometricPromptProps) {
  const [status, setStatus] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) {
      checkSupportAndStart();
    } else {
      stopCamera();
    }
  }, [open]);

  const startCamera = async () => {
    if (type !== "face" && type !== "both") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera access denied or unavailable", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const checkSupportAndStart = async () => {
    setStatus("idle");
    
    // 1. Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      setStatus("error");
      setErrorMessage("Biometric hardware is not supported on this browser/device.");
      return;
    }

    // 2. Check if platform authenticator (Fingerprint/FaceID) is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!available) {
      setStatus("error");
      setErrorMessage("No Biometric hardware (Fingerprint/Face ID) found on this device.");
      return;
    }

    if (type === "face" || type === "both") {
        await startCamera();
    }

    // REMOVED: Auto-start scanning (causes NotAllowedError in many browsers)
    // The user must click the "Verify" button instead.
  };

  const handleAuthenticate = async () => {
    setStatus("scanning");
    
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
        }
      });

      if (credential) {
        stopCamera();
        setStatus("success");
        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        throw new Error("No credential returned");
      }
    } catch (err: any) {
      console.error("Biometric error:", err);
      // We don't stop camera on error because they might retry
      setStatus("error");
      if (err.name === "NotAllowedError") {
        setErrorMessage("Verification cancelled or timed out.");
      } else {
        setErrorMessage("Biometric verification failed. Please try again.");
      }
    }
  };

  const getIcon = () => {
    if (status === "success") return <ShieldCheck className="h-16 w-16 text-green-500" />;
    
    if (status === "scanning" && (type === "face" || type === "both")) {
        return (
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg bg-black">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]"
                />
                <motion.div 
                    animate={{ y: ["-100%", "100%", "-100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 left-0 w-full h-[2px] bg-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                />
                <div className="absolute inset-0 border-[20px] border-black/20 rounded-full pointer-events-none" />
            </div>
        );
    }

    switch (type) {
      case "face":
        return <ScanFace className={`h-16 w-16 ${status === 'scanning' ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />;
      case "fingerprint":
        return <Fingerprint className={`h-16 w-16 ${status === 'scanning' ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />;
      default:
        return (
          <div className="relative">
            <Fingerprint className={`h-16 w-16 ${status === 'scanning' ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
            <ScanFace className="h-6 w-6 absolute -bottom-1 -right-1 text-gray-500 bg-white dark:bg-gray-950 rounded-full" />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        if (!val) stopCamera();
        onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[400px] border-none bg-white dark:bg-gray-900 rounded-[28px] p-0 overflow-hidden shadow-2xl">
        <div className="p-8 flex flex-col items-center text-center space-y-6">
          <DialogHeader className="w-full">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex flex-col items-center gap-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={status}
              >
                {getIcon()}
              </motion.div>
              {mode === "enroll" ? "Enable Biometrics" : "Unlock TransactAI"}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {status === "scanning" 
                ? `Confirm your ${type === 'both' ? 'identity' : type} to continue` 
                : status === "success" 
                ? "Verified successfully" 
                : status === "error"
                ? errorMessage
                : `Use your ${type === 'both' ? 'biometrics' : type} for a faster, secure login`}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl"
              >
                Verification failed.
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full flex flex-col gap-3">
            {status === "error" ? (
              <Button 
                onClick={handleAuthenticate}
                className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Retry
              </Button>
            ) : status === "scanning" ? (
                <div className="h-12 flex items-center justify-center">
                    <div className="flex gap-1">
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-blue-500 rounded-full" />
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-blue-500 rounded-full" />
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>
                </div>
            ) : status === "idle" ? (
                <Button 
                    onClick={handleAuthenticate}
                    className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-md active:scale-95"
                >
                    {mode === "enroll" ? "Start Enrollment" : "Verify with Biometrics"}
                </Button>
            ) : (
                <div className="h-12" />
            )}
            
            <Button 
              variant="ghost" 
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="w-full h-12 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mode === "enroll" ? "Maybe Later" : "Use PIN Instead"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
