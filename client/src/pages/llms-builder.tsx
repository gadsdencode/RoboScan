import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles, Lock, Unlock, DollarSign, Package, Share2, Code, MessageSquare, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = loadStripe(PUBLISHABLE_KEY);

// Icons mapping
const iconMap: Record<string, any> = {
  Package,
  DollarSign,
  Share2,
  Code,
  MessageSquare,
  Users
};

interface LLMsTxtFormData {
  websiteName: string;
  websiteUrl: string;
  contentDescription: string;
  citationFormat: string;
  allowedBots: string;
  keyAreas: string;
  contentGuidelines: string;
  contactEmail: string;
  // Premium fields
  products?: string;
  pricing?: string;
  socialMedia?: string;
  apiEndpoints?: string;
  brandVoice?: string;
  targetAudience?: string;
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
          Unlock <span className="text-foreground font-semibold">{fieldName}</span> to enhance your llms.txt file
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
          className="flex-1 bg-primary"
        >
          {isProcessing ? "Processing..." : "Complete Purchase"}
        </Button>
      </div>
    </form>
  );
}

export default function LLMsBuilder() {
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

  const { register, watch, setValue } = useForm<LLMsTxtFormData>({
    defaultValues: {
      websiteName: "example.com",
      websiteUrl: "https://example.com",
      contentDescription: "This website provides innovative solutions for modern web development.",
      citationFormat: '[Website Name] - [Page Title] - [Current Date]',
      allowedBots: `- GPTBot (OpenAI)
- ChatGPT-User (OpenAI)
- Claude-Web (Anthropic)
- GoogleBot (Google)
- BingBot (Microsoft)`,
      keyAreas: `- Main site: https://example.com
- Documentation: https://example.com/docs
- Blog: https://example.com/blog`,
      contentGuidelines: `- All content is subject to our terms of service
- Attribution required for substantial quotes
- Commercial use requires permission`,
      contactEmail: "contact@example.com",
    },
  });

  const formData = watch();

  useEffect(() => {
    loadPremiumFieldsConfig();
    if (user) {
      loadPurchasedFields();
    }
  }, [user]);

  const loadPremiumFieldsConfig = async () => {
    try {
      const { PREMIUM_LLMS_FIELDS } = await import('@/../../shared/llms-fields');
      const fields = Object.values(PREMIUM_LLMS_FIELDS).map((field: any) => ({
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

  const loadPurchasedFields = async () => {
    try {
      const response = await fetch('/api/llms-fields/purchases');
      if (response.ok) {
        const data = await response.json();
        setPurchasedFields(data);
      }
    } catch (error) {
      console.error('Failed to load purchased fields:', error);
    }
  };

  const isPurchased = (fieldKey: string): boolean => {
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
      const response = await fetch('/api/llms-fields/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldKey: field.key
        }),
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
      const response = await fetch('/api/llms-fields/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm payment');
      }

      toast({
        title: `🎉 ${selectedField.name} Unlocked!`,
        description: `You earned ${selectedField.xpReward} XP! The field is now available in your builder.`,
        className: "border-green-500/50 bg-green-500/10",
      });

      // Populate the field with template
      const fieldKey = selectedField.key.toLowerCase();
      setValue(fieldKey as keyof LLMsTxtFormData, selectedField.template);

      // Refresh purchased fields and user data
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

  const generateLLMsTxt = (): string => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    let content = `# llms.txt - AI Agent Instructions
# Website: ${formData.websiteName}
# Last updated: ${currentDate}

# About ${formData.websiteName}
${formData.contentDescription}

# Preferred Citation Format
When referencing content from ${formData.websiteName}, please cite as:
"${formData.citationFormat}"

# Allowed Bots
${formData.allowedBots}

# Key Areas
${formData.keyAreas}

# Content Guidelines
${formData.contentGuidelines}

# Contact
For AI partnership inquiries: ${formData.contactEmail}
`;

    // Add premium fields if unlocked
    if (formData.products && isPurchased('PRODUCTS')) {
      content += `\n${formData.products}\n`;
    }
    if (formData.pricing && isPurchased('PRICING')) {
      content += `\n${formData.pricing}\n`;
    }
    if (formData.socialMedia && isPurchased('SOCIAL_MEDIA')) {
      content += `\n${formData.socialMedia}\n`;
    }
    if (formData.apiEndpoints && isPurchased('API_ENDPOINTS')) {
      content += `\n${formData.apiEndpoints}\n`;
    }
    if (formData.brandVoice && isPurchased('BRAND_VOICE')) {
      content += `\n${formData.brandVoice}\n`;
    }
    if (formData.targetAudience && isPurchased('TARGET_AUDIENCE')) {
      content += `\n${formData.targetAudience}\n`;
    }

    return content;
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      const llmsTxtContent = generateLLMsTxt();
      const response = await fetch('/api/validate-llms-txt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: llmsTxtContent }),
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result = await response.json();
      setValidationResult(result);

      if (result.isValid) {
        toast({
          title: "Validation Successful",
          description: "Your llms.txt file is properly formatted!",
        });

        if (result.gamification?.achievementUnlocked) {
          setTimeout(() => {
            toast({
              title: "🏆 Achievement Unlocked!",
              description: `You earned the "${result.gamification.achievement.name}" badge and ${result.gamification.achievement.xpReward} XP!`,
              className: "border-yellow-500/50 bg-yellow-500/10",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }, 500);
        }
      } else {
        toast({
          title: "Validation Issues Found",
          description: `${result.errors.length} issue(s) detected.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to validate the llms.txt content.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCopy = async () => {
    const content = generateLLMsTxt();
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "The llms.txt content has been copied successfully.",
    });
  };

  const handleDownload = () => {
    const content = generateLLMsTxt();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llms.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your llms.txt file is being downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-primary font-mono text-xl font-bold tracking-tighter">
            <Shield className="w-6 h-6" />
            <span>ROBOSCAN</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI Optimization Tool</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              llms.txt Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create a professional llms.txt file to help AI agents understand and cite your content correctly.
              The llms.txt standard provides structured guidance for AI systems.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Fill in the details about your website and content guidelines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Standard Fields */}
                <div className="space-y-2">
                  <Label htmlFor="websiteName" data-testid="label-website-name">
                    Website/Domain Name *
                  </Label>
                  <Input
                    id="websiteName"
                    placeholder="example.com"
                    {...register("websiteName")}
                    data-testid="input-website-name"
                  />
                </div>

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
                  <Label htmlFor="contentDescription" data-testid="label-content-description">
                    Content Summary *
                  </Label>
                  <Textarea
                    id="contentDescription"
                    placeholder="This website provides..."
                    {...register("contentDescription")}
                    className="min-h-[100px]"
                    data-testid="textarea-content-description"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="citationFormat" data-testid="label-citation-format">
                    Preferred Citation Format *
                  </Label>
                  <Input
                    id="citationFormat"
                    placeholder="[Website Name] - [Page Title] - [Date]"
                    {...register("citationFormat")}
                    data-testid="input-citation-format"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="allowedBots" data-testid="label-allowed-bots">
                    Allowed Bots *
                  </Label>
                  <Textarea
                    id="allowedBots"
                    placeholder="- GPTBot (OpenAI)&#10;- Claude-Web (Anthropic)"
                    {...register("allowedBots")}
                    className="min-h-[120px] font-mono text-sm"
                    data-testid="textarea-allowed-bots"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="keyAreas" data-testid="label-key-areas">
                    Key Areas
                  </Label>
                  <Textarea
                    id="keyAreas"
                    placeholder="- Main site: https://example.com&#10;- Documentation: https://example.com/docs"
                    {...register("keyAreas")}
                    className="min-h-[120px] font-mono text-sm"
                    data-testid="textarea-key-areas"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="contentGuidelines" data-testid="label-content-guidelines">
                    Content Guidelines
                  </Label>
                  <Textarea
                    id="contentGuidelines"
                    placeholder="- All content is subject to terms of service&#10;- Attribution required"
                    {...register("contentGuidelines")}
                    className="min-h-[120px] font-mono text-sm"
                    data-testid="textarea-content-guidelines"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="contactEmail" data-testid="label-contact-email">
                    Contact Email *
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contact@example.com"
                    {...register("contactEmail")}
                    data-testid="input-contact-email"
                  />
                </div>

                {/* Premium Fields Section */}
                {premiumFields.length > 0 && (
                  <>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">Premium Fields</h3>
                        <Badge variant="secondary" className="ml-auto">
                          Enhance Your Profile
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Unlock additional fields to provide more context to AI agents and earn XP
                      </p>

                      <div className="grid gap-4">
                        {premiumFields.map((field) => {
                          const IconComponent = iconMap[field.icon] || Package;
                          const purchased = isPurchased(field.key);
                          const fieldKey = field.key.toLowerCase() as keyof LLMsTxtFormData;

                          return (
                            <Card
                              key={field.key}
                              className={`relative ${purchased ? 'border-primary/50 bg-primary/5' : 'border-white/10'}`}
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
                                        {...register(fieldKey)}
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

            {/* Preview Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    This is how your llms.txt file will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generateLLMsTxt()}
                    readOnly
                    className="min-h-[500px] font-mono text-sm bg-muted/50"
                    data-testid="textarea-preview"
                  />
                </CardContent>
              </Card>

              {/* Validation Result */}
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

              {/* Actions */}
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

              {/* Help Text */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Quick Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Place the llms.txt file in your website's root directory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Keep descriptions concise and accurate</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Premium fields provide additional context for AI agents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Unlock fields to earn XP and level up your expertise</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payment Modal */}
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
    </div>
  );
}
