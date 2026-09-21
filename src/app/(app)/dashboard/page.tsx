"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { readUserStorage } from "@/lib/userStorage";

type Item = Record<string, any>;
type DashboardData = {
  nutrition: { logs: Item[]; targets: Item };
  finance: { accounts: Item[]; transactions: Item[] };
  workout: { workouts: Item[] };
  time: { entries: Item[] };
  daily: { logs: Item[] };
};

const emptyData: DashboardData = {
  nutrition: { logs: [], targets: {} }, finance: { accounts: [], transactions: [] },
  workout: { workouts: [] }, time: { entries: [] }, daily: { logs: [] },
};
const today = () => new Date().toISOString().slice(0, 10);
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (value: number) => `BDT ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const minutes = (seconds: number) => `${Math.floor(seconds / 60)}m`;
const isDate = (item: Item, date: string) => item.date === date || String(item.start || "").startsWith(date);
const sum = (items: Item[], key: string) => items.reduce((total, item) => total + number(item[key]), 0);

function Card({ title, action, children }: { title: string; action?: { label: string; href: string }; children: ReactNode }) {
  const router = useRouter();
  return <section className="rounded-2xl border border-[#eadfd3] bg-[#fffdf9] p-5 shadow-[0_8px_30px_rgba(87,61,42,0.05)]"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold uppercase tracking-[0.13em] text-[#6e625a]">{title}</h2>{action && <button onClick={() => router.push(action.href)} className="text-xs font-semibold text-[#e76f51] hover:underline">{action.label} →</button>}</div>{children}</section>;
}
function Empty({ children }: { children: ReactNode }) { return <div className="rounded-xl border border-dashed border-[#ddcfc1] bg-[#fffaf3] px-4 py-6 text-center text-sm text-[#887a70]">{children}</div>; }
function Stat({ label, value, unit = "" }: { label: string; value: string | number; unit?: string }) { return <div className="rounded-xl bg-[#f8f0e7] p-3"><p className="text-xs uppercase tracking-wide text-[#887a70]">{label}</p><p className="mt-1 text-xl font-semibold">{value} <span className="text-xs font-normal text-[#887a70]">{unit}</span></p></div>; }
function Progress({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) { const percent = target ? Math.min(100, Math.round(value / target * 100)) : 0; return <div><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{target ? `${Math.round(value)} / ${target} ${unit}` : "No target set"}</span></div><div className="h-2 rounded-full bg-[#efe5da]"><div className="h-2 rounded-full bg-[#e76f51]" style={{ width: `${percent}%` }} /></div></div>; }

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [data, setData] = useState<DashboardData>(emptyData);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      const nutrition = readUserStorage<Item>("personal-life-nutrition-v1", user.uid, {});
      const finance = readUserStorage<Item>("personal-life-finance-v1", user.uid, {});
      const workout = readUserStorage<Item>("personal-life-workout-v1", user.uid, {});
      const time = readUserStorage<Item>("personal-life-time-v1", user.uid, {});
      const daily = readUserStorage<Item>("personal-life-daily-log-v1", user.uid, {});
      setData({ nutrition: { logs: nutrition.logs || [], targets: nutrition.targets || {} }, finance: { accounts: finance.accounts || [], transactions: finance.transactions || [] }, workout: { workouts: workout.workouts || [] }, time: { entries: time.entries || [] }, daily: { logs: daily.logs || [] } });
    };
    refresh();
    window.addEventListener("life-data-updated", refresh);
    return () => window.removeEventListener("life-data-updated", refresh);
  }, [user]);

  const nutritionLogs = useMemo(() => data.nutrition.logs.filter((item) => isDate(item, date)), [data.nutrition.logs, date]);
  const transactions = data.finance.transactions;
  const todayTransactions = transactions.filter((item) => item.date === date);
  const month = date.slice(0, 7);
  const income = (items: Item[]) => items.filter((item) => item.type === "income").reduce((total, item) => total + number(item.amount), 0);
  const expenses = (items: Item[]) => items.filter((item) => item.type === "expense").reduce((total, item) => total + number(item.amount), 0);
  const accountBalances: Item[] = useMemo(() => data.finance.accounts.map((account: Item) => ({ ...account, balance: number(account.starting) + transactions.reduce((total, item) => { if (item.type === "income" && item.account === account.id) return total + number(item.amount); if (item.type === "expense" && item.account === account.id) return total - number(item.amount); if (item.type === "transfer" && item.from === account.id) return total - number(item.amount); if (item.type === "transfer" && item.to === account.id) return total + number(item.amount); return total; }, 0) })), [data.finance.accounts, transactions]);
  const workouts = data.workout.workouts.filter((item) => item.date === date);
  const latestWorkout = workouts[0] || data.workout.workouts[0];
  const timeEntries = data.time.entries.filter((item) => isDate(item, date));
  const categorySeconds = (category: string) => timeEntries.filter((item) => String(item.activity).toLowerCase().includes(category.toLowerCase())).reduce((total, item) => total + number(item.duration), 0);
  const dailyLog = data.daily.logs.find((item) => item.date === date);
  const macros = [["Calories", sum(nutritionLogs, "calories"), number(data.nutrition.targets.calories), "kcal"], ["Protein", sum(nutritionLogs, "protein"), number(data.nutrition.targets.protein), "g"], ["Carbs", sum(nutritionLogs, "carbs"), number(data.nutrition.targets.carbs), "g"], ["Fat", sum(nutritionLogs, "fat"), number(data.nutrition.targets.fat), "g"], ["Fiber", sum(nutritionLogs, "fiber"), number(data.nutrition.targets.fiber), "g"]] as [string, number, number, string][];

  return <div className="mx-auto max-w-[1500px] space-y-6 text-[#2f2925]">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e76f51]">Personal command center</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Your life, at a glance.</h1><p className="mt-2 text-sm text-[#887a70]">A read-only overview assembled from each section.</p></div><div className="flex items-center gap-2"><label htmlFor="dashboard-date" className="text-sm text-[#887a70]">Viewing</label><input id="dashboard-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-[#ddcfc1] bg-[#fffdf9] px-3 py-2 text-sm" /></div></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Nutrition", "/nutrition"], ["Finance", "/finance"], ["Workout", "/workout"], ["Time tracking", "/time"]].map(([label, href]) => <button key={href} onClick={() => router.push(href)} className="rounded-xl border border-[#ddcfc1] bg-[#fffdf9] px-3 py-3 text-left text-sm font-semibold hover:border-[#e76f51]">{label} <span className="block text-xs font-normal text-[#887a70]">View records →</span></button>)}</div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Nutrition" action={{ label: "Open Nutrition", href: "/nutrition" }}>{nutritionLogs.length ? <><div className="grid gap-3 sm:grid-cols-5">{macros.map(([label, value, target, unit]) => <Stat key={label} label={label} value={Math.round(value)} unit={unit} />)}</div><div className="mt-5 space-y-3">{macros.map(([label, value, target, unit]) => <Progress key={label} label={label} value={value} target={target} unit={unit} />)}</div><div className="mt-5 border-t border-[#f0e7de] pt-4"><p className="mb-2 text-xs uppercase tracking-wide text-[#887a70]">Meals</p><div className="flex flex-wrap gap-2">{nutritionLogs.map((item) => <span key={item.id} className="rounded-full bg-[#f8f0e7] px-3 py-1 text-xs">{item.meal || "Meal"}: {item.foodName}</span>)}</div></div></> : <Empty>No nutrition data recorded today.</Empty>}</Card>
      <Card title="Finance" action={{ label: "Open Finance", href: "/finance" }}><div className="grid gap-3 sm:grid-cols-3"><Stat label="Total balance" value={money(accountBalances.reduce((total, item) => total + item.balance, 0))} /><Stat label="Today's income" value={money(income(todayTransactions))} /><Stat label="Today's expenses" value={money(expenses(todayTransactions))} /></div><div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#f0e7de] pt-4 text-sm"><div><p className="text-[#887a70]">Today's net</p><p className="font-semibold">{money(income(todayTransactions) - expenses(todayTransactions))}</p></div><div><p className="text-[#887a70]">Monthly flow</p><p className="font-semibold">{money(income(transactions.filter((item) => String(item.date).startsWith(month))) - expenses(transactions.filter((item) => String(item.date).startsWith(month))))}</p></div></div><div className="mt-4 space-y-2">{accountBalances.length ? accountBalances.map((account) => <div key={account.id} className="flex justify-between rounded-lg bg-[#f8f0e7] px-3 py-2 text-sm"><span>{account.name}</span><strong>{money(account.balance)}</strong></div>) : <Empty>No accounts recorded yet.</Empty>}</div></Card>
      <Card title="Workout" action={{ label: "View Workout", href: "/workout" }}>{workouts.length ? <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-2xl font-semibold">{latestWorkout.name}</p><p className="mt-1 text-sm text-[#887a70]">Today's workout completed</p></div><div className="grid grid-cols-2 gap-3"><Stat label="Duration" value={minutes(number(latestWorkout.duration))} /><Stat label="Exercises" value={latestWorkout.exercises?.length || 0} /><Stat label="Sets" value={latestWorkout.totalSets || 0} /><Stat label="Volume" value={latestWorkout.totalVolume || 0} unit="kg" /></div></div> : <Empty>No workout recorded today.</Empty>}{data.workout.workouts.length > 1 && <p className="mt-4 border-t border-[#f0e7de] pt-3 text-sm text-[#887a70]">Recent workout: <span className="font-medium text-[#2f2925]">{data.workout.workouts[0].name}</span>. Progress is shown in Workout when enough records exist.</p>}</Card>
      <Card title="Time tracking" action={{ label: "Open Time Tracking", href: "/time" }}>{timeEntries.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Total tracked" value={minutes(sum(timeEntries, "duration"))} />{["Study", "Work", "Business", "Coding", "Gym", "Sleep", "Free Time", "Other"].map((category) => { const value = category === "Other" ? Math.max(0, sum(timeEntries, "duration") - ["study", "work", "business", "coding", "gym", "sleep", "free time"].reduce((total, name) => total + categorySeconds(name), 0)) : categorySeconds(category); return <Stat key={category} label={category} value={minutes(value)} />; })}</div> : <Empty>No time entries recorded today.</Empty>}</Card>
      <Card title="Daily log" action={{ label: "Open Daily Log", href: "/daily-log" }}>{dailyLog ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Stat label="Sleep" value={number(dailyLog.sleep || dailyLog.sleepHours)} unit="h" /><Stat label="Wake-up" value={dailyLog.wakeTime || dailyLog.wakeUpTime || "-"} /><Stat label="Mood" value={dailyLog.mood || "-"} /><Stat label="Energy" value={`${number(dailyLog.energy)}/10`} /><Stat label="Rating" value={`${number(dailyLog.rating || dailyLog.dailyRating)}/10`} /><p className="col-span-2 text-sm text-[#887a70] sm:col-span-5">{dailyLog.notes || "No notes added."}</p></div> : <Empty>No daily log recorded today.</Empty>}</Card>
    </div>
  </div>;
}
