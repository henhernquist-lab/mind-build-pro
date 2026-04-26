// Recurring events for the daily planner.
// Stored in localStorage as `planner_recurring`.

export type Category = "school" | "sports" | "coding" | "free";

export type RecurrenceRule =
  | { type: "none" }
  | { type: "daily" }
  | { type: "weekdays" }
  | { type: "weekly"; days: number[] } // 0=Sun..6=Sat
  | { type: "custom"; days: number[] };

export type RecurringEvent = {
  id: string;
  time: string; // "HH:MM"
  label: string;
  category: Category;
  rule: RecurrenceRule;
  startDate: string; // YYYY-MM-DD
  endDate?: string;  // YYYY-MM-DD (inclusive)
};

// One-off override map per date: keyed by `${date}_${time}`.
// Stored in localStorage as `planner_overrides`. Two kinds:
//  - { type: "skip" } means hide a recurring event for that day
//  - { type: "replace", block: {label, category} } means override label/category
export type Override =
  | { type: "skip"; recurringId: string }
  | { type: "replace"; recurringId: string; label: string; category: Category };

export const dayMatches = (rule: RecurrenceRule, date: Date): boolean => {
  const dow = date.getDay();
  switch (rule.type) {
    case "none": return false;
    case "daily": return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "weekly":
    case "custom":
      return rule.days.includes(dow);
  }
};

const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const getRecurringForDate = (
  events: RecurringEvent[],
  dateKey: string
): RecurringEvent[] => {
  const date = parseKey(dateKey);
  return events.filter((ev) => {
    if (dateKey < ev.startDate) return false;
    if (ev.endDate && dateKey > ev.endDate) return false;
    return dayMatches(ev.rule, date);
  });
};

export const ruleLabel = (rule: RecurrenceRule): string => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  switch (rule.type) {
    case "none": return "Does not repeat";
    case "daily": return "Every day";
    case "weekdays": return "Weekdays (Mon–Fri)";
    case "weekly":
    case "custom":
      if (rule.days.length === 7) return "Every day";
      if (rule.days.length === 0) return "No days selected";
      return rule.days.sort().map((d) => dayNames[d]).join(", ");
  }
};