import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated", description: "You're all set." });
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-2xl items-center justify-center bg-gradient-to-br from-school to-coding mb-3">
            <Sparkles className="h-6 w-6" style={{ color: "hsl(var(--background))" }} />
          </div>
          <h1 className="text-xl font-bold">Set a new password</h1>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div>
            <Label className="text-xs">New password</Label>
            <Input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || pw.length < 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;