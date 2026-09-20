"use client";

import { addDoc, collection, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/AuthContext";
import { readUserStorage } from "@/lib/userStorage";

type RecordData = Record<string, any> & { id: string };
type Range = "today" | "yesterday" | "week" | "month" | "custom";
type Action = "food" | "expense" | "income" | "transfer" | "workout" | "activity" | "log";

const colors = ["#e76f51", "#2a9d8f", "#e9c46a", "#264653", "#f4a261"];
const dateKeys = ["date", "day", "createdAt", "timestamp", "startTime", "loggedAt"];

function asDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function recordDate(record: RecordData): Date | null {
  for (const key of dateKeys) {
    const date = asDate(record[key]);
    if (date) return date;
  }
  return null;
}

function number(record: RecordData, keys: string[]): number {
  const value = keys.map((key) => record[key]).find((item) => item !== undefined && item !== null && item !== "");
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(record: RecordData, keys: string[], fallback = "Untitled"): string {
  const value = keys.map((key) => record[key]).find((item) => item !== undefined && item !== null && item !== "");
  return value === undefined ? fallback : String(value);
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#eadfd3] bg-[#fffdf9] p-5 shadow-[0_8px_30px_rgba(87,61,42,0.05)] ${className}`}><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold uppercase tracking-[0.13em] text-[#6e625a]">{title}</h2></div>{children}</section>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-[#ddcfc1] bg-[#fffaf3] px-4 py-6 text-center text-sm text-[#887a70]">{children}</div>;
}

function Progress({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const percent = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return <div className="space-y-1.5"><div className="flex justify-between text-sm"><span className="text-[#51463e]">{label}</span><span className="font-medium text-[#2f2925]">{target ? `${Math.round(value)} / ${target} ${unit}` : "No target set"}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#efe5da]"><div className="h-full rounded-full bg-[#e76f51] transition-all" style={{ width: `${percent}%` }} /></div></div>;
}

function BarChart({ values, labels, color = "#2a9d8f", prefix = "" }: { values: number[]; labels: string[]; color?: string; prefix?: string }) {
  const max = Math.max(...values, 1);
  return <div className="flex h-40 items-end gap-2 border-b border-l border-[#eadfd3] px-2 pb-0 pt-5">{values.map((value, index) => <div key={`${labels[index]}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] text-[#8a7b70]">{value ? `${prefix}${Math.round(value)}` : ""}</span><div className="w-full max-w-8 rounded-t-md transition-all" style={{ height: `${Math.max(value ? 5 : 1, (value / max) * 100)}%`, backgroundColor: value ? color : "#eee4da" }} /><span className="text-[10px] text-[#8a7b70]">{labels[index]}</span></div>)}</div>;
}

function Modal({ action, close, save }: { action: Action; close: () => void; save: (data: Record<string, any>) => Promise<void> }) {
  const [form, setForm] = useState<Record<string, any>>({ date: new Date().toISOString().slice(0, 10) });
  const set = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => { event.preventDefault(); await save(form); close(); };
  const titles: Record<Action, string> = { food: "Add food", expense: "Add expense", income: "Add income", transfer: "Transfer money", workout: "Start workout", activity: "Start activity", log: "Add daily log" };
  return <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#33251f]/40 p-4"><form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#fffdf9] p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold text-[#2f2925]">{titles[action]}</h2><button type="button" onClick={close} className="text-2xl text-[#8a7b70]" aria-label="Close">×</button></div><div className="grid gap-4 sm:grid-cols-2">
    {action === "food" && <><Field label="Food name" name="name" value={form.name} set={set} required /><Field label="Calories" name="calories" type="number" value={form.calories} set={set} required /><Field label="Protein (g)" name="protein" type="number" value={form.protein} set={set} /><Field label="Carbs (g)" name="carbs" type="number" value={form.carbs} set={set} /><Field label="Fat (g)" name="fat" type="number" value={form.fat} set={set} /><Field label="Fiber (g)" name="fiber" type="number" value={form.fiber} set={set} /> </>}
    {(action === "expense" || action === "income") && <><Field label="Description" name="description" value={form.description} set={set} required /><Field label="Amount" name="amount" type="number" value={form.amount} set={set} required /><Field label="Account" name="account" value={form.account} set={set} placeholder="Cash, bank, bKash..." /><Field label="Category" name="category" value={form.category} set={set} placeholder="Food, salary..." /></>}
    {action === "transfer" && <><Field label="Amount" name="amount" type="number" value={form.amount} set={set} required /><Field label="From account" name="fromAccount" value={form.fromAccount} set={set} required /><Field label="To account" name="toAccount" value={form.toAccount} set={set} required /><Field label="Note" name="description" value={form.description} set={set} /></>}
    {(action === "workout" || action === "activity") && <><Field label="Name" name="name" value={form.name} set={set} required /><Field label="Duration (minutes)" name="duration" type="number" value={form.duration} set={set} required /><Field label="Exercises" name="exercises" type="number" value={form.exercises} set={set} /><Field label="Sets" name="sets" type="number" value={form.sets} set={set} /><Field label="Volume" name="volume" type="number" value={form.volume} set={set} /><Field label="Category" name="category" value={form.category} set={set} placeholder="Gym, study, coding..." /></>}
    {action === "log" && <><Field label="Sleep time (hours)" name="sleep" type="number" value={form.sleep} set={set} /><Field label="Wake-up time" name="wakeTime" type="time" value={form.wakeTime} set={set} /><Field label="Mood" name="mood" value={form.mood} set={set} /><Field label="Energy (1-10)" name="energy" type="number" value={form.energy} set={set} /><Field label="Daily rating (1-10)" name="rating" type="number" value={form.rating} set={set} /><label className="sm:col-span-2"><span className="mb-1 block text-sm text-[#51463e]">Notes</span><textarea name="notes" value={form.notes || ""} onChange={(event) => set("notes", event.target.value)} className="min-h-24 w-full rounded-lg border border-[#ddcfc1] bg-white px-3 py-2 text-sm outline-none focus:border-[#e76f51]" /></label></>}
    <Field label="Date" name="date" type="date" value={form.date} set={set} required /></div><button className="mt-6 w-full rounded-lg bg-[#264653] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1e3944]">Save record</button></form></div>;
}

function Field({ label, name, type = "text", value, set, required = false, placeholder = "" }: { label: string; name: string; type?: string; value?: any; set: (key: string, value: any) => void; required?: boolean; placeholder?: string }) {
  return <label><span className="mb-1 block text-sm text-[#51463e]">{label}</span><input required={required} type={type} value={value || ""} placeholder={placeholder} onChange={(event) => set(name, event.target.value)} className="w-full rounded-lg border border-[#ddcfc1] bg-white px-3 py-2 text-sm outline-none focus:border-[#e76f51]" /></label>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<Record<string, RecordData[]>>({ nutrition: [], transactions: [], workouts: [], timeEntries: [], dailyLogs: [] });
  const [range, setRange] = useState<Range>("today");
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    const firestore = db;
    const names = ["nutrition", "transactions", "workouts", "timeEntries", "dailyLogs"];
    const refreshLocal = () => {
      try {
        const nutrition = readUserStorage<Record<string, any>>("personal-life-nutrition-v1", user.uid, {});
        const finance = readUserStorage<Record<string, any>>("personal-life-finance-v1", user.uid, {});
        const workout = readUserStorage<Record<string, any>>("personal-life-workout-v1", user.uid, {});
        const time = readUserStorage<Record<string, any>>("personal-life-time-v1", user.uid, {});
        const accounts = Object.fromEntries((finance.accounts || []).map((account: RecordData) => [account.id, account.name]));
        const localNutrition = (nutrition.logs || []).map((item: RecordData) => ({ ...item, date: item.date, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber }));
        const localTransactions = (finance.transactions || []).map((item: RecordData) => ({ ...item, account: accounts[item.account] || item.account, fromAccount: accounts[item.from] || item.from, toAccount: accounts[item.to] || item.to }));
        const localWorkouts = (workout.workouts || []).map((item: RecordData) => ({ ...item, date: item.date, duration: item.duration / 60, exercises: item.exercises?.length || 0, sets: item.totalSets, volume: item.totalVolume }));
        const localTime = (time.entries || []).map((item: RecordData) => ({ ...item, date: item.date, duration: item.duration / 60, category: item.activity }));
        setRecords((current) => ({ ...current, nutrition: localNutrition, transactions: localTransactions, workouts: localWorkouts, timeEntries: localTime }));
      } catch {
        // Ignore malformed optional local data and keep Firestore records visible.
      }
    };
    const unsubscribes = names.map((name) => onSnapshot(collection(firestore, "users", user.uid, name), (snapshot) => {
      setRecords((current) => ({ ...current, [name]: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) }));
      setLoading(false);
    }, () => setLoading(false)));
    refreshLocal();
    window.addEventListener("life-data-updated", refreshLocal);
    return () => { unsubscribes.forEach((unsubscribe) => unsubscribe()); window.removeEventListener("life-data-updated", refreshLocal); };
  }, [user]);

  const selected = useMemo(() => {
    const today = startOfDay(new Date());
    let start = today;
    let end = new Date(today.getTime() + 86400000);
    if (range === "yesterday") { start = new Date(today.getTime() - 86400000); end = today; }
    if (range === "week") { start = new Date(today); start.setDate(start.getDate() - 6); }
    if (range === "month") start = new Date(today.getFullYear(), today.getMonth(), 1);
    if (range === "custom") { start = startOfDay(new Date(`${customDate}T00:00:00`)); end = new Date(start.getTime() + 86400000); }
    return { start, end };
  }, [range, customDate]);

  const inRange = (record: RecordData) => { const date = recordDate(record); return date ? date >= selected.start && date < selected.end : false; };
  const data = useMemo(() => Object.fromEntries(Object.entries(records).map(([key, values]) => [key, values.filter(inRange)])) as typeof records, [records, selected]);
  const chartDays = useMemo(() => Array.from({ length: 7 }, (_, index) => { const date = startOfDay(new Date()); date.setDate(date.getDate() - (6 - index)); return date; }), []);
  const dayRecords = (collectionName: string, date: Date) => records[collectionName].filter((record) => { const recordDay = recordDate(record); return recordDay && startOfDay(recordDay).getTime() === date.getTime(); });
  const nutrition = useMemo(() => ({ calories: data.nutrition.reduce((sum, item) => sum + number(item, ["calories", "calorie"]), 0), protein: data.nutrition.reduce((sum, item) => sum + number(item, ["protein", "proteinGrams"]), 0), carbs: data.nutrition.reduce((sum, item) => sum + number(item, ["carbs", "carbohydrates"]), 0), fat: data.nutrition.reduce((sum, item) => sum + number(item, ["fat", "fatGrams"]), 0), fiber: data.nutrition.reduce((sum, item) => sum + number(item, ["fiber", "fiberGrams"]), 0), targets: { calories: number(data.nutrition[0] || {}, ["targetCalories", "dailyCalories"]), protein: number(data.nutrition[0] || {}, ["targetProtein", "proteinTarget"]), carbs: number(data.nutrition[0] || {}, ["targetCarbs", "carbsTarget"]), fat: number(data.nutrition[0] || {}, ["targetFat", "fatTarget"]), fiber: number(data.nutrition[0] || {}, ["targetFiber", "fiberTarget"]) } }), [data.nutrition]);
  const transactions = data.transactions.filter((item) => text(item, ["type", "transactionType"], "expense").toLowerCase() !== "transfer");
  const income = transactions.filter((item) => text(item, ["type", "transactionType"]).toLowerCase() === "income").reduce((sum, item) => sum + number(item, ["amount", "value"]), 0);
  const expenses = transactions.filter((item) => text(item, ["type", "transactionType"], "expense").toLowerCase() === "expense").reduce((sum, item) => sum + number(item, ["amount", "value"]), 0);
  const accountBalances = useMemo(() => { const result: Record<string, number> = {}; records.transactions.forEach((item) => { const amount = number(item, ["amount", "value"]); const type = text(item, ["type", "transactionType"], "expense").toLowerCase(); const account = text(item, ["account", "accountName"], "Other"); if (type === "transfer") { const from = text(item, ["fromAccount"], "Other"); const to = text(item, ["toAccount"], "Other"); result[from] = (result[from] || 0) - amount; result[to] = (result[to] || 0) + amount; } else result[account] = (result[account] || 0) + (type === "income" ? amount : -amount); }); return result; }, [records.transactions]);
  const totalTime = data.timeEntries.reduce((sum, item) => sum + number(item, ["duration", "minutes", "hours"]) * (item.hours !== undefined ? 60 : 1), 0);
  const categoryTime = (category: string) => data.timeEntries.filter((item) => text(item, ["category", "type", "name"], "Other").toLowerCase().includes(category.toLowerCase())).reduce((sum, item) => sum + number(item, ["duration", "minutes", "hours"]) * (item.hours !== undefined ? 60 : 1), 0);
  const dailyLog = data.dailyLogs[0];
  const latest = [...records.nutrition.map((item) => ({ ...item, kind: "Food", label: text(item, ["name", "food"]), when: recordDate(item) })), ...records.transactions.map((item) => ({ ...item, kind: "Transaction", label: text(item, ["description", "merchant", "category"]), when: recordDate(item) })), ...records.workouts.map((item) => ({ ...item, kind: "Workout", label: text(item, ["name", "workout"]), when: recordDate(item) })), ...records.timeEntries.map((item) => ({ ...item, kind: "Time", label: text(item, ["name", "activity", "category"]), when: recordDate(item) })), ...records.dailyLogs.map((item) => ({ ...item, kind: "Daily log", label: "Daily check-in", when: recordDate(item) }))].filter((item) => item.when).sort((a, b) => b.when!.getTime() - a.when!.getTime()).slice(0, 8);
  const chartValues = (collectionName: string, keys: string[]) => chartDays.map((day) => dayRecords(collectionName, day).reduce((sum, item) => sum + number(item, keys), 0));
  const save = async (form: Record<string, any>) => { if (!user || !action || !db) return; const collectionName = action === "food" ? "nutrition" : action === "log" ? "dailyLogs" : action === "workout" || action === "activity" ? "workouts" : "transactions"; await addDoc(collection(db, "users", user.uid, collectionName), { ...form, type: action === "expense" ? "expense" : action === "income" ? "income" : action === "transfer" ? "transfer" : action, createdAt: serverTimestamp() }); };
  const rangeLabel = range === "today" ? "Today" : range === "yesterday" ? "Yesterday" : range === "week" ? "This week" : range === "month" ? "This month" : customDate;

  return <div className="mx-auto max-w-[1500px] space-y-6 text-[#2f2925]">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e76f51]">Personal command center</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Good morning, {user?.displayName?.split(" ")[0] || "there"}.</h1><p className="mt-2 text-sm text-[#887a70]">A quiet read on the life you are building. {loading ? "Syncing your records..." : `${rangeLabel} at a glance.`}</p></div><div className="flex flex-wrap items-center gap-2"><select value={range} onChange={(event) => setRange(event.target.value as Range)} className="rounded-lg border border-[#ddcfc1] bg-[#fffdf9] px-3 py-2 text-sm"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">This Week</option><option value="month">This Month</option><option value="custom">Custom Date</option></select>{range === "custom" && <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} className="rounded-lg border border-[#ddcfc1] bg-[#fffdf9] px-3 py-2 text-sm" />}</div></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{([ ["food", "Add Food"], ["expense", "Add Expense"], ["income", "Add Income"], ["transfer", "Transfer Money"], ["workout", "Start Workout"], ["activity", "Start Activity"], ["log", "Add Daily Log"]] as [Action, string][]).map(([key, label]) => <button key={key} onClick={() => setAction(key)} className="rounded-xl border border-[#ddcfc1] bg-[#fffdf9] px-3 py-3 text-left text-xs font-semibold text-[#51463e] transition hover:-translate-y-0.5 hover:border-[#e76f51] hover:text-[#e76f51]">＋ {label}</button>)}</div>
    <div className="grid gap-5 xl:grid-cols-2"><Card title="Nutrition"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-3xl font-semibold">{Math.round(nutrition.calories)} <span className="text-sm font-normal text-[#887a70]">kcal</span></p><p className="mt-1 text-sm text-[#887a70]">{data.nutrition.length ? "Consumed" : "No nutrition data for this day"}</p><p className="mt-4 text-xs text-[#887a70]">Targets are read from your nutrition records.</p></div><div className="space-y-3"><Progress label="Calories" value={nutrition.calories} target={nutrition.targets.calories} unit="kcal" /><Progress label="Protein" value={nutrition.protein} target={nutrition.targets.protein} unit="g" /><Progress label="Carbs" value={nutrition.carbs} target={nutrition.targets.carbs} unit="g" /><Progress label="Fat" value={nutrition.fat} target={nutrition.targets.fat} unit="g" /><Progress label="Fiber" value={nutrition.fiber} target={nutrition.targets.fiber} unit="g" /></div></div></Card>
      <Card title="Finance"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-3xl font-semibold">{money(Object.values(accountBalances).reduce((sum, value) => sum + value, 0))}</p><p className="mt-1 text-sm text-[#887a70]">Total current balance</p></div><div className="grid grid-cols-2 gap-2 text-sm">{Object.entries(accountBalances).length ? Object.entries(accountBalances).map(([name, balance]) => <div key={name} className="rounded-lg bg-[#f8f0e7] p-2"><p className="text-[#887a70]">{name}</p><p className="font-semibold">{money(balance)}</p></div>) : <Empty>No transactions recorded</Empty>}</div></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#eadfd3] pt-4 text-sm"><div><p className="text-[#887a70]">Income</p><p className="font-semibold text-[#2a9d8f]">{money(income)}</p></div><div><p className="text-[#887a70]">Expenses</p><p className="font-semibold text-[#e76f51]">{money(expenses)}</p></div><div><p className="text-[#887a70]">Net flow</p><p className="font-semibold">{money(income - expenses)}</p></div></div></Card>
      <Card title="Workout"><div className="flex items-center justify-between"><div><p className="text-2xl font-semibold">{data.workouts.length ? "Completed" : "No workout recorded"}</p><p className="mt-1 text-sm text-[#887a70]">{data.workouts.length ? text(data.workouts[0], ["name", "workout"]) : "Start a session when you are ready"}</p></div>{data.workouts.length > 0 && <div className="text-right text-sm text-[#887a70]"><p>{number(data.workouts[0], ["duration", "minutes"])} min</p><p>{number(data.workouts[0], ["exercises"])} exercises · {number(data.workouts[0], ["sets"])} sets</p><p>{number(data.workouts[0], ["volume"])} volume</p></div>}</div></Card>
      <Card title="Time tracked"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Total" value={`${Math.round(totalTime / 60)}h`} /><Metric label="Study" value={`${Math.round(categoryTime("study") / 60)}h`} /><Metric label="Work / business" value={`${Math.round(categoryTime("work") / 60)}h`} /><Metric label="Coding" value={`${Math.round(categoryTime("coding") / 60)}h`} /><Metric label="Gym" value={`${Math.round(categoryTime("gym") / 60)}h`} /><Metric label="Sleep" value={`${Math.round(categoryTime("sleep") / 60)}h`} /><Metric label="Free" value={`${Math.round(categoryTime("free") / 60)}h`} /><Metric label="Other" value={`${Math.round(Math.max(0, totalTime - ["study", "work", "coding", "gym", "sleep", "free"].reduce((sum, category) => sum + categoryTime(category), 0)) / 60)}h`} /></div>{!data.timeEntries.length && <div className="mt-4"><Empty>No tracked time for this day</Empty></div>}</Card>
      <Card title="Daily life"><div className="grid grid-cols-2 gap-4 sm:grid-cols-5"><Metric label="Sleep" value={dailyLog ? `${number(dailyLog, ["sleep", "sleepHours"])}h` : "—"} /><Metric label="Wake-up" value={dailyLog ? text(dailyLog, ["wakeTime", "wakeUpTime"], "—") : "—"} /><Metric label="Mood" value={dailyLog ? text(dailyLog, ["mood"], "—") : "—"} /><Metric label="Energy" value={dailyLog ? `${number(dailyLog, ["energy"])}/10` : "—"} /><Metric label="Rating" value={dailyLog ? `${number(dailyLog, ["rating", "dailyRating"])}/10` : "—"} /></div><p className="mt-4 text-sm text-[#887a70]">{dailyLog?.notes ? "Notes added to today’s log" : "No notes added"}</p></Card></div>
    <div className="grid gap-5 xl:grid-cols-2"><Card title="7-day calorie intake"><BarChart values={chartValues("nutrition", ["calories", "calorie"])} labels={chartDays.map(dateLabel)} color="#e76f51" /></Card><Card title="7-day protein intake"><BarChart values={chartValues("nutrition", ["protein", "proteinGrams"])} labels={chartDays.map(dateLabel)} color="#2a9d8f" /></Card><Card title="Income vs expenses"><div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-sm text-[#887a70]">Income</p><BarChart values={chartDays.map((day) => dayRecords("transactions", day).filter((item) => text(item, ["type", "transactionType"]).toLowerCase() === "income").reduce((sum, item) => sum + number(item, ["amount"]), 0))} labels={chartDays.map(dateLabel)} color="#2a9d8f" prefix="$" /></div><div><p className="mb-2 text-sm text-[#887a70]">Expenses</p><BarChart values={chartDays.map((day) => dayRecords("transactions", day).filter((item) => text(item, ["type", "transactionType"], "expense").toLowerCase() === "expense").reduce((sum, item) => sum + number(item, ["amount"]), 0))} labels={chartDays.map(dateLabel)} color="#e76f51" prefix="$" /></div></div></Card><Card title="Spending by category"><div className="space-y-2">{Object.entries(data.transactions.filter((item) => text(item, ["type", "transactionType"], "expense").toLowerCase() === "expense").reduce<Record<string, number>>((result, item) => { const category = text(item, ["category"], "Other"); result[category] = (result[category] || 0) + number(item, ["amount"]); return result; }, {})).map(([category, amount], index) => <div key={category} className="flex items-center gap-3 text-sm"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="flex-1">{category}</span><span className="font-semibold">{money(amount)}</span></div>)}{!expenses && <Empty>No spending data for this day</Empty>}</div></Card><Card title="Workout frequency"><BarChart values={chartDays.map((day) => dayRecords("workouts", day).length)} labels={chartDays.map(dateLabel)} color="#264653" /></Card><Card title="Time distribution"><BarChart values={[categoryTime("study"), categoryTime("work"), categoryTime("coding"), categoryTime("gym"), categoryTime("sleep"), categoryTime("free")]} labels={["Study", "Work", "Code", "Gym", "Sleep", "Free"]} color="#e9c46a" /></Card></div>
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><Card title="Daily snapshot"><div className="space-y-4">{[...data.dailyLogs.map((item) => ({ label: "Daily check-in", value: text(item, ["mood"], "Logged"), date: recordDate(item) })), ...data.timeEntries.map((item) => ({ label: text(item, ["category", "type"], "Activity"), value: `${number(item, ["duration", "minutes"])} min`, date: recordDate(item) })), ...data.workouts.map((item) => ({ label: "Workout", value: text(item, ["name", "workout"]), date: recordDate(item) })), ...data.nutrition.map((item) => ({ label: "Food", value: text(item, ["name", "food"]), date: recordDate(item) })), ...data.transactions.map((item) => ({ label: text(item, ["type", "transactionType"], "Transaction"), value: `${money(number(item, ["amount"]))} ${text(item, ["description", "category"], "")}`, date: recordDate(item) }))].filter((item) => item.date).sort((a, b) => a.date!.getTime() - b.date!.getTime()).map((item, index) => <div key={`${item.label}-${index}`} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#e76f51] ring-4 ring-[#f9eee4]" /><div><p className="text-sm font-semibold">{item.label}</p><p className="text-sm text-[#887a70]">{item.value}</p></div></div>)}{!data.dailyLogs.length && !data.timeEntries.length && !data.workouts.length && !data.nutrition.length && !data.transactions.length && <Empty>Nothing recorded for this day</Empty>}</div></Card><Card title="Recent activity"><div className="space-y-3">{latest.map((item) => <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between border-b border-[#f0e7de] pb-3 last:border-0 last:pb-0"><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-[#887a70]">{item.kind}</p></div><span className="text-xs text-[#887a70]">{item.when && dateLabel(item.when)}</span></div>)}{!latest.length && <Empty>No recent activity yet</Empty>}</div></Card></div>
    {action && <Modal action={action} close={() => setAction(null)} save={save} />}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-[#887a70]">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>; }
