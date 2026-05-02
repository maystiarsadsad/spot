"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOverviewStats(businessId: string) {
  const supabase = await createClient();

  const [contactsRes, expensesRes, itemsRes, employeesRes, transactionsRes] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact" }).eq("business_id", businessId),
    supabase.from("expenses").select("amount").eq("business_id", businessId),
    supabase.from("catalog_items").select("id", { count: "exact" }).eq("business_id", businessId),
    supabase.from("employees").select("id", { count: "exact" }).eq("business_id", businessId),
    supabase.from("transactions").select("total, status").eq("business_id", businessId),
  ]);

  const totalExpenses = expensesRes.data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
  
  // Calculate real revenue from completed transactions
  const completedTx = (transactionsRes.data || []).filter(
    (t) => t.status === "completed" || t.status === "paid"
  );
  const totalRevenue = completedTx.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalTransactions = completedTx.length;

  return {
    totalContacts: contactsRes.count || 0,
    totalExpenses,
    totalItems: itemsRes.count || 0,
    totalEmployees: employeesRes.count || 0,
    totalRevenue,
    totalTransactions,
  };
}

export async function getExpensesByCategory(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("category, amount")
    .eq("business_id", businessId);

  if (error || !data) return [];

  const grouped = data.reduce((acc: any, curr) => {
    const cat = curr.category || "Otros";
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += curr.amount || 0;
    return acc;
  }, {});

  return Object.keys(grouped).map(k => ({
    name: k,
    value: grouped[k]
  })).sort((a, b) => b.value - a.value);
}

export async function getWeeklyFinancialFlow(businessId: string) {
  const supabase = await createClient();

  // Get transactions and expenses from the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [txRes, expRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("total, created_at, status")
      .eq("business_id", businessId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .in("status", ["completed", "paid"]),
    supabase
      .from("expenses")
      .select("amount, created_at")
      .eq("business_id", businessId)
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  
  // Build 7-day buckets
  const days: { name: string; date: string; revenue: number; expenses: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    days.push({
      name: dayNames[d.getDay()],
      date: dateStr,
      revenue: 0,
      expenses: 0,
    });
  }

  // Aggregate transactions by day
  for (const tx of txRes.data || []) {
    if (!tx.created_at) continue;
    const txDate = tx.created_at.split("T")[0];
    const bucket = days.find((d) => d.date === txDate);
    if (bucket) bucket.revenue += tx.total || 0;
  }

  // Aggregate expenses by day
  for (const exp of expRes.data || []) {
    if (!exp.created_at) continue;
    const expDate = exp.created_at.split("T")[0];
    const bucket = days.find((d) => d.date === expDate);
    if (bucket) bucket.expenses += exp.amount || 0;
  }

  return days.map(({ name, revenue, expenses }) => ({ name, revenue, expenses }));
}

export async function getMonthlyRevenue(businessId: string) {
  const supabase = await createClient();

  // Current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data } = await supabase
    .from("transactions")
    .select("total")
    .eq("business_id", businessId)
    .in("status", ["completed", "paid"])
    .gte("created_at", startOfMonth.toISOString());

  const currentMonthRevenue = (data || []).reduce((acc, t) => acc + (t.total || 0), 0);

  // Previous month for comparison
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const { data: prevData } = await supabase
    .from("transactions")
    .select("total")
    .eq("business_id", businessId)
    .in("status", ["completed", "paid"])
    .gte("created_at", startOfPrevMonth.toISOString())
    .lte("created_at", endOfPrevMonth.toISOString());

  const prevMonthRevenue = (prevData || []).reduce((acc, t) => acc + (t.total || 0), 0);

  const percentChange = prevMonthRevenue > 0
    ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
    : currentMonthRevenue > 0 ? 100 : 0;

  return {
    current: currentMonthRevenue,
    previous: prevMonthRevenue,
    percentChange: Math.round(percentChange * 10) / 10,
  };
}
