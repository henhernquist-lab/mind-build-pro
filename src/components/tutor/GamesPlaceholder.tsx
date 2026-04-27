import { Gamepad2, Sparkles } from "lucide-react";

export const GamesPlaceholder = () => {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 md:p-16 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mb-4">
        <Gamepad2 className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Games</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        In the works — quick study games to make practice actually fun. Check back soon!
      </p>
      <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
        <Sparkles className="h-3 w-3" /> Coming soon
      </div>
    </div>
  );
};