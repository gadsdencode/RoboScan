import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Shield, Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles, Lock, Unlock, DollarSign, Package, Clock, Map, Bot, Settings, Globe, Gauge, Zap, HelpCircle, Upload } from "lucide-react";
import { ImportUrlDialog } from "@/components/ImportUrlDialog";
import { type ParsedRobotsTxt } from "@/lib/parsers";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { robotsBuilderTourSteps } from "@/lib/tour-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = loadStripe(PUBLISHABLE_KEY);

const iconMap: Record<string, any> = {
  Package,
  Clock,
  Map,
  Bot,
  Settings,
  Globe,
  Gauge
};

interface RobotsTxtFormData {
  websiteUrl: string;
  defaultAccess: 'allow-all' | 'block-all' | 'custom';
  disallowedPaths: string;
  allowedPaths: string;
  crawlDelay: string;
  sitemapUrl: string;
  // Premium fields
  advancedCrawlDelay?: string;
  sitemapRules?: string;
  botSpecificRules?: string;
  advancedPatterns?: string;
  hostDirective?: string;
  requestRate?: string;
}

interface PremiumField {
  key: string;
  name: string;
  description: string;
  price: number;
  xpReward: number;
  icon: string;
  template: string;
}

interface PurchasedField {
  id: number;
  userId: string;
  fieldKey: string;
  purchasedAt: Date;
}

function PaymentForm({ 
  clientSecret, 
  onSuccess, 
  onCancel,
  fieldName
}: { 
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  fieldName: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Unlock <span className="text-foreground font-semibold">{fieldName}</span> to enhance your robots.txt file
        </p>
        <PaymentElement />
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 btn-cta"
        >
          {isProcessing ? "Processing..." : "Complete Purchase"}
        </Button>
      </div>
    </form>
  );
}

