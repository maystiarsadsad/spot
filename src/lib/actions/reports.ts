"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOverviewStats(businessId: string) {
  const supabase = await createClient();

  // We fetch counts and sum for basic metrics
  // Because we want to show a general overview
  const [contactsRes, expensesRes, itemsRes, employeesRes] = await Promise.all([
    supabase.from("contacts").select("id", { count: "exact" }).eq("business_id", businessId),
    supabase.from("expenses").select("amount").eq("business_id", businessId),
    supabase.from("catalog_items").select("id", { count: "exact" }).eq("business_id", businessId),
    supabase.from("employees").select("id", { count: "exact" }).eq("business_id", businessId),
  ]);

  const totalExpenses = expensesRes.data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
  
  return {
    totalContacts: contactsRes.count || 0,
    totalExpenses,
    totalItems: itemsRes.count || 0,
    totalEmployees: employeesRes.count || 0,
  };
}

export async function getExpensesByCategory(businessId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("category, amount")
    .eq("business_id", businessId);

  if (error || !data) return [];

  // Aggregate by category
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

export async function getRevenueMockData() {
  // Since we don't have a solid "Sales" table yet (it's planned for Point of Sale / POS portal),
  // we'll provide mock revenue data to show what the dashboard will look like.
  return [
    { name: "Lun", revenue: 4000, expenses: 2400 },
    { name: "Mar", revenue: 3000, expenses: 1398 },
    { name: "Mié", revenue: 2000, expenses: 9800 },
    { name: "Jue", revenue: 2780, expenses: 3908 },
    { name: "Vie", revenue: 1890, expenses: 4800 },
    { name: "Sáb", revenue: 2390, expenses: 3800 },
    { name: "Dom", revenue: 3490, expenses: 4300 },
  ];
}
