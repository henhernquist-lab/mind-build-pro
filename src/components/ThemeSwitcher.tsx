import { useState } from "react";
import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { THEMES, useTheme } from "@/lib/themes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-9 w-9"
        aria-label="Change theme"
      >
        <Palette className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose your vibe</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {THEMES.map((t) => {
              const active = t.id === theme;
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setTheme(t.id);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    active ? "border-primary bg-accent" : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className="flex -space-x-2">
                    {t.swatches.map((c, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full border-2 border-background"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.vibe}</div>
                  </div>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </motion.button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};