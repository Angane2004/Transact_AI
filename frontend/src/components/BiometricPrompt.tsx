import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, ScanFace, ShieldCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BiometricService } from "@/lib/biometricService";
import { Capacitor } from "@capacitor/core";

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
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  useEffect(() => {
    if (open) {
      checkSupportAndStart();
    }
  }, [open]);

  const checkSupportAndStart = async () => {
    setStatus("idle");
    setErrorMessage("");
    
    try {
      const available = await BiometricService.isAvailable();
      if (!available) {
        setStatus("error");
        setErrorMessage("Biometric hardware is not supported on this device.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Unable to check biometric support.");
      console.error("Biometric support check failed:", error);
    }
  };

  const handleAuthenticate = async () => {
    setStatus("scanning");
    
    try {
      const success = await BiometricService.authenticate(
        mode === "enroll" 
          ? "Enable biometric authentication for TransactAI" 
          : "Authenticate to access TransactAI"
      );

      if (success) {
        setStatus("success");
        setTimeout(() => {
          onSuccess();
        }, 800);
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err: any) {
      console.error("Biometric error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Biometric verification failed. Please try again.");
    }
  };

  const getIcon = () => {
    if (status === "success") return <ShieldCheck className="h-16 w-16 text-green-500" />;
    
    if (status === "scanning") {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Fingerprint className="h-16 w-16 text-blue-500" />
        </motion.div>
      );
    }

    // For idle and error states
    const iconClass = status === 'error' ? 'text-red-500' : 'text-gray-400';
    switch (type) {
      case "face":
        return <ScanFace className={`h-16 w-16 ${iconClass}`} />;
      case "fingerprint":
        return <Fingerprint className={`h-16 w-16 ${iconClass}`} />;
      default:
        return (
          <div className="relative">
            <Fingerprint className={`h-16 w-16 ${iconClass}`} />
            <ScanFace className="h-6 w-6 absolute -bottom-1 -right-1 text-gray-500 bg-white dark:bg-gray-950 rounded-full" />
          </div>
        );
    }
  };

  const getTitle = () => {
    if (mode === "enroll") return "Enable Biometrics";
    return "Unlock TransactAI";
  };

  const getDescription = () => {
    if (status === "scanning") {
      return isNative 
        ? "Follow the on-screen biometric prompt"
        : `Confirm your ${type === 'both' ? 'identity' : type} to continue`;
    }
    if (status === "success") return "Verified successfully";
    if (status === "error") return errorMessage;
    return `Use your ${type === 'both' ? 'biometrics' : type} for a faster, secure login`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              {getTitle()}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {getDescription()}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl"
              >
                Verification failed. Please try again.
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
              onClick={onCancel}
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
