"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { firebaseConfigError } from "@/lib/firebase/config";

const API_KEY = "personal-life-api-config-v1";
const emptyFirebase = { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" };

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900" /></label>;
}

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [firebase, setFirebase] = useState(emptyFirebase);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const savedConfig = JSON.parse(localStorage.getItem(API_KEY) || "{}").firebase;
      if (savedConfig) {
        setFirebase({ ...emptyFirebase, ...savedConfig });
        setSaved(Boolean(savedConfig.apiKey && savedConfig.authDomain && savedConfig.projectId));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  function saveFirebase() {
    if (!firebase.apiKey || !firebase.authDomain || !firebase.projectId || !firebase.appId) return;
    localStorage.setItem(API_KEY, JSON.stringify({ firebase }));
    setSaved(true);
    window.location.reload();
  }

  if (user) return null;

  return <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"><div className="mx-auto max-w-3xl"><div className="mb-8"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e76f51]">Personal Life Dashboard</p><h1 className="mt-2 text-3xl font-semibold">Connect your workspace first.</h1><p className="mt-2 max-w-xl text-sm text-neutral-500 dark:text-neutral-400">Enter your Firebase web app configuration before creating an account or signing in. This lets the app use your Firebase project instead of assuming a fixed backend.</p></div>{firebaseConfigError && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{firebaseConfigError}</p>}<div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]"><form onSubmit={(event) => { event.preventDefault(); saveFirebase(); }} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Firebase configuration</h2><p className="mt-1 text-xs text-neutral-500">Settings are saved only in this browser.</p></div><span className={`rounded-full px-2.5 py-1 text-xs ${saved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{saved ? "Configured" : "Not configured"}</span></div><div className="grid gap-3 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-1 block text-xs text-neutral-600 dark:text-neutral-400">Firebase API Key</span><div className="flex gap-2"><input required type={showKey ? "text" : "password"} value={firebase.apiKey} onChange={(event) => setFirebase({ ...firebase, apiKey: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900" /><button type="button" onClick={() => setShowKey(!showKey)} className="rounded-lg border border-neutral-300 px-3 text-xs dark:border-neutral-700">{showKey ? "Hide" : "Show"}</button></div></label><Field label="Auth Domain" value={firebase.authDomain} onChange={(value) => setFirebase({ ...firebase, authDomain: value })} /><Field label="Project ID" value={firebase.projectId} onChange={(value) => setFirebase({ ...firebase, projectId: value })} /><Field label="Storage Bucket" value={firebase.storageBucket} onChange={(value) => setFirebase({ ...firebase, storageBucket: value })} /><Field label="Messaging Sender ID" value={firebase.messagingSenderId} onChange={(value) => setFirebase({ ...firebase, messagingSenderId: value })} /><Field label="App ID" value={firebase.appId} onChange={(value) => setFirebase({ ...firebase, appId: value })} /></div><button type="submit" className="mt-5 w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">Save configuration and continue</button></form><div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"><h2 className="text-lg font-semibold">Continue</h2><p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">After saving a valid configuration, create a new Firebase account or sign in to the connected project.</p><div className="mt-6 space-y-3"><Link href="/login" className="block rounded-lg bg-[#264653] px-4 py-3 text-center text-sm font-semibold text-white">Login</Link><Link href="/register" className="block rounded-lg border border-neutral-300 px-4 py-3 text-center text-sm font-semibold dark:border-neutral-700">Register</Link></div><p className="mt-6 text-xs text-neutral-500 dark:text-neutral-400">Changing the configuration here replaces the saved project for this browser. Reloading the page applies it to Firebase Auth.</p></div></div></div></main>;
}
