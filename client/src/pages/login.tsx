import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Mail, Loader2, AlertCircle, Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type LoginStep = "email" | "password" | "set-password";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<LoginStep>("email");

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
        // Not authenticated, stay on login page
      }
    };
    checkAuth();
  }, [setLocation]);

  // Password validation for set-password step
  const passwordChecks = {
    minLength: password.length >= 8,
    hasContent: password.length > 0,
  };
  const isPasswordValid = passwordChecks.minLength;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to check email");
      }

      if (data.action === "register") {
        // New user - redirect to register
        toast({
          title: "Account Not Found",
          description: "Please create an account to continue.",
        });
        setLocation(`/register?email=${encodeURIComponent(email)}`);
      } else if (data.action === "set-password") {
        // Legacy user - show set password UI
        setStep("set-password");
      } else {
        // Existing user with password - show login UI
        setStep("password");
      }
    } catch (error) {
      console.error("Check email error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to check email";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { queryClient } = await import("@/lib/queryClient");
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
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
      const errorMessage = error instanceof Error ? error.message : "Failed to sign in";
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

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

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
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { queryClient } = await import("@/lib/queryClient");
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          title: "Password Set!",
          description: "Your account is now secured with a password.",
        });
        setLocation("/dashboard");
      } else {
        throw new Error(data.message || "Failed to set password");
      }
    } catch (error) {
      console.error("Set password error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to set password";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep("email");
    setPassword("");
    setConfirmPassword("");
    setError(null);
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
            <AnimatePresence mode="wait">
              {step === "email" && (
                <motion.div
                  key="email-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h1 className="text-2xl font-bold">Welcome</h1>
                  <p className="text-muted-foreground text-sm">
                    Enter your email to sign in or create an account
                  </p>
                </motion.div>
              )}
              {step === "password" && (
                <motion.div
                  key="password-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h1 className="text-2xl font-bold">Welcome Back</h1>
                  <p className="text-muted-foreground text-sm">
                    Enter your password to sign in
                  </p>
                </motion.div>
              )}
              {step === "set-password" && (
                <motion.div
                  key="set-password-header"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h1 className="text-2xl font-bold">Create Your Password</h1>
                  <p className="text-muted-foreground text-sm">
                    We found your account! Set a password to secure it.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Legacy User Info Banner */}
          {step === "set-password" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20"
            >
              <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">One-time setup</p>
                <p className="text-muted-foreground mt-1">
                  Your account was created before we added passwords. Choose a password you'll remember for future logins.
                </p>
              </div>
            </motion.div>
          )}

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

          <AnimatePresence mode="wait">
            {/* Step 1: Email Input */}
            {step === "email" && (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleCheckEmail}
                className="space-y-4"
              >
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
                    autoFocus
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
                      Checking...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Continue
                    </>
                  )}
                </Button>
              </motion.form>
            )}

            {/* Step 2a: Password Login (existing user with password) */}
            {step === "password" && (
              <motion.form
                key="password-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                  </div>
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
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={isLoading || !password}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={goBack}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Use a different email
                </Button>
              </motion.form>
            )}

            {/* Step 2b: Set Password (legacy user without password) */}
            {step === "set-password" && (
              <motion.form
                key="set-password-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSetPassword}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-password" className="text-sm font-medium">
                    Create Password
                  </label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Choose a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={isLoading}
                      className="w-full pr-10"
                      autoFocus
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
                      className="pt-1"
                    >
                      <div className={`flex items-center gap-2 text-xs ${passwordChecks.minLength ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        <CheckCircle className={`w-3 h-3 ${passwordChecks.minLength ? 'opacity-100' : 'opacity-40'}`} />
                        <span>At least 8 characters</span>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
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
                  disabled={isLoading || !isPasswordValid || !passwordsMatch}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Setting Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Set Password & Sign In
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={goBack}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Use a different email
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Register Link - only show on email step */}
          {step === "email" && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register" className="text-primary hover:underline font-medium">
                Register
              </Link>
            </div>
          )}

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
