import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRank, getCountdown } from "@/lib/ranks2";

export type AppNotification = {
  id: string;
  type: "season" | "test";
  title: string;
  description: string;
  href: string;
  createdAt: string;
  severity: "info" | "warning" | "danger";
  icon: string; // emoji
};

const READ_KEY = "notifications:read";
const getRead = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
  catch { return new Set(); }
};
const saveRead = (s: Set<string>) =>
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(s)));

export const markNotificationRead = (id: string) => {
  const s = getRead(); s.add(id); saveRead(s);
  window.dispatchEvent(new Event("notifications:changed"));
};
export const markAllRead = (ids: string[]) => {
  const s = getRead(); ids.forEach((i) => s.add(i)); saveRead(s);
  window.dispatchEvent(new Event("notifications:changed"));
};

export const useNotifications = () => {
  const { user } = useAuth();
  const athletic = useRank("athletic");
  const academic = useRank("academic");
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readSet, setReadSet] = useState<Set<string>>(() => getRead());

  const refreshRead = () => setReadSet(getRead());
  useEffect(() => {
    window.addEventListener("notifications:changed", refreshRead);
    return () => window.removeEventListener("notifications:changed", refreshRead);
  }, []);

  const load = useCallback(async () => {
    if (!user) { setItems([]); return; }
    const next: AppNotification[] = [];

    // 1. Season ending soon (<= 48h)
    for (const [type, r] of [["athletic", athletic], ["academic", academic]] as const) {
      if (!r.periodStart) continue;
      const c = getCountdown(r.periodStart);
      if (c.total > 0 && c.total <= 48 * 3600 * 1000) {
        const hours = Math.max(1, c.days * 24 + c.hours);
        next.push({
          id: `season-${type}-${r.periodStart}`,
          type: "season",
          title: `${type === "athletic" ? "Athletic" : "Academic"} season ends in ~${hours}h`,
          description: "Last chance to climb the ranks before reset.",
          href: "/leaderboard",
          createdAt: new Date().toISOString(),
          severity: c.total <= 6 * 3600 * 1000 ? "danger" : "warning",
          icon: "⏰",
        });
      }
    }

    // 2. Upcoming tests (within 7 days, not completed)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7 = new Date(today.getTime() + 7 * 86400000);
    const { data: tests } = await supabase
      .from("academic_tests")
      .select("id,title,subject,test_date,completed")
      .eq("user_id", user.id)
      .eq("completed", false)
      .gte("test_date", today.toISOString().slice(0, 10))
      .lte("test_date", in7.toISOString().slice(0, 10))
      .order("test_date", { ascending: true });
    for (const t of tests || []) {
      const days = Math.ceil((new Date(t.test_date).getTime() - today.getTime()) / 86400000);
      const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
      next.push({
        id: `test-${t.id}`,
        type: "test",
        title: `${t.title} ${when}`,
        description: `${t.subject} • ${new Date(t.test_date).toLocaleDateString()}`,
        href: "/tests",
        createdAt: t.test_date,
        severity: days <= 1 ? "danger" : days <= 3 ? "warning" : "info",
        icon: "📅",
      });
    }

    next.sort((a, b) => {
      const sevW = { danger: 0, warning: 1, info: 2 } as const;
      if (sevW[a.severity] !== sevW[b.severity]) return sevW[a.severity] - sevW[b.severity];
      return b.createdAt.localeCompare(a.createdAt);
    });
    setItems(next);
  }, [user?.id, athletic.periodStart, academic.periodStart]);

  useEffect(() => { load(); }, [load]);
  // Refresh every 5 min
  useEffect(() => {
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, [load]);

  const unread = items.filter((i) => !readSet.has(i.id));
  return { items, unread, readSet, reload: load };
};