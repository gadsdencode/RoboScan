// client/src/pages/pricing.tsx
// Pricing page showcasing the Guardian subscription

import { Shield, Crown, Sparkles, Check, Zap, Bell, Clock, FileText, GitCompare, Download, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Feature comparison data
const FREE_FEATURES = [
  { name: "Basic Website Scans", included: true },
  { name: "Score & Grade Overview", included: true },
  { name: "Basic robots.txt Builder", included: true },
  { name: "Basic llms.txt Builder", included: true },
  { name: "View Last Scan Only", included: true },
];

const GUARDIAN_FEATURES = [
  { name: "Unlimited Full Scans", included: true, highlight: true },
  { name: "Detailed Error Analysis", included: true, highlight: true },
  { name: "Recurring Scans (Daily/Weekly/Monthly)", included: true, highlight: true },
  { name: "Real-time Change Alerts", included: true, highlight: true },
  { name: "Unlimited Scan History", included: true, highlight: true },
  { name: "Scan Comparison Tool", included: true, highlight: true },
  { name: "All Premium Builder Fields", included: true, highlight: true },
  { name: "Unlimited PDF Exports", included: true },
  { name: "2x XP Bonus", included: true, highlight: true },
  { name: "Priority Support", included: true },
];

export default function Pricing() {
  const { user } = useAuth();
  const {
    plans,
    plansLoading,
    hasActiveSubscription,
    subscription,
    startCheckout,
    checkoutLoading,
    openPortal,
    portalLoading,
    formatPrice,
  } = useSubscription();

  // Find the Guardian plan (or first available plan)
  const guardianPlan = plans.find(p => p.name.toLowerCase().includes('guardian')) || plans[0];

  const handleSubscribe = () => {
    if (!user) {
      window.location.href = "/api/login";
      return;
    }
    if (guardianPlan) {
      startCheckout(guardianPlan.stripePriceId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 text-primary font-heading text-xl font-bold tracking-tighter">
              <Shield className="w-6 h-6" />
              <span>ROBOSCAN</span>
            </a>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </a>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
            <Crown className="w-3 h-3 mr-1" />
            Upgrade Your Protection
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Become a <span className="text-primary">Guardian</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Automate your website's bot security with recurring scans, real-time alerts, 
            and full access to all premium features.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Free Tier Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  Scout
                </CardTitle>
                <CardDescription>Basic protection for casual users</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {FREE_FEATURES.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className={`w-5 h-5 shrink-0 mt-0.5 ${feature.included ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                      <span className={feature.included ? '' : 'text-muted-foreground/50 line-through'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Guardian Tier Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="h-full border-primary/50 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                RECOMMENDED
              </div>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Guardian
                </CardTitle>
                <CardDescription>Complete protection for professionals</CardDescription>
                <div className="pt-4">
                  {plansLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : guardianPlan ? (
                    <>
                      <span className="text-4xl font-bold">{formatPrice(guardianPlan.amount, guardianPlan.currency)}</span>
                      <span className="text-muted-foreground">/{guardianPlan.interval === 'month' ? 'mo' : 'yr'}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">$29</span>
                      <span className="text-muted-foreground">/mo</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {GUARDIAN_FEATURES.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className={`w-5 h-5 shrink-0 mt-0.5 ${feature.highlight ? 'text-primary' : 'text-green-500'}`} />
                      <span className={feature.highlight ? 'font-medium' : ''}>
                        {feature.name}
                        {feature.highlight && <Sparkles className="w-3 h-3 inline ml-1 text-primary" />}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {hasActiveSubscription ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => openPortal()}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Manage Subscription'
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="w-full btn-cta" 
                    onClick={handleSubscribe}
                    disabled={checkoutLoading || plansLoading}
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade to Guardian
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Feature Highlight Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-5xl mx-auto"
        >
          <Separator className="mb-16" />
          
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            Why Upgrade to Guardian?
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature Cards */}
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="p-3 rounded-lg bg-blue-500/20 w-fit mb-4">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Recurring Scans</h3>
                <p className="text-sm text-muted-foreground">
                  Set up daily, weekly, or monthly scans. Your sites are monitored automatically, 24/7.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="p-3 rounded-lg bg-green-500/20 w-fit mb-4">
                  <Bell className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Real-time Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Get notified instantly when your robots.txt or llms.txt files change unexpectedly.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="p-3 rounded-lg bg-purple-500/20 w-fit mb-4">
                  <GitCompare className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">Scan Comparison</h3>
                <p className="text-sm text-muted-foreground">
                  Compare scans over time to track improvements and catch regressions.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="p-3 rounded-lg bg-yellow-500/20 w-fit mb-4">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="font-semibold mb-2">2x XP Bonus</h3>
                <p className="text-sm text-muted-foreground">
                  Level up twice as fast! All XP earned as a Guardian is doubled.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="p-3 rounded-lg bg-red-500/20 w-fit mb-4">
                  <FileText className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="font-semibold mb-2">Premium Builder Fields</h3>
                <p className="text-sm text-muted-foreground">
                  Unlock all premium fields in both robots.txt and llms.txt builders - no extra cost.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="p-3 rounded-lg bg-cyan-500/20 w-fit mb-4">
                  <Download className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-semibold mb-2">Unlimited Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Download detailed PDF reports for any scan. Perfect for client presentations.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-16"
        >
          <Separator className="mb-16" />
          
          <h2 className="text-2xl font-bold mb-4">Ready to upgrade your protection?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join thousands of website owners who trust Guardian to keep their bot configurations secure.
          </p>
          
          {!hasActiveSubscription && (
            <Button 
              size="lg" 
              className="btn-cta"
              onClick={handleSubscribe}
              disabled={checkoutLoading || plansLoading}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="w-5 h-5 mr-2" />
                  Become a Guardian - {guardianPlan ? formatPrice(guardianPlan.amount, guardianPlan.currency) : '$29'}/mo
                </>
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

