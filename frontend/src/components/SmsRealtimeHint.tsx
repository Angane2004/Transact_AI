"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone } from "lucide-react";
import { Capacitor } from "@capacitor/core";

/**
 * Shown only in the native Android app. Real-time SMS requires a release build
 * with SMS permissions and the user accepting the prompt.
 */
export function SmsRealtimeHint() {
  if (typeof window === "undefined") return null;
  if (!Capacitor.isNativePlatform()) return null;
  if (Capacitor.getPlatform() !== "android") return null;

  return (
    <Card className="mb-6 max-w-xl border-dashed border-primary/30 bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Real-time bank SMS
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Use the <strong>Android app</strong> built from this project (not the browser). When you open the app
          the first time, tap <strong>Allow</strong> for SMS so new transaction texts can be
          classified automatically. Keep the app installed; you can leave it in the background—new messages
          are picked up while the app process is alive.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
        <p>Google Play may require a declared use for SMS permissions; sideloading is fine for personal use.</p>
        <p>If nothing happens: Settings → Apps → TransactAI → Permissions → enable SMS.</p>
      </CardContent>
    </Card>
  );
}
