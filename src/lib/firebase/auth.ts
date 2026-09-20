import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "./config";

export interface AuthResult {
  user: User | null;
  error: string | null;
}

/**
 * Turns Firebase's cryptic error codes into messages a person can act on.
 * We never surface the raw error.code/message to the UI directly.
 */
function friendlyAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "Firebase API configuration is invalid. Check Settings → API & Integrations.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is disabled in Firebase. Enable it in Authentication → Sign-in method.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/user-disabled":
      return "This Firebase account has been disabled.";
    case "auth/invalid-login-credentials":
      return "Incorrect email or password, or the account does not exist yet.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/internal-error":
      return "Firebase could not complete the request. Check the Firebase configuration and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export async function registerWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    if (!auth) return { user: null, error: "Firebase is only available in the browser." };
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (err: any) {
    return { user: null, error: friendlyAuthError(err?.code ?? "") };
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    if (!auth) return { user: null, error: "Firebase is only available in the browser." };
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { user: credential.user, error: null };
  } catch (err: any) {
    return { user: null, error: friendlyAuthError(err?.code ?? "") };
  }
}

export async function logout(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}