export default function RobotsBuilder() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const [premiumFields, setPremiumFields] = useState<PremiumField[]>([]);
  const [purchasedFields, setPurchasedFields] = useState<PurchasedField[]>([]);
  const [selectedField, setSelectedField] = useState<PremiumField | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const { register, watch, setValue } = useForm<RobotsTxtFormData>({
    defaultValues: {
      websiteUrl: "https://example.com",
      defaultAccess: "allow-all",
      disallowedPaths: `/admin/
/private/
/api/`,
      allowedPaths: `/public/
/assets/`,
      crawlDelay: "0",
      sitemapUrl: "https://example.com/sitemap.xml",
    },
  });

  const formData = watch();

  const runTour = () => {
    const driverObj = driver({
      showProgress: true,
      steps: robotsBuilderTourSteps,
      popoverClass: 'roboscan-driver-popover',
      onDestroyed: () => {
        localStorage.setItem('roboscan_robots_builder_tour_seen', 'true');
      }
    });
    
    driverObj.drive();
  };

  useEffect(() => {
    loadPremiumFieldsConfig();
    if (user) {
      loadPurchasedFields();
    }
  }, [user]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('roboscan_robots_builder_tour_seen');
    if (!hasSeenTour && premiumFields.length > 0) {
      setTimeout(runTour, 1000);
    }
  }, [premiumFields.length]);

  const loadPremiumFieldsConfig = async () => {
    try {
      const { PREMIUM_ROBOTS_FIELDS } = await import('@/../../shared/robots-fields');
      const fields = Object.values(PREMIUM_ROBOTS_FIELDS).map((field: any) => ({
        key: field.key,
        name: field.name,
        description: field.description,
        price: field.price,
        xpReward: field.xpReward,
        icon: field.icon,
        template: field.template
      }));
      setPremiumFields(fields);
    } catch (error) {
      console.error('Failed to load premium fields:', error);
    }
  };

  // Track if user has subscription (grants all fields)
  const [hasAllFieldsAccess, setHasAllFieldsAccess] = useState(false);

  const loadPurchasedFields = async () => {
    try {
      const response = await fetch('/api/robots-fields/purchases', { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        // Handle new response format with subscription status
        if (data.purchases) {
          setPurchasedFields(data.purchases);
          setHasAllFieldsAccess(data.hasAllFieldsAccess || false);
        } else {
          // Legacy format: array of purchases
          setPurchasedFields(data);
        }
      }
    } catch (error) {
      console.error('Failed to load purchased fields:', error);
    }
  };

  const isPurchased = (fieldKey: string): boolean => {
    // Subscribers have access to all fields
    if (hasAllFieldsAccess) return true;
    return purchasedFields.some(p => p.fieldKey === fieldKey);
  };

  const handleUnlockField = async (field: PremiumField) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to unlock premium fields.",
        variant: "destructive",
      });
      window.location.href = "/api/login";
      return;
    }

    setSelectedField(field);
    setIsLoadingPayment(true);

    try {
      const response = await fetch('/api/robots-fields/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldKey: field.key
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment');
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
      setShowPaymentModal(true);
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : 'Failed to initiate payment',
        variant: "destructive",
      });
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!clientSecret || !selectedField) return;

    const paymentIntentId = clientSecret.split('_secret_')[0];

    try {
      const response = await fetch('/api/robots-fields/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }

      toast({
        title: `🎉 ${selectedField.name} Unlocked!`,
        description: `You earned ${selectedField.xpReward} XP! The field is now available in your builder.`,
        className: "border-green-500/50 bg-green-500/10",
      });

      const fieldKey = selectedField.key.toLowerCase().replace(/_/g, '');
      const mapping: Record<string, keyof RobotsTxtFormData> = {
        advancedcrawldelay: 'advancedCrawlDelay',
        sitemaprules: 'sitemapRules',
        botspecificrules: 'botSpecificRules',
        advancedpatterns: 'advancedPatterns',
        hostdirective: 'hostDirective',
        requestrate: 'requestRate',
      };

      const formFieldKey = mapping[fieldKey];
      if (formFieldKey) {
        setValue(formFieldKey, selectedField.template);
      }

      await loadPurchasedFields();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      setShowPaymentModal(false);
      setSelectedField(null);
      setClientSecret("");
    } catch (error) {
      toast({
        title: "Confirmation Error",
        description: "Payment succeeded but confirmation failed. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const generateRobotsTxt = (): string => {
    let content = `# robots.txt for ${formData.websiteUrl}\n# Generated with ROBOSCAN Builder\n\n`;

    if (formData.defaultAccess === 'allow-all') {
      content += `User-agent: *\nAllow: /\n`;
    } else if (formData.defaultAccess === 'block-all') {
      content += `User-agent: *\nDisallow: /\n`;
    } else {
      content += `User-agent: *\n`;
      
      if (formData.disallowedPaths) {
        const paths = formData.disallowedPaths.split('\n').filter(p => p.trim());
        paths.forEach(path => {
          content += `Disallow: ${path.trim()}\n`;
        });
      }

      if (formData.allowedPaths) {
        const paths = formData.allowedPaths.split('\n').filter(p => p.trim());
        paths.forEach(path => {
          content += `Allow: ${path.trim()}\n`;
        });
      }
    }

    if (formData.crawlDelay && formData.crawlDelay !== "0") {
      content += `\nCrawl-delay: ${formData.crawlDelay}\n`;
    }

    if (formData.advancedCrawlDelay && isPurchased('ADVANCED_CRAWL_DELAY')) {
      content += `\n${formData.advancedCrawlDelay}\n`;
    }

    if (formData.botSpecificRules && isPurchased('BOT_SPECIFIC_RULES')) {
      content += `\n${formData.botSpecificRules}\n`;
    }

    if (formData.advancedPatterns && isPurchased('ADVANCED_PATTERNS')) {
      content += `\n${formData.advancedPatterns}\n`;
    }

    if (formData.requestRate && isPurchased('REQUEST_RATE')) {
      content += `\n${formData.requestRate}\n`;
    }

    if (formData.hostDirective && isPurchased('HOST_DIRECTIVE')) {
      content += `\n${formData.hostDirective}\n`;
    }

    if (formData.sitemapUrl) {
      content += `\nSitemap: ${formData.sitemapUrl}\n`;
    }

    if (formData.sitemapRules && isPurchased('SITEMAP_RULES')) {
      content += `${formData.sitemapRules}\n`;
    }

    return content;
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    
    const errors: string[] = [];
    const robotsTxtContent = generateRobotsTxt();

    if (!formData.websiteUrl) {
      errors.push("Website URL is required");
    }

    if (robotsTxtContent.length > 500000) {
      errors.push("File size exceeds 500KB limit");
    }

    const lines = robotsTxtContent.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        if (!trimmed.includes(':') && trimmed !== '') {
          errors.push(`Line ${index + 1}: Invalid syntax - missing colon`);
        }
      }
    });

    setValidationResult({
      isValid: errors.length === 0,
      errors
    });

    if (errors.length === 0) {
      toast({
        title: "Validation Successful",
        description: "Your robots.txt file is properly formatted!",
      });
    } else {
      toast({
        title: "Validation Issues Found",
        description: `${errors.length} issue(s) detected.`,
        variant: "destructive",
      });
    }

    setIsValidating(false);
  };

  const handleCopy = async () => {
    const content = generateRobotsTxt();
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "The robots.txt content has been copied successfully.",
    });
  };

  const handleDownload = () => {
    const content = generateRobotsTxt();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your robots.txt file is being downloaded.",
    });
  };

  const handleImport = (data: ParsedRobotsTxt) => {
    // Populate form fields with parsed data
    setValue('sitemapUrl', data.sitemapUrl);
    setValue('crawlDelay', data.crawlDelay || '0');
    setValue('disallowedPaths', data.disallowedPaths);
    setValue('allowedPaths', data.allowedPaths);
    setValue('defaultAccess', data.defaultAccess);
    
    toast({
      title: "Configuration Imported",
      description: `Imported ${data.metadata.totalRules} rules from external robots.txt`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-primary font-heading text-xl font-bold tracking-tighter">
            <Shield className="w-6 h-6" />
            <span>ROBOSCAN</span>
          </a>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-import-url"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import from URL
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={runTour}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-robots-tour"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Bot className="w-4 h-4" />
              <span className="text-sm font-medium">Crawl Control Tool</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              robots.txt Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create a professional robots.txt file to control how search engines and AI bots crawl your website.
              Set clear guidelines for bot behavior and improve your SEO.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Configure crawl rules and bot access permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl" data-testid="label-website-url">
                    Website URL *
                  </Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://example.com"
                    {...register("websiteUrl")}
                    data-testid="input-website-url"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="defaultAccess" data-testid="label-default-access">
                    Default Access Policy *
                  </Label>
                  <Select 
                    value={formData.defaultAccess} 
                    onValueChange={(value) => setValue('defaultAccess', value as any)}
                  >
                    <SelectTrigger data-testid="select-default-access">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allow-all">Allow All Bots</SelectItem>
                      <SelectItem value="block-all">Block All Bots</SelectItem>
                      <SelectItem value="custom">Custom Rules</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.defaultAccess === 'custom' && (
                  <>
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label htmlFor="disallowedPaths" data-testid="label-disallowed-paths">
                        Blocked Paths
                      </Label>
                      <Textarea
                        id="disallowedPaths"
                        placeholder="/admin/&#10;/private/&#10;/api/"
                        {...register("disallowedPaths")}
                        className="min-h-[120px] font-mono text-sm"
                        data-testid="textarea-disallowed-paths"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allowedPaths" data-testid="label-allowed-paths">
                        Allowed Paths
                      </Label>
                      <Textarea
                        id="allowedPaths"
                        placeholder="/public/&#10;/assets/"
                        {...register("allowedPaths")}
                        className="min-h-[120px] font-mono text-sm"
                        data-testid="textarea-allowed-paths"
                      />
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="crawlDelay" data-testid="label-crawl-delay">
                    Crawl Delay (seconds)
                  </Label>
                  <Input
                    id="crawlDelay"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register("crawlDelay")}
                    data-testid="input-crawl-delay"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="sitemapUrl" data-testid="label-sitemap-url">
                    Sitemap URL
                  </Label>
                  <Input
                    id="sitemapUrl"
                    type="url"
                    placeholder="https://example.com/sitemap.xml"
                    {...register("sitemapUrl")}
                    data-testid="input-sitemap-url"
                  />
                </div>

                {premiumFields.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Premium Fields</h3>
                        <Badge variant="secondary" className="ml-auto">
                          Advanced Control
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Unlock advanced features for professional-grade bot management and earn XP
                      </p>

                      <div className="grid gap-4">
                        {premiumFields.map((field) => {
                          const IconComponent = iconMap[field.icon] || Package;
                          const purchased = isPurchased(field.key);
                          const fieldKey = field.key.toLowerCase().replace(/_/g, '') as keyof RobotsTxtFormData;
                          const mapping: Record<string, keyof RobotsTxtFormData> = {
                            advancedcrawldelay: 'advancedCrawlDelay',
                            sitemaprules: 'sitemapRules',
                            botspecificrules: 'botSpecificRules',
                            advancedpatterns: 'advancedPatterns',
                            hostdirective: 'hostDirective',
                            requestrate: 'requestRate',
                          };
                          const actualFieldKey = mapping[fieldKey];

                          return (
                            <Card
                              key={field.key}
                              className={`relative ${purchased ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className={`p-2 rounded-lg ${purchased ? 'bg-primary/20' : 'bg-muted'}`}>
                                    <IconComponent className={`w-5 h-5 ${purchased ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <h4 className="font-semibold flex items-center gap-2">
                                          {field.name}
                                          {purchased ? (
                                            <Badge variant="default" className="text-xs">
                                              <Unlock className="w-3 h-3 mr-1" />
                                              Unlocked
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-xs">
                                              <Lock className="w-3 h-3 mr-1" />
                                              Locked
                                            </Badge>
                                          )}
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {field.description}
                                        </p>
                                      </div>
                                    </div>

                                    {purchased ? (
                                      <Textarea
                                        {...register(actualFieldKey)}
                                        className="min-h-[100px] font-mono text-sm mt-3"
                                        placeholder={field.template}
                                      />
                                    ) : (
                                      <div className="flex items-center gap-3 mt-3">
                                        <Button
                                          size="sm"
                                          onClick={() => handleUnlockField(field)}
                                          disabled={isLoadingPayment}
                                          className="bg-primary"
                                        >
                                          <DollarSign className="w-4 h-4 mr-1" />
                                          Unlock for ${field.price}
                                        </Button>
                                        <Badge variant="outline" className="text-xs">
                                          <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                                          +{field.xpReward} XP
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    This is how your robots.txt file will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generateRobotsTxt()}
                    readOnly
                    className="min-h-[500px] font-mono text-sm bg-muted/50"
                    data-testid="textarea-preview"
                  />
                </CardContent>
              </Card>

              {validationResult && (
                <Card className={validationResult.isValid ? "border-green-500" : "border-red-500"}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      {validationResult.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">
                          {validationResult.isValid ? "Validation Passed" : "Validation Issues"}
                        </h3>
                        {!validationResult.isValid && validationResult.errors.length > 0 && (
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {validationResult.errors.map((error, index) => (
                              <li key={index} className="flex items-start gap-2" data-testid={`validation-error-${index}`}>
                                <span className="text-red-500">•</span>
                                <span>{error}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="flex-1"
                  data-testid="button-validate"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isValidating ? "Validating..." : "Validate"}
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="secondary"
                  className="flex-1"
                  data-testid="button-copy"
                >
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  className="flex-1"
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </Button>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    Quick Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Place the robots.txt file in your website's root directory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Use specific paths for better control over crawling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Premium fields provide advanced bot management capabilities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Unlock premium features to earn XP and level up your expertise</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Unlock Premium Field
            </DialogTitle>
            <DialogDescription>
              {selectedField && (
                <>
                  Complete your purchase to unlock <strong>{selectedField.name}</strong> and earn <strong>{selectedField.xpReward} XP</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {clientSecret && selectedField && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onCancel={() => {
                  setShowPaymentModal(false);
                  setSelectedField(null);
                  setClientSecret("");
                }}
                fieldName={selectedField.name}
              />
            </Elements>
          )}
        </DialogContent>
      </Dialog>

      <ImportUrlDialog
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        type="robots"
      />
    </div>
  );
}
