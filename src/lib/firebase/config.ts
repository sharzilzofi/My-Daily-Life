import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

function readSavedFirebaseConfig() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("personal-life-api-config-v1") || "{}").firebase || {};
  } catch {
    return {};
  }
}

const savedFirebaseConfig = readSavedFirebaseConfig();
const firebaseConfig = {
  apiKey: savedFirebaseConfig.apiKey || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: savedFirebaseConfig.authDomain || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: savedFirebaseConfig.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: savedFirebaseConfig.storageBucket || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: savedFirebaseConfig.messagingSenderId || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: savedFirebaseConfig.appId || process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export let firebaseConfigError: string | null = null;

// Firebase is a browser-only dependency here. Keeping initialization out of the
// server render prevents missing client environment variables from breaking prerendering.
let app: FirebaseApp | null = null;
if (typeof window !== "undefined") {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  } catch {
    firebaseConfigError = "Firebase configuration is missing or invalid. Add the correct web app values in Vercel or configure them on this page.";
  }
}

export let auth: Auth | null = null;
export let db: Firestore | null = null;
if (app) {
  try {
    auth = getAuth(app);
    db = getFirestore(app);
  } catch {
    app = null;
    firebaseConfigError = "Firebase configuration is missing or invalid. Add the correct web app values in Vercel or configure them on this page.";
  }
}
export default app;
