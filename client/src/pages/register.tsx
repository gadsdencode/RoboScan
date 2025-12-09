import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Shield, UserPlus, Loader2, AlertCircle, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill email from URL query param (when redirected from login)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, []);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        });
        if (response.ok) {
          setLocation("/dashboard");
        }
      } catch {
        // Not authenticated, stay on register page
      }
    };
    checkAuth();
  }, [setLocation]);

  // Password strength checks
  const passwordChecks = {
    minLength: password.length >= 8,
    hasContent: password.length > 0,
  };

  const isPasswordValid = passwordChecks.minLength;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!isPasswordValid) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { queryClient } = await import("@/lib/queryClient");
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          title: "Account Created!",
          description: "Welcome to RoboScan. Your account is ready.",
        });
        setLocation("/dashboard");
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create account. Please try again.";
      setError(errorMessage);
      toast({
        title: "Registration Error",
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
            <h1 className="text-2xl font-bold">Create Account</h1>
            <p className="text-muted-foreground text-sm">
              Get started with AI-ready website optimization
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
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

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Requirements */}
              {passwordChecks.hasContent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1 pt-2"
                >
                  <div className={`flex items-center gap-2 text-xs ${passwordChecks.minLength ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    <CheckCircle className={`w-3 h-3 ${passwordChecks.minLength ? 'opacity-100' : 'opacity-40'}`} />
                    <span>At least 8 characters</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-xs ${passwordsMatch ? 'text-emerald-500' : 'text-destructive'}`}
                >
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </motion.p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading || !email || !isPasswordValid || !passwordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign In
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
            <p>
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

