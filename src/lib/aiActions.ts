import { readUserStorage, writeUserStorage } from "@/lib/userStorage";

type RecordData = Record<string, any>;

const keys = {
  nutrition: "personal-life-nutrition-v1",
  finance: "personal-life-finance-v1",
  workout: "personal-life-workout-v1",
  time: "personal-life-time-v1",
  daily: "personal-life-daily-log-v1",
} as const;

const today = () => new Date().toISOString().slice(0, 10);
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const dateOf = (item: RecordData) => item.date || String(item.start || "").slice(0, 10);
const read = (key: string, userId: string) => readUserStorage<RecordData>(key, userId, {});
const write = (key: string, userId: string, value: RecordData) => writeUserStorage(key, userId, value);
const same = (left: unknown, right: unknown) => String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();

function allRecords(userId: string) {
  const nutrition = read(keys.nutrition, userId);
  const finance = read(keys.finance, userId);
  const workout = read(keys.workout, userId);
  const time = read(keys.time, userId);
  const daily = read(keys.daily, userId);
  return [
    ...(nutrition.logs || []).map((item: RecordData) => ({ ...item, section: "Nutrition", collection: "logs", title: item.foodName })),
    ...(finance.transactions || []).map((item: RecordData) => ({ ...item, section: "Finance", collection: "transactions", title: item.category || item.source || item.type })),
    ...(workout.workouts || []).map((item: RecordData) => ({ ...item, section: "Workout", collection: "workouts", title: item.name })),
    ...(time.entries || []).map((item: RecordData) => ({ ...item, section: "Time Tracking", collection: "entries", title: item.activity })),
    ...(daily.logs || []).map((item: RecordData) => ({ ...item, section: "Daily Log", collection: "logs", title: item.mood || "Daily log" })),
  ];
}

function summarize(userId: string, date = today()) {
  const nutrition = read(keys.nutrition, userId);
  const finance = read(keys.finance, userId);
  const workout = read(keys.workout, userId);
  const time = read(keys.time, userId);
  const daily = read(keys.daily, userId);
  const meals = (nutrition.logs || []).filter((item: RecordData) => dateOf(item) === date);
  const transactions = (finance.transactions || []).filter((item: RecordData) => item.date === date);
  const entries = (time.entries || []).filter((item: RecordData) => dateOf(item) === date);
  const workouts = (workout.workouts || []).filter((item: RecordData) => item.date === date);
  return {
    date,
    nutrition: { meals: meals.map((item: RecordData) => item.foodName), calories: meals.reduce((sum: number, item: RecordData) => sum + number(item.calories), 0), protein: meals.reduce((sum: number, item: RecordData) => sum + number(item.protein), 0) },
    finance: { income: transactions.filter((item: RecordData) => item.type === "income").reduce((sum: number, item: RecordData) => sum + number(item.amount), 0), expenses: transactions.filter((item: RecordData) => item.type === "expense").reduce((sum: number, item: RecordData) => sum + number(item.amount), 0), accounts: finance.accounts || [] },
    workout: workouts.map((item: RecordData) => ({ name: item.name, durationMinutes: Math.round(number(item.duration) / 60), sets: item.totalSets || 0, volume: item.totalVolume || 0 })),
    time: { totalMinutes: Math.round(entries.reduce((sum: number, item: RecordData) => sum + number(item.duration), 0) / 60), activities: entries.map((item: RecordData) => ({ activity: item.activity, minutes: Math.round(number(item.duration) / 60) })) },
    dailyLog: (daily.logs || []).find((item: RecordData) => dateOf(item) === date) || null,
  };
}

function accountId(accounts: RecordData[], name: string) {
  return accounts.find((account) => same(account.name, name))?.id;
}

function addNutrition(userId: string, args: RecordData) {
  const store = read(keys.nutrition, userId);
  const foods = store.foods || [];
  const requested = Array.isArray(args.items) ? args.items : [args];
  const logs = requested.map((item: RecordData) => {
    const food = foods.find((value: RecordData) => same(value.name, item.foodName) || String(value.name || "").toLowerCase().includes(String(item.foodName || "").toLowerCase()));
    if (!food) throw new Error(`I could not find “${item.foodName}” in your Nutrition food database. Add it there first so I do not invent nutrition values.`);
    const quantity = number(item.quantity);
    const ratio = food.base ? quantity / food.base : 0;
    return { id: id(), foodId: food.id, foodName: food.name, quantity, unit: item.unit || food.unit, meal: item.meal || "Other", date: item.date || today(), time: item.time || "", notes: item.notes || "", category: food.category, calories: food.calories * ratio, protein: food.protein * ratio, carbs: food.carbs * ratio, fat: food.fat * ratio, fiber: food.fiber * ratio };
  });
  write(keys.nutrition, userId, { ...store, logs: [...logs, ...(store.logs || [])] });
  return { added: logs.map((item) => ({ foodName: item.foodName, quantity: item.quantity, unit: item.unit, meal: item.meal, calories: Math.round(item.calories) })) };
}

function addFinance(userId: string, args: RecordData) {
  const store = read(keys.finance, userId);
  const type = args.type === "income" ? "income" : args.type === "transfer" ? "transfer" : "expense";
  const value: RecordData = { id: id(), amount: number(args.amount), type, source: args.source || "", category: args.category || "Other", date: args.date || today(), time: args.time || "", note: args.note || "" };
  if (value.amount <= 0) throw new Error("The finance amount must be greater than zero.");
  if (type === "transfer") { const from = accountId(store.accounts || [], args.fromAccount); const to = accountId(store.accounts || [], args.toAccount); if (!from || !to || from === to) throw new Error("I could not match two different existing Finance accounts for that transfer."); value.from = from; value.to = to; }
  else { const account = accountId(store.accounts || [], args.accountName); if (!account) throw new Error(`I could not find an existing Finance account named “${args.accountName}”.`); value.account = account; }
  write(keys.finance, userId, { ...store, transactions: [value, ...(store.transactions || [])] });
  return { added: { type, amount: value.amount, category: value.category, date: value.date } };
}

