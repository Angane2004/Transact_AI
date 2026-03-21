"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { pinService, authService, initializeData, biometricService } from "@/lib/localStorageService";
import { firestoreService } from "@/lib/firestoreService";
import { BiometricPrompt } from "@/components/BiometricPrompt";
import {
  ArrowLeft,
  Shield,
  Sparkles,
  Bell,
  LayoutDashboard,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";

type ExperienceSettings = {
  dashboardDensity: "cozy" | "compact";
  aiHints: boolean;
  monthlySummary: boolean;
  smartHighlights: boolean;
};

const SETTINGS_STORAGE_KEY = "transactai_settings_experience";

export default function SettingsPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | "both">("both");
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [experience, setExperience] = useState<ExperienceSettings>({
    dashboardDensity: "cozy",
    aiHints: true,
    monthlySummary: true,
    smartHighlights: true,
  });

  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);

  useEffect(() => {
    setMounted(true);

    const session = authService.getSession();
    const userId = session?.phone.replace(/\+/g, "");

    if (userId && pinService.exists(userId)) {
      setIsPinEnabled(true);
    }

    if (userId) {
      const bioConfig = biometricService.get(userId);
      if (bioConfig?.enabled) {
        setIsBiometricEnabled(true);
        setBiometricType(bioConfig.type);
      }
    }

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ExperienceSettings;
          setExperience((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // ignore corrupted settings
      }
    }
  }, []);

  const persistExperience = (next: ExperienceSettings) => {
    setExperience(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    }
  };

  const handleRefreshCloudData = async () => {
    try {
      setIsRefreshingCloud(true);
      const session = authService.getSession();
      const userId = session?.phone.replace(/\+/g, "").trim();
      if (!userId) return;

      const res = await firestoreService.initializeData(userId);
      if (res.success) {
        toast.success("Cloud data initialized with demo transactions");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Failed to initialize cloud data: " + res.error);
      }
    } catch (error) {
      console.error("Error refreshing cloud data:", error);
      toast.error("Failed to refresh cloud data");
    } finally {
      setIsRefreshingCloud(false);
    }
  };

  const handleSavePin = async () => {
    if (pin.length !== 4) {
      toast.error("PIN must be 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }

    try {
      const session = authService.getSession();
      const userId = session?.phone.replace(/\+/g, "") || "default";
      pinService.save(pin, userId);
      setIsPinEnabled(true);
      toast.success("App Lock enabled successfully");
      setPin("");
      setConfirmPin("");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Error saving PIN:", error);
      toast.error("Failed to save PIN");
    }
  };

  const handleDisablePin = () => {
    const session = authService.getSession();
    const userId = session?.phone.replace(/\+/g, "") || "default";
    pinService.remove(userId);
    setIsPinEnabled(false);
    toast.success("App Lock disabled");
  };

  const handleBiometricToggle = (checked: boolean) => {
    if (checked) {
      setShowBiometricPrompt(true);
    } else {
      const session = authService.getSession();
      const userId = session?.phone.replace(/\+/g, "") || "default";
      biometricService.disable(userId);
      setIsBiometricEnabled(false);
      toast.success("Biometric lock disabled");
    }
  };

  const handleBiometricSuccess = () => {
    const session = authService.getSession();
    const userId = session?.phone.replace(/\+/g, "") || "default";
    
    biometricService.save({
      enabled: true,
      type: biometricType,
      updatedAt: new Date().toISOString()
    }, userId);
    
    setIsBiometricEnabled(true);
    setShowBiometricPrompt(false);
    toast.success(`${biometricType === 'both' ? 'Biometrics' : biometricType} enabled successfully`);
  };

  const handleRefreshDemoData = async () => {
    try {
      setIsRefreshingData(true);
      const session = authService.getSession();
      const userId = session?.phone.replace(/\+/g, "");
      initializeData(userId);
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success("Demo data refreshed with new simulated transactions");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh demo data");
    } finally {
      setIsRefreshingData(false);
    }
  };

  const handleClearLocalData = async () => {
    if (typeof window === "undefined") return;

    const confirmed = window.confirm(
      "This will clear analytics, demo transactions and cached settings on this device. Your login will stay active. Continue?",
    );
    if (!confirmed) return;

    try {
      setIsClearingData(true);
      const session = authService.getSession();
      const userId = session?.phone.replace(/\+/g, "");

      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith("transactai_") ||
          (userId && key.includes(userId)) ||
          key === SETTINGS_STORAGE_KEY
        ) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));

      toast.success("Local TransactAI data cleared for this device");
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Failed to clear data");
    } finally {
      setIsClearingData(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Settings
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Fine-tune your TransactAI experience, security and demo data.
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-2 md:mt-0 w-full md:w-auto"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Security / App Lock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-1"
        >
          <Card className="h-full border border-border/60 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-background via-background to-muted/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Security &amp; App Lock
                </CardTitle>
                <CardDescription>
                  Protect access to TransactAI on this device.
                </CardDescription>
              </div>
              <span className="rounded-full border px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground bg-background/60">
                Device-only
              </span>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">App Lock PIN</Label>
                  <p className="text-sm text-muted-foreground">
                    {isPinEnabled
                      ? "Currently required to unlock the app"
                      : "Set a 4-digit PIN to unlock the dashboard"}
                  </p>
                </div>
                <Button
                  variant={isPinEnabled ? "destructive" : "default"}
                  onClick={isPinEnabled ? handleDisablePin : () => {}}
                  size="sm"
                >
                  {isPinEnabled ? "Disable" : "Enable below"}
                </Button>
              </div>

              {!isPinEnabled && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-4 border-t"
                >
                  <div className="grid gap-2">
                    <Label htmlFor="pin">Set 4-digit PIN</Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-pin">Confirm PIN</Label>
                    <Input
                      id="confirm-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) =>
                        setConfirmPin(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </div>
                  <Button className="w-full" onClick={handleSavePin}>
                    Save PIN
                  </Button>
                </motion.div>
              )}

              {/* Biometrics Section */}
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Biometric Lock</Label>
                        <p className="text-sm text-muted-foreground">
                            Use Face or Fingerprint to unlock
                        </p>
                    </div>
                    <Switch
                        checked={isBiometricEnabled}
                        onCheckedChange={handleBiometricToggle}
                    />
                </div>

                {isBiometricEnabled && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3 pt-2"
                    >
                        <Label className="text-sm font-medium">Biometric Type</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["fingerprint", "face", "both"] as const).map((t) => (
                                <Button
                                    key={t}
                                    variant={biometricType === t ? "default" : "outline"}
                                    size="sm"
                                    className="capitalize text-[11px] h-9"
                                    onClick={() => {
                                        setBiometricType(t);
                                        // Update service if already enabled
                                        const session = authService.getSession();
                                        const userId = session?.phone.replace(/\+/g, "") || "default";
                                        biometricService.save({
                                            enabled: true,
                                            type: t,
                                            updatedAt: new Date().toISOString()
                                        }, userId);
                                    }}
                                >
                                    {t}
                                </Button>
                            ))}
                        </div>
                    </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <BiometricPrompt 
            open={showBiometricPrompt}
            onOpenChange={setShowBiometricPrompt}
            onSuccess={handleBiometricSuccess}
            onCancel={() => setShowBiometricPrompt(false)}
            type={biometricType}
            mode="enroll"
        />

        {/* Experience / Personalization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="col-span-1"
        >
          <Card className="h-full border border-border/60 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                Dashboard Experience
              </CardTitle>
              <CardDescription>
                Tell TransactAI how bold and chatty it should feel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <Label className="text-sm">Layout density</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant={
                      experience.dashboardDensity === "cozy"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      persistExperience({
                        ...experience,
                        dashboardDensity: "cozy",
                      })
                    }
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Cozy (recommended)
                  </Button>
                  <Button
                    variant={
                      experience.dashboardDensity === "compact"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      persistExperience({
                        ...experience,
                        dashboardDensity: "compact",
                      })
                    }
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Compact (data dense)
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  This preference is stored on this device and will be used as we
                  add more layout variations.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label className="text-sm flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI spend tips
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow subtle AI nudges on how you can optimise spending.
                  </p>
                </div>
                <Switch
                  checked={experience.aiHints}
                  onCheckedChange={(val) =>
                    persistExperience({ ...experience, aiHints: val })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm flex items-center gap-1">
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    Smart highlights
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Gently highlight unusual spikes or drops in your spending.
                  </p>
                </div>
                <Switch
                  checked={experience.smartHighlights}
                  onCheckedChange={(val) =>
                    persistExperience({ ...experience, smartHighlights: val })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm flex items-center gap-1">
                    <Bell className="h-4 w-4 text-primary" />
                    Monthly summary card
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Show a "month at a glance" card when you open dashboard.
                  </p>
                </div>
                <Switch
                  checked={experience.monthlySummary}
                  onCheckedChange={(val) =>
                    persistExperience({ ...experience, monthlySummary: val })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data & Simulation Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-1"
        >
          <Card className="h-full border border-border/60 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-background via-background to-amber-50/40 dark:to-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RefreshCw className="h-5 w-5 text-amber-500" />
                Demo data &amp; privacy
              </CardTitle>
              <CardDescription>
                Regenerate simulated transactions or clean up this device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <Label className="text-sm">Cloud Data (Firebase)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Populate your Firebase Firestore with demo categories and transactions.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 border-primary/50 hover:border-primary"
                  onClick={handleRefreshCloudData}
                  disabled={isRefreshingCloud}
                >
                  <RefreshCw
                    className={`h-4 w-4 text-primary ${
                      isRefreshingCloud ? "animate-spin" : ""
                    }`}
                  />
                  {isRefreshingCloud
                    ? "Initializing cloud data..."
                    : "Initialize Cloud Demo Data"}
                </Button>
              </div>

              <div className="space-y-2 pt-3 border-t">
                <Label className="text-sm">Local Simulation</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Refresh the generated transactions stored locally on this device.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleRefreshDemoData}
                  disabled={isRefreshingData}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      isRefreshingData ? "animate-spin" : ""
                    }`}
                  />
                  {isRefreshingData
                    ? "Refreshing local data..."
                    : "Regenerate Local Transactions"}
                </Button>
              </div>

              <div className="space-y-2 pt-3 border-t">
                <Label className="text-sm">Local data on this device</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  This only affects this browser. It will not touch any real bank
                  data.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleClearLocalData}
                  disabled={isClearingData}
                >
                  <Trash2 className="h-4 w-4" />
                  {isClearingData
                    ? "Clearing local data..."
                    : "Clear TransactAI data on this device"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

