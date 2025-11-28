import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Mail, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          setLocation("/dashboard");
        }
      } catch {
        // Not authenticated, stay on login page
      }
    };
    checkAuth();
  }, [setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Welcome!",
          description: "You've been signed in successfully.",
        });
        setLocation("/dashboard");
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to sign in. Please try again.";
      setError(errorMessage);
      toast({
        title: "Sign-in Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 space-y-6 border border-border/50 shadow-lg">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold font-mono text-primary">ROBOSCAN</span>
            </div>
            <h1 className="text-2xl font-bold">Welcome</h1>
            <p className="text-muted-foreground text-sm">
              Enter your email to sign in or create an account
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Email Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Continue with Email
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
            <p>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
