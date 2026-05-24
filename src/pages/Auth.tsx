import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useTheme } from "@/lib/themes";

type Mode = "login" | "signup" | "forgot";

const Auth = () => {
  // Initialize theme on auth screen too
  useTheme();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password.length < 6) {
          toast({ title: "Password too short", description: "At least 6 characters." });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast({ title: "Welcome!", description: "Account created." });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "Reset link sent." });
        setMode("login");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Google sign-in failed", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh w-full bg-background text-foreground flex items-center justify-center p-4 py-6 max-[700px]:items-start max-[700px]:py-3 relative overflow-x-hidden overflow-y-auto">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-80 w-80 rounded-full opacity-10 blur-3xl max-[700px]:hidden"
             style={{ background: "hsl(var(--primary))" }} />
        <div className="absolute -bottom-36 right-1/4 h-80 w-80 rounded-full opacity-8 blur-3xl max-[700px]:hidden"
             style={{ background: "hsl(var(--coding))" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md max-[700px]:max-w-sm"
      >
        <div className="text-center mb-6 max-[700px]:mb-3">
          <div className="inline-flex h-14 w-14 max-[700px]:h-12 max-[700px]:w-12 rounded-2xl items-center justify-center bg-gradient-to-br from-[hsl(var(--cyan))] to-[hsl(var(--neon))] mb-3 max-[700px]:mb-2 shadow-[0_0_28px_hsl(var(--cyan)/0.55)]">
            <Sparkles className="h-7 w-7 max-[700px]:h-6 max-[700px]:w-6" style={{ color: "hsl(var(--background))" }} />
          </div>
          <h1 className="text-4xl max-[700px]:text-3xl md:text-5xl font-display tracking-[0.08em] shimmer-text">LIFESTACK</h1>
          <p className="text-xs max-[700px]:text-[10px] font-stat tracking-[0.2em] text-muted-foreground mt-2 max-[700px]:mt-1">STACK THE DAYS · WIN THE YEAR</p>
        </div>

        <div data-lifestack-auth className="rounded-2xl p-6 max-[700px]:p-4 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
            >
              <h2 className="text-xl max-[700px]:text-lg font-semibold mb-4 max-[700px]:mb-3">
                {mode === "login" && "Welcome back"}
                {mode === "signup" && "Create account"}
                {mode === "forgot" && "Reset password"}
              </h2>

              {mode !== "forgot" && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mb-4 max-[700px]:mb-3 max-[700px]:h-10"
                    onClick={google}
                    disabled={loading}
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </Button>
                  <div className="my-4 max-[700px]:my-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border" />
                    <span className="shrink-0 leading-none">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className="space-y-3 max-[700px]:space-y-2.5">
                {mode === "signup" && (
                  <div>
                    <Label className="text-xs">Display name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="What should we call you?"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="pl-9 max-[700px]:h-10"
                    />
                  </div>
                </div>
                {mode !== "forgot" && (
                  <div>
                    <Label className="text-xs flex justify-between">
                      <span>Password</span>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-primary hover:underline text-xs"
                        >
                          Forgot?
                        </button>
                      )}
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={6}
                        className="pl-9 max-[700px]:h-10"
                      />
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full btn-primary-glow press max-[700px]:h-11" disabled={loading} data-testid="auth-submit">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === "login" && "Log in"}
                      {mode === "signup" && "Create account"}
                      {mode === "forgot" && "Send reset email"}
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 max-[700px]:mt-3 text-center text-xs text-muted-foreground">
                {mode === "login" && (
                  <>
                    No account?{" "}
                    <button onClick={() => setMode("signup")} className="text-primary hover:underline font-medium">
                      Sign up
                    </button>
                  </>
                )}
                {mode === "signup" && (
                  <>
                    Already have one?{" "}
                    <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                      Log in
                    </button>
                  </>
                )}
                {mode === "forgot" && (
                  <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                    Back to login
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;