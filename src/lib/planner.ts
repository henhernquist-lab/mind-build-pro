// Planner data layer — reads/writes Supabase for the signed-in user.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RecurringEvent, Override, Category, RecurrenceRule } from "@/lib/recurring";

export type Block = {
  id?: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  label: string;
  category: Category;
};

export type PlannerLabel = {
  id: string;
  name: string;
  category: Category;
  sort_order: number;
};

const rowToBlock = (r: any): Block => ({
  id: r.id,
  date: r.date,
  startTime: r.start_time.slice(0, 5),
  endTime: r.end_time.slice(0, 5),
  label: r.label ?? "",
  category: (r.category ?? "school") as Category,
});

const rowToRecurring = (r: any): RecurringEvent => ({
  id: r.id,
  startTime: r.start_time.slice(0, 5),
  endTime: r.end_time.slice(0, 5),
  label: r.label ?? "",
  category: (r.category ?? "school") as Category,
  rule: (r.rule as RecurrenceRule) ?? { type: "none" },
  startDate: r.start_date,
  endDate: r.end_date ?? undefined,
});

const rowToOverride = (r: any): Override => {
  if (r.override_type === "skip") {
    return { type: "skip", recurringId: r.recurring_id, date: r.date };
  }
  return {
    type: "replace",
    recurringId: r.recurring_id,
    date: r.date,
    label: r.label ?? "",
    category: (r.category ?? "school") as Category,
    startTime: r.start_time?.slice(0, 5),
    endTime: r.end_time?.slice(0, 5),
  };
};

export const usePlannerData = (dateKey: string, userId: string | undefined) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [recurring, setRecurring] = useState<RecurringEvent[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [b, r, o] = await Promise.all([
      supabase.from("planner_blocks").select("*").eq("user_id", userId).eq("date", dateKey),
      supabase.from("planner_recurring").select("*").eq("user_id", userId),
      supabase.from("planner_overrides").select("*").eq("user_id", userId).eq("date", dateKey),
    ]);
    if (b.data) setBlocks(b.data.map(rowToBlock));
    if (r.data) setRecurring(r.data.map(rowToRecurring));
    if (o.data) setOverrides(o.data.map(rowToOverride));
    setLoading(false);
  }, [dateKey, userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { blocks, recurring, overrides, loading, refresh, setBlocks, setRecurring, setOverrides };
};

export const addBlock = async (userId: string, b: Block) => {
  const { data, error } = await supabase.from("planner_blocks").insert({
    user_id: userId,
    date: b.date,
    start_time: b.startTime,
    end_time: b.endTime,
    label: b.label,
    category: b.category,
  }).select().single();
  if (error) throw error;
  return rowToBlock(data);
};

export const updateBlock = async (id: string, b: Partial<Block>) => {
  const patch: any = {};
  if (b.startTime) patch.start_time = b.startTime;
  if (b.endTime) patch.end_time = b.endTime;
  if (b.label !== undefined) patch.label = b.label;
  if (b.category) patch.category = b.category;
  const { error } = await supabase.from("planner_blocks").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteBlock = async (id: string) => {
  const { error } = await supabase.from("planner_blocks").delete().eq("id", id);
  if (error) throw error;
};

export const addRecurring = async (userId: string, ev: Omit<RecurringEvent, "id">) => {
  const { data, error } = await supabase.from("planner_recurring").insert({
    user_id: userId,
    start_time: ev.startTime,
    end_time: ev.endTime,
    label: ev.label,
    category: ev.category,
    rule: ev.rule as any,
    start_date: ev.startDate,
    end_date: ev.endDate ?? null,
  }).select().single();
  if (error) throw error;
  return rowToRecurring(data);
};

export const updateRecurring = async (id: string, ev: Partial<RecurringEvent>) => {
  const patch: any = {};
  if (ev.startTime) patch.start_time = ev.startTime;
  if (ev.endTime) patch.end_time = ev.endTime;
  if (ev.label !== undefined) patch.label = ev.label;
  if (ev.category) patch.category = ev.category;
  if (ev.rule) patch.rule = ev.rule;
  const { error } = await supabase.from("planner_recurring").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteRecurring = async (id: string) => {
  const { error } = await supabase.from("planner_recurring").delete().eq("id", id);
  if (error) throw error;
};

export const upsertOverride = async (userId: string, o: Override) => {
  // Delete any prior override for same (recurring_id, date) so there is only one
  await supabase
    .from("planner_overrides")
    .delete()
    .eq("user_id", userId)
    .eq("recurring_id", o.recurringId)
    .eq("date", o.date);
  const row: any = {
    user_id: userId,
    recurring_id: o.recurringId,
    date: o.date,
    override_type: o.type,
  };
  if (o.type === "replace") {
    row.label = o.label;
    row.category = o.category;
    row.start_time = o.startTime ?? null;
    row.end_time = o.endTime ?? null;
  }
  const { error } = await supabase.from("planner_overrides").insert(row);
  if (error) throw error;
};

// Labels library
export const fetchLabels = async (userId: string): Promise<PlannerLabel[]> => {
  const { data } = await supabase
    .from("planner_labels")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    category: r.category as Category,
    sort_order: r.sort_order,
  }));
};

export const addLabel = async (userId: string, name: string, category: Category, sort_order: number) => {
  const { data, error } = await supabase.from("planner_labels").insert({
    user_id: userId, name, category, sort_order,
  }).select().single();
  if (error) throw error;
  return data;
};

export const updateLabel = async (id: string, patch: Partial<PlannerLabel>) => {
  const { error } = await supabase.from("planner_labels").update(patch).eq("id", id);
  if (error) throw error;
};

export const deleteLabel = async (id: string) => {
  const { error } = await supabase.from("planner_labels").delete().eq("id", id);
  if (error) throw error;
};

// Helpers
export const minutesBetween = (start: string, end: string): number => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};

export const addMinutes = (time: string, minutes: number): string => {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && bStart < aEnd;