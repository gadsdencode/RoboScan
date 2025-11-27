import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, Mail, Github, Chrome, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated and handle error query params
  useEffect(() => {
    // Check for error in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam) {
      setError("Authentication failed. Please try again.");
      // Clean up URL
      window.history.replaceState({}, "", "/login");
    }

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          // User is already authenticated, redirect to dashboard
          setLocation("/dashboard");
        }
      } catch (error) {
        // Not authenticated, stay on login page
      }
    };
    checkAuth();
  }, [setLocation]);

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsLoading(true);
    setError(null);
    
    try {
      // NextAuth OAuth flow - use the signin endpoint with redirect
      // NextAuth will handle the OAuth redirect automatically
      const callbackUrl = `${window.location.origin}/dashboard`;
      window.location.href = `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } catch (error) {
      console.error("OAuth sign-in error:", error);
      setError(`Failed to sign in with ${provider}. Please try again.`);
      toast({
        title: "Sign-in Error",
        description: `Failed to sign in with ${provider}. Please try again.`,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // NextAuth credentials signin
      const callbackUrl = `${window.location.origin}/dashboard`;
      const response = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email,
          password,
          redirect: "false",
          json: "true",
          callbackUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.url) {
          // Success - redirect to dashboard
          window.location.href = data.url;
        } else {
          // Check if we got an error
          if (data.error) {
            throw new Error(data.error);
          }
          // If no URL but no error, try to redirect manually
          setLocation("/dashboard");
        }
      } else {
        throw new Error(data.error || "Invalid email or password");
      }
    } catch (error) {
      console.error("Email sign-in error:", error);
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
            <h1 className="text-2xl font-bold">
              {isEmailMode ? "Sign in to your account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {isEmailMode 
                ? "Enter your credentials to continue" 
                : "Choose your preferred sign-in method"}
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

          {/* Email/Password Form */}
          {isEmailMode ? (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
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
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEmailMode(false);
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  Back
                </Button>
              </div>
            </form>
          ) : (
            /* OAuth Buttons */
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isLoading}
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <Chrome className="w-5 h-5" />
                <span>Continue with Google</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleOAuthSignIn("github")}
                disabled={isLoading}
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <Github className="w-5 h-5" />
                <span>Continue with GitHub</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setIsEmailMode(true)}
                disabled={isLoading}
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <Mail className="w-5 h-5" />
                <span>Continue with Email</span>
              </Button>
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

