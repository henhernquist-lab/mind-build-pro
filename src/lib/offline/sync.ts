import { supabase } from "@/integrations/supabase/client";
import { getPending, markSynced, deleteSynced, OutboxItem } from "./db";
import { toast } from "sonner";

let syncing = false;

async function syncOne(item: OutboxItem): Promise<boolean> {
  try {
    if (item.kind === "planner_block") {
      const { error } = await supabase.from("planner_blocks").insert({
        user_id: item.user_id,
        ...item.payload,
      });
      if (error) throw error;
    } else if (item.kind === "workout_log") {
      const { error } = await supabase.from("workout_logs").insert({
        user_id: item.user_id,
        ...item.payload,
      });
      if (error) throw error;
    } else if (item.kind === "meal_log") {
      const { error } = await supabase.from("meal_logs").insert({
        user_id: item.user_id,
        ...item.payload,
      });
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.warn("[offline-sync] failed", item.kind, e);
    return false;
  }
}

export async function syncOutbox(silent = false) {
  if (syncing) return;
  syncing = true;
  try {
    const pending = await getPending();
    if (pending.length === 0) { syncing = false; return; }
    let ok = 0;
    for (const item of pending) {
      const success = await syncOne(item);
      if (success && item.id != null) {
        await markSynced(item.id);
        ok++;
      }
    }
    await deleteSynced();
    if (ok > 0 && !silent) {
      toast.success(`✅ Synced ${ok} item${ok === 1 ? "" : "s"} while you were offline`);
    }
    // Notify app to refresh queries
    window.dispatchEvent(new CustomEvent("offline-sync-complete", { detail: { count: ok } }));
  } finally {
    syncing = false;
  }
}

let installed = false;
export function installSyncListener() {
  if (installed) return;
  installed = true;
  window.addEventListener("online", () => syncOutbox(false));
  // Try once on load in case there are leftovers from a prior session
  if (navigator.onLine) syncOutbox(true);
}