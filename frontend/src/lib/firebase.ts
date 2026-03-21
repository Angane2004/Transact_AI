import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getAuth, Auth } from "firebase/auth";

// Check if we should use simulation mode
const isSimulationMode = 
  typeof window === 'undefined' ||
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("DEMO") ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("mock");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

let app: FirebaseApp | null = null;
let db: Database | null = null;
let auth: Auth | null = null;

// Initialize Firebase only on client side with real keys
function initFirebase() {
  if (typeof window === 'undefined') return;
  if (isSimulationMode) {
    console.log("📱 Running in simulation mode - using localStorage");
    return;
  }
  
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getDatabase(app);
    auth = getAuth(app);
    console.log("✅ Firebase initialized successfully");
  } catch (error) {
    console.warn("⚠️ Firebase initialization failed:", error);
  }
}

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
  initFirebase();
}

// Helper to get database instance
export function getFirebaseDb(): Database | null {
  if (!db && typeof window !== 'undefined' && !isSimulationMode) {
    initFirebase();
  }
  return db;
}

export function getFirebaseAuth(): Auth | null {
  if (!auth && typeof window !== 'undefined' && !isSimulationMode) {
    initFirebase();
  }
  return auth;
}

export { app, db, auth, isSimulationMode };
