// Reference: blueprint:javascript_log_in_with_replit
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import LLMsBuilder from "@/pages/llms-builder";
import RobotsBuilder from "@/pages/robots-builder";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        {isLoading || !isAuthenticated ? <Home /> : <Dashboard />}
      </Route>
      <Route path="/dashboard">
        {isLoading || !isAuthenticated ? <Home /> : <Dashboard />}
      </Route>
      <Route path="/tools/llms-builder" component={LLMsBuilder} />
      <Route path="/llms-builder" component={LLMsBuilder} />
      <Route path="/tools/robots-builder" component={RobotsBuilder} />
      <Route path="/robots-builder" component={RobotsBuilder} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
