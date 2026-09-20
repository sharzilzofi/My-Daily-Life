"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { readActiveUserStorage } from "@/lib/userStorage";

type Item = Record<string, any>;
const money = (value: number) => `৳${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const values = (items: Item[], key: string) => items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);

function Bars({ values: data, color }: { values: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return <div className="flex h-44 items-end gap-2 border-b border-l border-[#eadfd3] px-2 pt-4">{data.map((value, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] text-[#887a70]">{value ? Math.round(value) : ""}</span><div className="w-full max-w-9 rounded-t" style={{ height: `${Math.max(value ? 5 : 1, value / max * 100)}%`, backgroundColor: value ? color : "#eee4da" }} /><span className="text-[10px] text-[#887a70]">{index + 1}</span></div>)}</div>;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [nutrition, setNutrition] = useState<Item[]>([]); const [transactions, setTransactions] = useState<Item[]>([]);
  const refresh = () => { if (!user) { setNutrition([]); setTransactions([]); return; } const nutritionStore = readActiveUserStorage<{ logs?: Item[] }>("personal-life-nutrition-v1", {}); const financeStore = readActiveUserStorage<{ transactions?: Item[] }>("personal-life-finance-v1", {}); setNutrition(nutritionStore.logs || []); setTransactions(financeStore.transactions || []); };
  useEffect(() => { refresh(); window.addEventListener("life-data-updated", refresh); return () => window.removeEventListener("life-data-updated", refresh); }, [user]);
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return date.toISOString().slice(0, 10); });
  const daily = (items: Item[], field: string) => days.map((date) => values(items.filter((item) => item.date === date), field));
  const expenses = transactions.filter((item) => item.type === "expense"); const income = transactions.filter((item) => item.type === "income");
  return <div className="mx-auto max-w-[1300px] space-y-6 text-[#2f2925]"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#e76f51]">Analytics</p><h1 className="mt-1 text-3xl font-semibold">Patterns worth noticing.</h1><p className="mt-2 text-sm text-[#887a70]">Every chart below is calculated from your stored records.</p></div><div className="grid gap-5 lg:grid-cols-2">{([ ["Calories", "calories", "#e76f51"], ["Protein", "protein", "#2a9d8f"], ["Carbs", "carbs", "#e9c46a"], ["Fat", "fat", "#264653"]] as [string, string, string][]).map(([label, field, color]) => <section key={field} className="rounded-2xl border border-[#eadfd3] bg-[#fffdf9] p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.13em] text-[#6e625a]">7-day {label.toLowerCase()}</h2>{nutrition.length ? <Bars values={daily(nutrition, field)} color={color} /> : <p className="py-12 text-center text-sm text-[#887a70]">No nutrition data available.</p>}</section>)}<section className="rounded-2xl border border-[#eadfd3] bg-[#fffdf9] p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.13em] text-[#6e625a]">Income vs expenses</h2>{transactions.length ? <div className="grid gap-5 sm:grid-cols-2"><div><p className="mb-2 text-sm text-[#2a9d8f]">Income {money(values(income, "amount"))}</p><Bars values={daily(income, "amount")} color="#2a9d8f" /></div><div><p className="mb-2 text-sm text-[#e76f51]">Expenses {money(values(expenses, "amount"))}</p><Bars values={daily(expenses, "amount")} color="#e76f51" /></div></div> : <p className="py-12 text-center text-sm text-[#887a70]">No transactions available.</p>}</section><section className="rounded-2xl border border-[#eadfd3] bg-[#fffdf9] p-5"><h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.13em] text-[#6e625a]">Spending by category</h2>{expenses.length ? Object.entries(expenses.reduce<Record<string, number>>((result, item) => { result[item.category] = (result[item.category] || 0) + Number(item.amount || 0); return result; }, {})).map(([category, amount]) => <div key={category} className="mb-3 flex items-center justify-between border-b border-[#f0e7de] pb-2 text-sm"><span>{category}</span><strong>{money(amount)}</strong></div>) : <p className="py-12 text-center text-sm text-[#887a70]">No spending data available.</p>}</section></div></div>;
}
