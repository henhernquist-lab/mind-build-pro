import { WifiOff } from "lucide-react";
import { ReactNode } from "react";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

type Props = {
  feature: string;
  message?: string;
  action?: ReactNode;
};

/**
 * Inline banner shown above features that require internet.
 * Pages keep rendering — banner just informs the user.
 */
export const RequiresOnlineBanner = ({ feature, message, action }: Props) => {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
      <WifiOff className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">
          {message ?? `${feature} requires an internet connection`}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
};