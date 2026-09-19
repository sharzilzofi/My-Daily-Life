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

// Guard against re-initializing the app on every hot-reload / re-render.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export default app;
