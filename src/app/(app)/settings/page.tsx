"use client";

import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark" | "system";
type Settings = {
  profile: { name: string; email: string; info: string };
  workout: { weightUnit: string; rest: number; preferences: string };
  time: { preferences: string };
  theme: Theme;
  currency: string;
};
type ApiConfig = {
  geminiKey: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
};

const SETTINGS_KEY = "personal-life-settings-v1";
const API_KEY = "personal-life-api-config-v1";
const DATA_KEYS = [
  "personal-life-nutrition-v1",
  "personal-life-finance-v1",
  "personal-life-workout-v1",
  "personal-life-time-v1",
  "personal-life-daily-log-v1",
];
const defaults: Settings = {
  profile: { name: "", email: "", info: "" },
  workout: { weightUnit: "kg", rest: 60, preferences: "" },
  time: { preferences: "" },
  theme: "system",
  currency: "BDT",
};
const emptyApi: ApiConfig = {
  geminiKey: "",
  firebase: { apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: "" },
};

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return { ...(fallback as object), ...value } as T;
  } catch {
    return fallback;
  }
};

function Button({ children, onClick, danger = false }: { children: React.ReactNode; onClick?: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`rounded-lg px-3 py-2 text-sm font-medium ${danger ? "border border-[#e9b4a6] text-[#c6533e]" : "bg-[#264653] text-white"}`}>{children}</button>;
}

function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block"><span className="mb-1 block text-xs text-[#6e625a]">{label}</span><input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[#ddcfc1] bg-white px-3 py-2 text-sm outline-none focus:border-[#e76f51]" /></label>;
}

