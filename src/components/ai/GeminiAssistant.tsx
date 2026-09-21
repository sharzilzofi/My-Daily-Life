"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { executeAiTool, mutatingAiTools } from "@/lib/aiActions";
import { readUserStorage } from "@/lib/userStorage";

type Part = { text?: string; functionCall?: { name: string; args?: Record<string, any> }; functionResponse?: Record<string, any> };
type Content = { role: "user" | "model"; parts: Part[] };
type Message = { role: "user" | "assistant"; text: string };
type PendingAction = { name: string; args: Record<string, any>; modelParts: Part[] };

type Declaration = { name: string; description: string; parameters: Record<string, any> };

const apiKeyStorage = "personal-life-api-config-v1";
const model = "gemini-3.6-flash";
const declarations: Declaration[] = [
  { name: "getSummary", description: "View a concise overview of the user's stored data for a date. Never changes data.", parameters: { type: "OBJECT", properties: { date: { type: "STRING", description: "Date in YYYY-MM-DD format" } } } },
  { name: "searchRecords", description: "Search existing stored records by name, type, section, or date. Never changes data.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
  { name: "addNutrition", description: "Add nutrition log entries only by matching foods already in the user's Nutrition food database. Never invent nutrition values.", parameters: { type: "OBJECT", properties: { items: { type: "ARRAY", items: { type: "OBJECT", properties: { foodName: { type: "STRING" }, quantity: { type: "NUMBER" }, unit: { type: "STRING" }, meal: { type: "STRING" }, date: { type: "STRING" } }, required: ["foodName", "quantity"] } } }, required: ["items"] } },
  { name: "addFinance", description: "Add one Finance income, expense, or transfer using an existing account. Never create accounts or guess an account.", parameters: { type: "OBJECT", properties: { type: { type: "STRING", enum: ["income", "expense", "transfer"] }, amount: { type: "NUMBER" }, category: { type: "STRING" }, source: { type: "STRING" }, accountName: { type: "STRING" }, fromAccount: { type: "STRING" }, toAccount: { type: "STRING" }, date: { type: "STRING" }, note: { type: "STRING" } }, required: ["type", "amount"] } },
  { name: "addTime", description: "Add a Time Tracking entry with an activity and explicit or default start/end time.", parameters: { type: "OBJECT", properties: { activity: { type: "STRING" }, date: { type: "STRING" }, start: { type: "STRING" }, end: { type: "STRING" }, notes: { type: "STRING" } }, required: ["activity", "start", "end"] } },
  { name: "addWorkout", description: "Add a basic Workout record when the user gives a workout name and duration. Does not invent exercises or sets.", parameters: { type: "OBJECT", properties: { name: { type: "STRING" }, durationMinutes: { type: "NUMBER" }, date: { type: "STRING" }, notes: { type: "STRING" } }, required: ["name", "durationMinutes"] } },
  { name: "updateDailyLog", description: "Create or update the Daily Log for a date using only fields the user supplied.", parameters: { type: "OBJECT", properties: { date: { type: "STRING" }, sleepHours: { type: "NUMBER" }, wakeTime: { type: "STRING" }, mood: { type: "STRING" }, energy: { type: "NUMBER" }, rating: { type: "NUMBER" }, notes: { type: "STRING" } } } },
  { name: "editRecord", description: "Edit an existing record by exact section, collection, and record ID. Use searchRecords first when the ID is unknown.", parameters: { type: "OBJECT", properties: { section: { type: "STRING", enum: ["nutrition", "finance", "workout", "time", "daily"] }, collection: { type: "STRING" }, recordId: { type: "STRING" }, patch: { type: "OBJECT" } }, required: ["section", "recordId", "patch"] } },
  { name: "deleteRecord", description: "Delete one existing record by exact section, collection, and record ID. Only call after the user clearly confirms deletion.", parameters: { type: "OBJECT", properties: { section: { type: "STRING", enum: ["nutrition", "finance", "workout", "time", "daily"] }, collection: { type: "STRING" }, recordId: { type: "STRING" } }, required: ["section", "recordId"] } },
];

const toolConfig = [{ functionDeclarations: declarations }];
const systemInstruction = "You are the Personal Life Dashboard assistant. Use tools for all app data. Never invent stored nutrition, accounts, records, IDs, or completed actions. Ask a concise follow-up when required data is missing. Read-only tools can run immediately. For any add, edit, or delete, explain exactly what will change and wait for the user to confirm before calling the mutating tool. Deletions always require explicit confirmation. Prefer the existing section data layer and respect the user's date and units.";

function actionSummary(name: string, args: Record<string, any>) {
  if (name === "addFinance") return `I'll add ${args.amount} as a ${args.category || "Other"} ${args.type || "expense"}${args.accountName ? ` from ${args.accountName}` : ""}${args.date ? ` on ${args.date}` : " today"}. Confirm?`;
  if (name === "addNutrition") return `I'll add ${Array.isArray(args.items) ? args.items.map((item: Record<string, any>) => `${item.quantity}${item.unit || "g"} ${item.foodName}`).join(" and ") : "that food"} to Nutrition. Confirm?`;
  if (name === "addTime") return `I'll add ${args.activity} from ${args.start} to ${args.end}${args.date ? ` on ${args.date}` : " today"}. Confirm?`;
  if (name === "addWorkout") return `I'll record a ${args.name} workout for ${args.durationMinutes} minutes${args.date ? ` on ${args.date}` : " today"}. Confirm?`;
  if (name === "updateDailyLog") return `I'll update your Daily Log${args.date ? ` for ${args.date}` : " for today"} with the details you provided. Confirm?`;
  if (name === "editRecord") return `I'll edit record ${args.recordId} in ${args.section} with the requested changes. Confirm?`;
  return `I'll permanently delete record ${args.recordId} from ${args.section}. This cannot be undone. Confirm?`;
}

export default function GeminiAssistant() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Hi. I can read your dashboard and help update Nutrition, Finance, Workout, Time Tracking, or Daily Log." }]);
  const conversation = useRef<Content[]>([]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => setConfigured(Boolean(readUserStorage<Record<string, any>>(apiKeyStorage, user.uid, {}).geminiKey));
    refresh();
    window.addEventListener("life-data-updated", refresh);
    return () => window.removeEventListener("life-data-updated", refresh);
  }, [user]);

  const key = () => user ? readUserStorage<Record<string, any>>(apiKeyStorage, user.uid, {}).geminiKey : "";
  const request = async () => {
    const apiKey = key();
    if (!apiKey) throw new Error("Gemini is not configured. Add your API key in Settings > API & Integrations.");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents: conversation.current, tools: toolConfig, generationConfig: { temperature: 0.2 } }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || `Gemini returned HTTP ${response.status}.`);
    return body?.candidates?.[0]?.content?.parts || [] as Part[];
  };

  const finish = (text: string) => setMessages((current) => [...current, { role: "assistant", text }]);
  const handleResponse = async (parts: Part[], depth = 0): Promise<void> => {
    const functionPart = parts.find((part) => part.functionCall)?.functionCall;
    if (!functionPart) { finish(parts.find((part) => part.text)?.text || "I could not produce a response."); return; }
    const name = functionPart.name;
    const args = functionPart.args || {};
    if (mutatingAiTools.has(name)) { setPending({ name, args, modelParts: parts }); finish(actionSummary(name, args)); return; }
    if (!user) return;
    let result: Record<string, any>;
    try { result = executeAiTool(user.uid, name, args); } catch (toolError) { result = { error: toolError instanceof Error ? toolError.message : "The read action failed." }; }
    conversation.current.push({ role: "model", parts });
    conversation.current.push({ role: "user", parts: [{ functionResponse: { name, response: { result } } }] });
    if (depth < 2) await handleResponse(await request(), depth + 1); else finish(JSON.stringify(result));
  };

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput(""); setError(""); setBusy(true); setMessages((current) => [...current, { role: "user", text }]);
    conversation.current.push({ role: "user", parts: [{ text }] });
    try { await handleResponse(await request()); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "The assistant could not respond."); } finally { setBusy(false); }
  };

  const confirmPending = async () => {
    if (!pending || !user || busy) return;
    setBusy(true); setError("");
    try {
      const result = executeAiTool(user.uid, pending.name, pending.args);
      conversation.current.push({ role: "model", parts: pending.modelParts });
      conversation.current.push({ role: "user", parts: [{ functionResponse: { name: pending.name, response: { result } } }] });
      setPending(null);
      await handleResponse(await request());
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "The action failed."); } finally { setBusy(false); }
  };

  return <>
    <button onClick={() => setOpen(true)} aria-label="Open Gemini assistant" title="Open Gemini assistant" className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#264653] text-2xl text-white shadow-lg transition hover:scale-105 hover:bg-[#1e3944] focus:outline-none focus:ring-2 focus:ring-[#e76f51] focus:ring-offset-2">✦</button>
    {open && <div className="fixed inset-0 z-50 bg-[#33251f]/20" onClick={() => setOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="gemini-title" onClick={(event) => event.stopPropagation()} className="absolute bottom-0 right-0 flex h-[min(680px,100vh)] w-full max-w-md flex-col border border-[#eadfd3] bg-[#fffdf9] shadow-2xl sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-2.5rem))] sm:rounded-2xl"><header className="flex items-center justify-between border-b border-[#eadfd3] p-4"><div><h2 id="gemini-title" className="font-semibold">Gemini assistant</h2><p className="text-xs text-[#887a70]">Controlled access to your dashboard data</p></div><button onClick={() => setOpen(false)} aria-label="Close Gemini assistant" className="rounded-lg px-2 text-xl text-[#887a70] hover:bg-[#f8f0e7]">×</button></header><div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">{!configured && <div className="rounded-xl border border-[#e9b4a6] bg-[#fff5f1] p-3 text-sm text-[#8d493b]">Gemini is not configured. <button onClick={() => router.push("/settings")} className="font-semibold underline">Open Settings</button></div>}{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "ml-auto bg-[#264653] text-white" : "bg-[#f8f0e7] text-[#2f2925]"}`}>{message.text}</div>)}{pending && <div className="rounded-xl border border-[#e9b4a6] bg-[#fff5f1] p-3 text-sm"><p>{actionSummary(pending.name, pending.args)}</p><div className="mt-3 flex gap-2"><button onClick={confirmPending} disabled={busy} className="rounded-lg bg-[#e76f51] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm</button><button onClick={() => setPending(null)} disabled={busy} className="rounded-lg border border-[#ddcfc1] px-3 py-2 text-xs">Cancel</button></div></div>}{busy && <p className="text-xs text-[#887a70]">Thinking...</p>}{error && <p className="rounded-lg bg-[#fff5f1] p-2 text-xs text-[#a8412e]">{error}</p>}</div><form onSubmit={send} className="flex gap-2 border-t border-[#eadfd3] p-3"><input autoFocus value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask or update your dashboard..." aria-label="Message Gemini assistant" className="min-w-0 flex-1 rounded-lg border border-[#ddcfc1] bg-white px-3 py-2 text-sm outline-none focus:border-[#e76f51]" /><button disabled={busy || !input.trim()} className="rounded-lg bg-[#264653] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Send</button></form></section></div>}
  </>;
}
