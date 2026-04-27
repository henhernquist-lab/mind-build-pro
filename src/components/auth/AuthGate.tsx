import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { collectLocalSnapshot, importSnapshot, clearLocalAppData } from "@/lib/migrate";
import { useToast } from "@/hooks/use-toast";

const FullScreenLoader = () => (
  <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-school to-sports animate-pulse">
        <Sparkles className="h-6 w-6" style={{ color: "hsl(var(--background))" }} />
      </div>
      <div className="text-sm text-muted-foreground">Loading your stack…</div>
    </div>
  </div>
);

export const AuthGate = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [askImport, setAskImport] = useState(false);
  const [snapshot, setSnapshot] = useState<ReturnType<typeof collectLocalSnapshot> | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem("migration_done")) return;
    if (localStorage.getItem("migration_dismissed")) return;
    const snap = collectLocalSnapshot();
    if (snap.hasAny) {
      setSnapshot(snap);
      setAskImport(true);
    } else {
      localStorage.setItem("migration_done", "true");
    }
  }, [user]);

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  const doImport = async () => {
    if (!snapshot || !user) return;
    setImporting(true);
    try {
      await importSnapshot(user.id, snapshot);
      clearLocalAppData();
      toast({ title: "Imported!", description: "Your local data is now in your account." });
    } catch (e) {
      toast({ title: "Import failed", description: String(e), variant: "destructive" });
    } finally {
      setImporting(false);
      setAskImport(false);
    }
  };

  const skipImport = () => {
    localStorage.setItem("migration_dismissed", "true");
    setAskImport(false);
  };

  return (
    <>
      {children}
      <Dialog open={askImport} onOpenChange={(o) => !o && skipImport()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import your local data?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>We found data saved in this browser from before you signed in. Want to import it into your account?</p>
            <ul className="text-xs space-y-1 pl-4 list-disc">
              {snapshot && snapshot.blocks.length > 0 && <li>{snapshot.blocks.length} planner blocks</li>}
              {snapshot && snapshot.recurring.length > 0 && <li>{snapshot.recurring.length} recurring events</li>}
              {snapshot && snapshot.workouts.some((w) => w.entries.length > 0) && (
                <li>{snapshot.workouts.reduce((n, w) => n + w.entries.length, 0)} workout logs</li>
              )}
              {snapshot?.athleteProfile && <li>Athlete profile</li>}
              {snapshot && snapshot.xp !== null && snapshot.xp > 0 && <li>{snapshot.xp} XP</li>}
              {snapshot && snapshot.subjects.length > 0 && <li>{snapshot.subjects.length} custom subjects</li>}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={skipImport} disabled={importing}>No, skip</Button>
            <Button onClick={doImport} disabled={importing}>
              {importing ? "Importing…" : "Yes, import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};