function Status({ value }: { value: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${value === "Connected" ? "bg-[#d8efe9] text-[#176b5e]" : value === "Connection failed" ? "bg-[#f8ddd7] text-[#a8412e]" : "bg-[#f8f0e7] text-[#887a70]"}`}>{value}</span>;
}

function ApiIntegrations({ api, setApi, emit }: { api: ApiConfig; setApi: (value: ApiConfig) => void; emit: () => void }) {
  const [showGemini, setShowGemini] = useState(false);
  const [showFirebase, setShowFirebase] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState(api.geminiKey ? "Configured" : "Not configured");
  const [firebaseStatus, setFirebaseStatus] = useState(api.firebase.apiKey ? "Configured" : "Not configured");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGeminiStatus((current) => current === "Connected" && api.geminiKey ? current : api.geminiKey ? "Configured" : "Not configured");
    setFirebaseStatus((current) => current === "Connected" && api.firebase.apiKey ? current : api.firebase.apiKey ? "Configured" : "Not configured");
  }, [api.geminiKey, api.firebase.apiKey]);

  const saveApi = (next: ApiConfig) => {
    setApi(next);
    localStorage.setItem(API_KEY, JSON.stringify(next));
    emit();
  };
  const testGemini = async () => {
    if (!api.geminiKey) { setGeminiStatus("Not configured"); return; }
    setMessage("");
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(api.geminiKey)}`);
      if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}.`);
      setGeminiStatus("Connected");
    } catch (error) {
      setGeminiStatus("Connection failed");
      setMessage(error instanceof Error ? error.message : "Gemini connection failed.");
    }
  };
  const testFirebase = async () => {
    if (!api.firebase.apiKey || !api.firebase.authDomain || !api.firebase.projectId) { setFirebaseStatus("Not configured"); return; }
    setMessage("");
    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(api.firebase.apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({}));
      const errorMessage = String(body?.error?.message || "");
      if (!response.ok && !["ADMIN_ONLY_OPERATION", "OPERATION_NOT_ALLOWED", "INVALID_REQUEST"].includes(errorMessage)) {
        throw new Error(errorMessage || `Firebase returned HTTP ${response.status}.`);
      }
      setFirebaseStatus("Connected");
    } catch (error) {
      setFirebaseStatus("Connection failed");
      setMessage(error instanceof Error ? error.message : "Firebase connection failed.");
    }
  };
  const clearGemini = () => { if (confirm("Clear the saved Gemini API key?")) { const next = { ...api, geminiKey: "" }; saveApi(next); setGeminiStatus("Not configured"); } };
  const clearFirebase = () => { if (confirm("Clear the saved Firebase configuration?")) { const next = { ...api, firebase: emptyApi.firebase }; saveApi(next); setFirebaseStatus("Not configured"); } };

  return <div className="space-y-6"><div><h2 className="text-lg font-semibold">API & Integrations</h2><p className="mt-1 text-sm text-[#887a70]">Configure optional services without editing application source code.</p></div><div className="rounded-xl border border-[#e9b4a6] bg-[#fff5f1] p-4 text-sm text-[#8d493b]">API keys stored in a browser-based application may be accessible to anyone who can inspect the application. For production use, sensitive API keys should be moved to a secure backend/server environment.</div><section className="rounded-xl bg-[#f8f0e7] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Gemini API Key</h3><div className="mt-2"><Status value={geminiStatus} /></div></div><div className="flex gap-2"><Button onClick={testGemini}>Test connection</Button><Button danger onClick={clearGemini}>Clear</Button></div></div><div className="mt-4 flex gap-2"><input type={showGemini ? "text" : "password"} value={api.geminiKey} onChange={(event) => { const next = { ...api, geminiKey: event.target.value }; setApi(next); setGeminiStatus(event.target.value ? "Configured" : "Not configured"); }} placeholder="Paste Gemini API key" className="min-w-0 flex-1 rounded-lg border border-[#ddcfc1] bg-white px-3 py-2 text-sm" /><button onClick={() => setShowGemini(!showGemini)} className="rounded-lg border border-[#ddcfc1] px-3 text-sm">{showGemini ? "Hide" : "Show"}</button><Button onClick={() => saveApi(api)}>Save</Button></div></section><section className="rounded-xl bg-[#f8f0e7] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Firebase Configuration</h3><div className="mt-2"><Status value={firebaseStatus} /></div></div><div className="flex gap-2"><Button onClick={testFirebase}>Test connection</Button><Button danger onClick={clearFirebase}>Clear</Button></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1 block text-xs text-[#6e625a]">Firebase API Key</span><div className="flex gap-2"><input type={showFirebase ? "text" : "password"} value={api.firebase.apiKey} onChange={(event) => setApi({ ...api, firebase: { ...api.firebase, apiKey: event.target.value } })} className="min-w-0 flex-1 rounded-lg border border-[#ddcfc1] bg-white px-3 py-2 text-sm" /><button onClick={() => setShowFirebase(!showFirebase)} className="rounded-lg border border-[#ddcfc1] px-3 text-sm">{showFirebase ? "Hide" : "Show"}</button></div></label><Input label="Auth Domain" value={api.firebase.authDomain} onChange={(value) => setApi({ ...api, firebase: { ...api.firebase, authDomain: value } })} /><Input label="Project ID" value={api.firebase.projectId} onChange={(value) => setApi({ ...api, firebase: { ...api.firebase, projectId: value } })} /><Input label="Storage Bucket" value={api.firebase.storageBucket} onChange={(value) => setApi({ ...api, firebase: { ...api.firebase, storageBucket: value } })} /><Input label="Messaging Sender ID" value={api.firebase.messagingSenderId} onChange={(value) => setApi({ ...api, firebase: { ...api.firebase, messagingSenderId: value } })} /><Input label="App ID" value={api.firebase.appId} onChange={(value) => setApi({ ...api, firebase: { ...api.firebase, appId: value } })} /></div><div className="mt-4"><Button onClick={() => saveApi(api)}>Save Firebase configuration</Button></div></section>{message && <p className="text-sm text-[#a8412e]">{message}</p>}<p className="text-xs text-[#887a70]">Gemini is not called automatically. Firebase remains optional for local operation. Saved configurations are available to future integrations after refresh.</p></div>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaults);
  const [api, setApi] = useState<ApiConfig>(emptyApi);
  const [tab, setTab] = useState("profile");
  const [finance, setFinance] = useState<any>({ accounts: [], categories: [] });
  const [nutrition, setNutrition] = useState<any>({ targets: {} });
  const [time, setTime] = useState<any>({ custom: [] });
  const [newCategory, setNewCategory] = useState("");
  const [newActivity, setNewActivity] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const refresh = () => { setSettings(read(SETTINGS_KEY, defaults)); setApi(read(API_KEY, emptyApi)); setFinance(read("personal-life-finance-v1", { accounts: [], categories: [] })); setNutrition(read("personal-life-nutrition-v1", { targets: {} })); setTime(read("personal-life-time-v1", { custom: [] })); };
  useEffect(() => { refresh(); window.addEventListener("life-data-updated", refresh); return () => window.removeEventListener("life-data-updated", refresh); }, []);
  const emit = () => window.dispatchEvent(new Event("life-data-updated"));
  const saveSettings = (next: Settings) => { setSettings(next); localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); emit(); };
  const saveNutrition = (targets: any) => { const next = { ...nutrition, targets }; setNutrition(next); localStorage.setItem("personal-life-nutrition-v1", JSON.stringify(next)); emit(); };
  const saveFinance = (next: any) => { setFinance(next); localStorage.setItem("personal-life-finance-v1", JSON.stringify(next)); emit(); };
  const saveTime = (next: any) => { setTime(next); localStorage.setItem("personal-life-time-v1", JSON.stringify(next)); emit(); };
  useEffect(() => { const root = document.documentElement; root.classList.toggle("dark", settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)); }, [settings.theme]);
  const exportData = () => { const data: Record<string, any> = { settings, api }; DATA_KEYS.forEach((key) => { data[key] = read(key, {}); }); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `personal-life-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); };
  const importData = (file: File) => { const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(String(reader.result)); if (!data || typeof data !== "object" || !data.settings || !data.api || typeof data.api !== "object") throw new Error("Invalid backup"); if (!confirm("Replace current application data with this backup?")) return; localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...defaults, ...data.settings })); localStorage.setItem(API_KEY, JSON.stringify({ ...emptyApi, ...data.api, firebase: { ...emptyApi.firebase, ...(data.api.firebase || {}) } })); DATA_KEYS.forEach((key) => { if (data[key] && typeof data[key] === "object") localStorage.setItem(key, JSON.stringify(data[key])); }); refresh(); emit(); alert("Data imported successfully."); } catch { alert("This file is not a valid Personal Life Dashboard backup."); } }; reader.readAsText(file); };
  const clear = (key: string, label: string) => { if (!confirm(`Delete all ${label}? This cannot be undone.`)) return; localStorage.removeItem(key); emit(); refresh(); };

  const tabs = [["profile", "Profile"], ["nutrition", "Nutrition"], ["finance", "Finance"], ["workout", "Workout"], ["time", "Time"], ["appearance", "Appearance"], ["api", "API & Integrations"], ["data", "Data"]];
  return <div className="mx-auto max-w-[1200px] space-y-6 text-[#2f2925]"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e76f51]">Settings</p><h1 className="mt-1 text-3xl font-semibold">Make the system yours.</h1><p className="mt-2 text-sm text-[#887a70]">Preferences, integrations, and data controls are saved on this device.</p></div><div className="flex flex-wrap gap-2">{tabs.map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-sm ${tab === value ? "bg-[#264653] text-white" : "border border-[#ddcfc1] bg-[#fffdf9]"}`}>{label}</button>)}</div><section className="rounded-2xl border border-[#eadfd3] bg-[#fffdf9] p-5">
    {tab === "api" && <ApiIntegrations api={api} setApi={setApi} emit={emit} />}
    {tab === "profile" && <div className="max-w-xl space-y-4"><h2 className="text-lg font-semibold">Profile</h2><Input label="Name" value={settings.profile.name} onChange={(value) => saveSettings({ ...settings, profile: { ...settings.profile, name: value } })} /><Input label="Email" value={settings.profile.email} onChange={(value) => saveSettings({ ...settings, profile: { ...settings.profile, email: value } })} /><label><span className="mb-1 block text-xs">Profile information</span><textarea value={settings.profile.info} onChange={(event) => saveSettings({ ...settings, profile: { ...settings.profile, info: event.target.value } })} className="min-h-28 w-full rounded-lg border border-[#ddcfc1] px-3 py-2 text-sm" /></label></div>}
    {tab === "nutrition" && <div className="max-w-2xl"><h2 className="mb-4 text-lg font-semibold">Nutrition targets</h2><div className="grid gap-4 sm:grid-cols-2">{([ ["calories", "Daily calories", "kcal"], ["protein", "Protein", "g"], ["carbs", "Carbohydrates", "g"], ["fat", "Fat", "g"]] as [string, string, string][]).map(([field, label, unit]) => <Input key={field} label={`${label} (${unit})`} type="number" value={nutrition.targets?.[field] || 0} onChange={(value) => saveNutrition({ ...nutrition.targets, [field]: Number(value) || 0 })} />)}</div></div>}
    {tab === "finance" && <div className="space-y-6"><div className="max-w-xs"><Input label="Currency" value={settings.currency} onChange={(value) => saveSettings({ ...settings, currency: value || "BDT" })} /></div><div><h2 className="mb-3 text-lg font-semibold">Accounts</h2>{finance.accounts.map((account: any) => <div key={account.id} className="mb-2 flex flex-wrap items-center gap-3 rounded-lg bg-[#f8f0e7] p-3"><Input label="Name" value={account.name} onChange={(value) => saveFinance({ ...finance, accounts: finance.accounts.map((item: any) => item.id === account.id ? { ...item, name: value } : item) })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={account.active} onChange={(event) => saveFinance({ ...finance, accounts: finance.accounts.map((item: any) => item.id === account.id ? { ...item, active: event.target.checked } : item) })} /> Active</label></div>)}</div></div>}
    {tab === "workout" && <div className="max-w-2xl space-y-4"><h2 className="text-lg font-semibold">Workout preferences</h2><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs">Weight unit</span><select value={settings.workout.weightUnit} onChange={(event) => saveSettings({ ...settings, workout: { ...settings.workout, weightUnit: event.target.value } })} className="w-full rounded-lg border border-[#ddcfc1] px-3 py-2 text-sm"><option>kg</option><option>lb</option></select></label><Input label="Default rest timer (seconds)" type="number" value={settings.workout.rest} onChange={(value) => saveSettings({ ...settings, workout: { ...settings.workout, rest: Number(value) || 0 } })} /></div><textarea value={settings.workout.preferences} onChange={(event) => saveSettings({ ...settings, workout: { ...settings.workout, preferences: event.target.value } })} placeholder="Workout preferences" className="min-h-24 w-full rounded-lg border border-[#ddcfc1] px-3 py-2 text-sm" /></div>}
    {tab === "time" && <div className="space-y-4"><h2 className="text-lg font-semibold">Time preferences</h2><div className="flex flex-wrap gap-2">{(time.custom || []).map((item: string) => <span key={item} className="rounded-full bg-[#f8f0e7] px-3 py-1 text-xs">{item}</span>)}<input value={newActivity} onChange={(event) => setNewActivity(event.target.value)} placeholder="Custom activity" className="rounded-full border border-[#ddcfc1] px-3 py-1 text-xs" /><Button onClick={() => { if (newActivity.trim()) { saveTime({ ...time, custom: [...new Set([...(time.custom || []), newActivity.trim()])] }); setNewActivity(""); } }}>Add activity</Button></div><textarea value={settings.time.preferences} onChange={(event) => saveSettings({ ...settings, time: { ...settings.time, preferences: event.target.value } })} placeholder="Time-tracking preferences" className="min-h-24 w-full rounded-lg border border-[#ddcfc1] px-3 py-2 text-sm" /></div>}
    {tab === "appearance" && <div><h2 className="mb-4 text-lg font-semibold">Appearance</h2><div className="flex flex-wrap gap-2">{(["light", "dark", "system"] as Theme[]).map((theme) => <button key={theme} onClick={() => saveSettings({ ...settings, theme })} className={`rounded-lg px-4 py-2 text-sm capitalize ${settings.theme === theme ? "bg-[#264653] text-white" : "border border-[#ddcfc1]"}`}>{theme}</button>)}</div></div>}
    {tab === "data" && <div className="space-y-6"><div><h2 className="text-lg font-semibold">Backup and restore</h2><p className="mt-1 text-sm text-[#887a70]">Export includes application data, settings, and integration configuration.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={exportData}>Export JSON</Button><Button onClick={() => importRef.current?.click()}>Import JSON</Button><input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(event) => event.target.files?.[0] && importData(event.target.files[0])} /></div></div><div><h2 className="text-lg font-semibold">Delete data</h2><p className="mt-1 text-sm text-[#887a70]">These actions require confirmation and cannot be undone.</p><div className="mt-4 flex flex-wrap gap-2"><Button danger onClick={() => clear(DATA_KEYS[0], "nutrition data")}>Clear nutrition</Button><Button danger onClick={() => clear(DATA_KEYS[1], "finance data")}>Clear finance</Button><Button danger onClick={() => clear(DATA_KEYS[2], "workout data")}>Clear workouts</Button><Button danger onClick={() => clear(DATA_KEYS[3], "time data")}>Clear time</Button><Button danger onClick={() => clear(DATA_KEYS[4], "daily-log data")}>Clear daily log</Button><Button danger onClick={() => { if (confirm("Delete all Personal Life Dashboard data? This cannot be undone.")) { [...DATA_KEYS, SETTINGS_KEY, API_KEY].forEach((key) => localStorage.removeItem(key)); emit(); refresh(); } }}>Clear all data</Button></div></div></div>}
  </section></div>;
}