function addTime(userId: string, args: RecordData) {
  const store = read(keys.time, userId);
  const date = args.date || today();
  const start = new Date(`${date}T${args.start || "09:00"}`);
  const end = new Date(`${date}T${args.end || "10:00"}`);
  const duration = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  if (!args.activity || duration <= 0) throw new Error("A time entry needs an activity and an end time after its start time.");
  const entry = { id: id(), activity: args.activity, date, start: start.toISOString(), end: end.toISOString(), duration, notes: args.notes || "" };
  write(keys.time, userId, { ...store, entries: [entry, ...(store.entries || [])] });
  return { added: { activity: entry.activity, minutes: Math.round(duration / 60), date } };
}

function addWorkout(userId: string, args: RecordData) {
  const store = read(keys.workout, userId);
  const duration = number(args.durationMinutes);
  if (!args.name || duration <= 0) throw new Error("A workout needs a name and a duration greater than zero.");
  const workout = { id: id(), name: args.name, date: args.date || today(), start: new Date().toISOString(), end: new Date(Date.now() + duration * 60000).toISOString(), duration: duration * 60, notes: args.notes || "Added by Gemini assistant", exercises: [], totalVolume: 0, totalSets: 0, totalReps: 0 };
  write(keys.workout, userId, { ...store, workouts: [workout, ...(store.workouts || [])] });
  return { added: { name: workout.name, durationMinutes: duration, date: workout.date } };
}

function updateDailyLog(userId: string, args: RecordData) {
  const store = read(keys.daily, userId);
  const date = args.date || today();
  const existing = (store.logs || []).find((item: RecordData) => item.date === date);
  const value = { ...(existing || {}), id: existing?.id || id(), date, ...(args.sleepHours !== undefined ? { sleep: number(args.sleepHours) } : {}), ...(args.wakeTime !== undefined ? { wakeTime: args.wakeTime } : {}), ...(args.mood !== undefined ? { mood: args.mood } : {}), ...(args.energy !== undefined ? { energy: number(args.energy) } : {}), ...(args.rating !== undefined ? { rating: number(args.rating) } : {}), ...(args.notes !== undefined ? { notes: args.notes } : {}) };
  write(keys.daily, userId, { ...store, logs: existing ? store.logs.map((item: RecordData) => item.id === existing.id ? value : item) : [value, ...(store.logs || [])] });
  return { updated: value };
}

function editRecord(userId: string, args: RecordData) {
  const key = keys[args.section as keyof typeof keys];
  if (!key || !args.recordId || !args.patch || typeof args.patch !== "object") throw new Error("I need a valid section, record ID, and patch to edit a record.");
  const store = read(key, userId);
  const collection = Array.isArray(store[args.collection]) ? args.collection : args.section === "finance" ? "transactions" : args.section === "nutrition" ? "logs" : args.section === "workout" ? "workouts" : args.section === "time" ? "entries" : "logs";
  if (!Array.isArray(store[collection]) || !store[collection].some((item: RecordData) => item.id === args.recordId)) throw new Error("I could not find that record.");
  write(key, userId, { ...store, [collection]: store[collection].map((item: RecordData) => item.id === args.recordId ? { ...item, ...args.patch, id: item.id } : item) });
  return { edited: { section: args.section, collection, recordId: args.recordId, patch: args.patch } };
}

function deleteRecord(userId: string, args: RecordData) {
  const key = keys[args.section as keyof typeof keys];
  if (!key || !args.recordId) throw new Error("I need a valid section and record ID to delete a record.");
  const store = read(key, userId);
  const collection = args.collection || (args.section === "finance" ? "transactions" : args.section === "nutrition" ? "logs" : args.section === "workout" ? "workouts" : args.section === "time" ? "entries" : "logs");
  if (!Array.isArray(store[collection]) || !store[collection].some((item: RecordData) => item.id === args.recordId)) throw new Error("I could not find that record.");
  write(key, userId, { ...store, [collection]: store[collection].filter((item: RecordData) => item.id !== args.recordId) });
  return { deleted: { section: args.section, collection, recordId: args.recordId } };
}

export function executeAiTool(userId: string, name: string, args: RecordData) {
  if (name === "getSummary") return summarize(userId, args.date || today());
  if (name === "searchRecords") return allRecords(userId).filter((item) => { const query = String(args.query || "").toLowerCase(); return !query || `${item.title} ${item.section} ${item.type || ""} ${dateOf(item)}`.toLowerCase().includes(query); }).slice(0, 20);
  if (name === "addNutrition") return addNutrition(userId, args);
  if (name === "addFinance") return addFinance(userId, args);
  if (name === "addTime") return addTime(userId, args);
  if (name === "addWorkout") return addWorkout(userId, args);
  if (name === "updateDailyLog") return updateDailyLog(userId, args);
  if (name === "editRecord") return editRecord(userId, args);
  if (name === "deleteRecord") return deleteRecord(userId, args);
  throw new Error(`Unknown assistant action: ${name}`);
}

export const mutatingAiTools = new Set(["addNutrition", "addFinance", "addTime", "addWorkout", "updateDailyLog", "editRecord", "deleteRecord"]);
