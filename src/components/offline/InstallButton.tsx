import { useEffect, useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const InstallButton = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore iOS Safari
      window.navigator.standalone === true);

  const isIOS = typeof window !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || installed) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Smartphone className="h-3.5 w-3.5" /> App is installed
      </div>
    );
  }

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else if (isIOS) {
      setIosOpen(true);
    } else {
      setIosOpen(true);
    }
  };

  return (
    <>
      <Button onClick={handleClick} size="sm" variant="default">
        <Download className="h-3.5 w-3.5 mr-1.5" /> Install App
      </Button>
      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share className="h-4 w-4" /> Add to Home Screen
            </DialogTitle>
            <DialogDescription>
              {isIOS ? (
                <>Tap the <b>Share</b> button in Safari, then choose <b>"Add to Home Screen"</b>.</>
              ) : (
                <>Open this site in your browser's menu and choose <b>"Install app"</b> or <b>"Add to Home Screen"</b>.</>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};