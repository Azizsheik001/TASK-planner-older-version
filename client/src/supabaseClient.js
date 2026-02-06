import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (typeof window !== "undefined") {
  window.__supabase = supabase;
}

function toISODate(val) {
  if (!val) return null;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function createTaskSupabase(task) {
  const payload = {
    id: task.id,
    title: task.title || null,
    description: task.description || null,
    assignee: task.assignee || null,
    assignee_email: task.assignee_email || null,
    start_date: toISODate(task.start_date || task.startDate),
    due_date: toISODate(task.due_date || task.dueDate),
    priority: task.priority || "Medium",
    status: task.status || "Todo",
    budget: task.budget || null,
    extended_due_dates: task.extended_due_dates || [],
    team_id: task.team_id || null,
    created_at: task.created_at || new Date().toISOString(),
    updated_at: task.updated_at || new Date().toISOString(),
    deleted_at: task.deleted_at || null,
    attachment_url: task.attachment_url || null,
    assigned_by: task.assigned_by || null
  };
  const { data, error } = await supabase.from("tasks").insert([payload]).select().single();
  if (error) {
    console.error("Supabase INSERT error:", error);
    throw error;
  }
  return data;
}

export async function updateTaskSupabase(taskId, updates) {
  const payload = { ...updates };

  if ("start_date" in updates || "startDate" in updates) {
    payload.start_date = toISODate(updates.start_date || updates.startDate);
    delete payload.startDate;
  }
  if ("due_date" in updates || "dueDate" in updates) {
    payload.due_date = toISODate(updates.due_date || updates.dueDate);
    delete payload.dueDate;
  }
  if ("budget" in updates) {
    payload.budget = updates.budget;
  }
  if ("extended_due_dates" in updates) payload.extended_due_dates = updates.extended_due_dates;
  if ("team_id" in updates) payload.team_id = updates.team_id;
  if ("attachment_url" in updates) payload.attachment_url = updates.attachment_url;

  payload.updated_at = updates.updated_at || new Date().toISOString();
  const { data, error } = await supabase.from("tasks").update(payload).eq("id", taskId).select().single();
  if (error) throw error;
  return data;
}

export async function fetchTasksSupabase() {
  const { data, error } = await supabase.from("tasks").select("*").is("deleted_at", null).order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function deleteTaskSupabase(taskId) {
  const { data, error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  return data;
}
