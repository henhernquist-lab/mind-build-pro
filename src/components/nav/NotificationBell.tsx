import { useState } from "react";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, markNotificationRead, markAllRead } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const NotificationBell = () => {
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = (id: string, href: string) => {
    markNotificationRead(id);
    setOpen(false);
    navigate(href);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-10 w-10 rounded-full border-2 border-border bg-card shadow-lg hover:border-primary transition-colors flex items-center justify-center"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="fixed left-3 top-[calc(env(safe-area-inset-top)+4rem)] z-50 w-[320px] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden md:left-auto md:right-3 md:top-16"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="font-bold text-sm">Notifications</div>
                <div className="flex items-center gap-1">
                  {unread.length > 0 && (
                    <button
                      onClick={() => markAllRead(items.map((i) => i.id))}
                      className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    🎉 You're all caught up
                  </div>
                ) : items.map((n) => {
                  const isUnread = unread.some((u) => u.id === n.id);
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n.id, n.href)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors flex gap-3",
                        isUnread && "bg-primary/5",
                      )}
                    >
                      <div className="text-lg leading-none mt-0.5">{n.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-sm leading-snug truncate",
                          isUnread ? "font-semibold" : "font-medium text-muted-foreground",
                        )}>
                          {n.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{n.description}</div>
                      </div>
                      {isUnread && (
                        <div className={cn(
                          "h-2 w-2 rounded-full mt-2 flex-shrink-0",
                          n.severity === "danger" ? "bg-rose-500"
                            : n.severity === "warning" ? "bg-amber-500"
                            : "bg-primary",
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};