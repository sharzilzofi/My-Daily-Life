"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { syncUserStorage } from "@/lib/userStorage";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopSync: (() => void) | undefined;
    if (!auth) {
      sessionStorage.removeItem("personal-life-active-user");
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      stopSync?.();
      stopSync = firebaseUser ? syncUserStorage(firebaseUser.uid) : undefined;
      if (firebaseUser) sessionStorage.setItem("personal-life-active-user", firebaseUser.uid);
      else sessionStorage.removeItem("personal-life-active-user");
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => {
      stopSync?.();
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
