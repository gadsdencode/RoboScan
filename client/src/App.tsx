// Reference: blueprint:javascript_log_in_with_replit
import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const SetPassword = lazy(() => import("@/pages/set-password"));
const LLMsBuilder = lazy(() => import("@/pages/llms-builder"));
const RobotsBuilder = lazy(() => import("@/pages/robots-builder"));
const SitemapBuilder = lazy(() => import("@/pages/sitemap-builder"));
const SecurityBuilder = lazy(() => import("@/pages/security-builder"));
const ManifestBuilder = lazy(() => import("@/pages/manifest-builder"));
const AdsBuilder = lazy(() => import("@/pages/ads-builder"));
const HumansBuilder = lazy(() => import("@/pages/humans-builder"));
const AIBuilder = lazy(() => import("@/pages/ai-builder"));
const Pricing = lazy(() => import("@/pages/pricing"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/set-password" component={SetPassword} />
        <Route path="/">
          {isLoading || !isAuthenticated ? <Home /> : <Dashboard />}
        </Route>
        <Route path="/dashboard">
          {isLoading || !isAuthenticated ? <Home /> : <Dashboard />}
        </Route>
        <Route path="/tools/llms-builder" component={LLMsBuilder} />
        <Route path="/llms-builder">
          <Redirect to="/tools/llms-builder" />
        </Route>
        <Route path="/tools/robots-builder" component={RobotsBuilder} />
        <Route path="/robots-builder">
          <Redirect to="/tools/robots-builder" />
        </Route>
        <Route path="/tools/sitemap-builder" component={SitemapBuilder} />
        <Route path="/sitemap-builder">
          <Redirect to="/tools/sitemap-builder" />
        </Route>
        <Route path="/tools/security-builder" component={SecurityBuilder} />
        <Route path="/security-builder">
          <Redirect to="/tools/security-builder" />
        </Route>
        <Route path="/tools/manifest-builder" component={ManifestBuilder} />
        <Route path="/manifest-builder">
          <Redirect to="/tools/manifest-builder" />
        </Route>
        <Route path="/tools/ads-builder" component={AdsBuilder} />
        <Route path="/ads-builder">
          <Redirect to="/tools/ads-builder" />
        </Route>
        <Route path="/tools/humans-builder" component={HumansBuilder} />
        <Route path="/humans-builder">
          <Redirect to="/tools/humans-builder" />
        </Route>
        <Route path="/tools/ai-builder" component={AIBuilder} />
        <Route path="/ai-builder">
          <Redirect to="/tools/ai-builder" />
        </Route>
        <Route path="/pricing" component={Pricing} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
