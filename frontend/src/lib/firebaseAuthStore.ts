"use client";

import { getFirebaseDb, isSimulationMode } from "./firebase";

// Store basic login/session info in Firebase Realtime Database per phone number
// This is optional - works without Firebase too
export async function saveLoginToFirebase(phone: string) {
  try {
    if (typeof window === "undefined") return;
    
    const db = getFirebaseDb();
    if (!db || isSimulationMode) {
      // Silently skip if Firebase is not available
      return;
    }

    const { ref, set, serverTimestamp } = await import("firebase/database");

    const sanitizedPhone = phone.replace(/\+/g, "");
    const loginRef = ref(db, `logins/${sanitizedPhone}/lastSession`);

    await set(loginRef, {
      phone,
      loggedInAt: serverTimestamp(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    });
    
    console.log("✅ Login saved to Firebase");
  } catch (error) {
    // Silently fail - Firebase is optional
    console.warn("⚠️ Firebase save skipped:", error);
  }
}
