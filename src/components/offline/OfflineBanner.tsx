import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

export const OfflineBanner = () => {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 bg-amber-500/95 text-amber-950 text-xs font-medium px-3 py-1.5 shadow-md"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>📴 You're offline — some features unavailable. Data will sync when reconnected</span>
    </div>
  );
};

export const OnlineDot = ({ className = "" }: { className?: string }) => {
  const online = useOnlineStatus();
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"} ${className}`}
      title={online ? "Online" : "Offline"}
      aria-label={online ? "Online" : "Offline"}
    />
  );
};