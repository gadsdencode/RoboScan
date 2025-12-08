import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles, Plus, Trash2, Bot, Brain, Lock, Globe, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface AIRule {
  userAgent: string;
  allowedPaths: string;
  disallowedPaths: string;
  crawlDelay: string;
}

interface AIFormData {
  websiteUrl: string;
  defaultPolicy: 'allow' | 'deny' | 'custom';
  allowTraining: boolean;
  allowScraping: boolean;
  allowCitation: boolean;
  requireAttribution: boolean;
  contactEmail: string;
  policyUrl: string;
  rules: AIRule[];
  customDirectives: string;
}

// Known AI crawlers
const AI_CRAWLERS = [
  { agent: "GPTBot", name: "OpenAI GPTBot", company: "OpenAI" },
  { agent: "ChatGPT-User", name: "ChatGPT User", company: "OpenAI" },
  { agent: "Google-Extended", name: "Google Extended", company: "Google" },
  { agent: "Googlebot-AI", name: "Googlebot AI", company: "Google" },
  { agent: "Claude-Web", name: "Claude Web", company: "Anthropic" },
  { agent: "anthropic-ai", name: "Anthropic AI", company: "Anthropic" },
  { agent: "CCBot", name: "Common Crawl Bot", company: "Common Crawl" },
  { agent: "Bytespider", name: "ByteDance Spider", company: "ByteDance" },
  { agent: "cohere-ai", name: "Cohere AI", company: "Cohere" },
  { agent: "PerplexityBot", name: "Perplexity Bot", company: "Perplexity" },
  { agent: "Meta-ExternalAgent", name: "Meta AI Agent", company: "Meta" },
];

export default function AIBuilder() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const { register, watch, control, setValue } = useForm<AIFormData>({
    defaultValues: {
      websiteUrl: "https://example.com",
      defaultPolicy: "custom",
      allowTraining: false,
      allowScraping: true,
      allowCitation: true,
      requireAttribution: true,
      contactEmail: "ai@example.com",
      policyUrl: "https://example.com/ai-policy",
      rules: [
        {
          userAgent: "*",
          allowedPaths: "/blog/\n/docs/\n/public/",
          disallowedPaths: "/private/\n/admin/\n/user-data/",
          crawlDelay: "2"
        },
      ],
      customDirectives: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "rules",
  });

  const formData = watch();

  const generateAITxt = (): string => {
    const lines: string[] = [];
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Header
    lines.push("# ai.txt - AI Interaction Guidelines");
    lines.push(`# Website: ${formData.websiteUrl}`);
    lines.push(`# Last updated: ${currentDate}`);
    lines.push("# Specification: https://spawning.ai/ai-txt");
    lines.push("");

    // Policy declarations
    lines.push("# === POLICY DECLARATIONS ===");
    lines.push("");
    lines.push(`# AI Training Permission: ${formData.allowTraining ? 'ALLOWED' : 'NOT ALLOWED'}`);
    lines.push(`AI-Training: ${formData.allowTraining ? 'allow' : 'disallow'}`);
    lines.push("");
    lines.push(`# AI Scraping Permission: ${formData.allowScraping ? 'ALLOWED' : 'NOT ALLOWED'}`);
    lines.push(`AI-Scraping: ${formData.allowScraping ? 'allow' : 'disallow'}`);
    lines.push("");
    lines.push(`# Citation Permission: ${formData.allowCitation ? 'ALLOWED' : 'NOT ALLOWED'}`);
    lines.push(`AI-Citation: ${formData.allowCitation ? 'allow' : 'disallow'}`);
    lines.push("");
    
    if (formData.requireAttribution) {
      lines.push("# Attribution required when citing content");
      lines.push("Attribution-Required: yes");
      lines.push("");
    }

    // Contact and policy
    if (formData.contactEmail) {
      lines.push(`Contact: mailto:${formData.contactEmail}`);
    }
    if (formData.policyUrl) {
      lines.push(`Policy: ${formData.policyUrl}`);
    }
    lines.push("");

    // Rules for specific bots
    lines.push("# === CRAWLER-SPECIFIC RULES ===");
    lines.push("");

    formData.rules.forEach((rule) => {
      lines.push(`User-agent: ${rule.userAgent}`);
      
      // Allowed paths
      if (rule.allowedPaths) {
        const paths = rule.allowedPaths.split('\n').filter(p => p.trim());
        paths.forEach(path => {
          lines.push(`Allow: ${path.trim()}`);
        });
      }
      
      // Disallowed paths
      if (rule.disallowedPaths) {
        const paths = rule.disallowedPaths.split('\n').filter(p => p.trim());
        paths.forEach(path => {
          lines.push(`Disallow: ${path.trim()}`);
        });
      }
      
      // Crawl delay
      if (rule.crawlDelay && rule.crawlDelay !== "0") {
        lines.push(`Crawl-delay: ${rule.crawlDelay}`);
      }
      
      lines.push("");
    });

    // Custom directives
    if (formData.customDirectives) {
      lines.push("# === CUSTOM DIRECTIVES ===");
      lines.push(formData.customDirectives);
    }

    return lines.join('\n');
  };

  const handleValidate = async () => {
    setIsValidating(true);
    const errors: string[] = [];
    
    if (formData.rules.length === 0) {
      errors.push("At least one rule block is required");
    }

    formData.rules.forEach((rule, index) => {
      if (!rule.userAgent) {
        errors.push(`Rule ${index + 1}: User-agent is required`);
      }
      
      if (rule.crawlDelay) {
        const delay = parseInt(rule.crawlDelay);
        if (isNaN(delay) || delay < 0) {
          errors.push(`Rule ${index + 1}: Crawl delay must be a positive number`);
        }
      }
    });

    // Validate email
    if (formData.contactEmail && !formData.contactEmail.includes('@')) {
      errors.push("Contact email must be a valid email address");
    }

    // Validate URL
    if (formData.policyUrl && !formData.policyUrl.startsWith('http')) {
      errors.push("Policy URL must start with http:// or https://");
    }

    setValidationResult({
      isValid: errors.length === 0,
      errors
    });

    if (errors.length === 0) {
      toast({
        title: "Validation Successful",
        description: "Your ai.txt file is properly formatted!",
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
    const content = generateAITxt();
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "The ai.txt content has been copied successfully.",
    });
  };

  const handleDownload = () => {
    const content = generateAITxt();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your ai.txt file is being downloaded.",
    });
  };

  const addRule = () => {
    append({
      userAgent: "*",
      allowedPaths: "",
      disallowedPaths: "",
      crawlDelay: "0"
    });
  };

  const addCrawlerRule = (crawler: typeof AI_CRAWLERS[0]) => {
    append({
      userAgent: crawler.agent,
      allowedPaths: "",
      disallowedPaths: "/",
      crawlDelay: "5"
    });
    toast({
      title: `Added ${crawler.name}`,
      description: `Rule for ${crawler.company}'s AI crawler added`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-500 mb-4">
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">AI Guidelines Tool</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              ai.txt Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create an ai.txt file to define how AI systems can interact with, train on, and cite your content.
            </p>
            <Badge variant="secondary" className="mt-4">
              AI Training & Scraping Control
            </Badge>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  AI Policy Configuration
                </CardTitle>
                <CardDescription>
                  Define your AI interaction policies and crawler rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="websiteUrl">Website URL</Label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      placeholder="https://example.com"
                      {...register("websiteUrl")}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        placeholder="ai@example.com"
                        {...register("contactEmail")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="policyUrl">Policy URL</Label>
                      <Input
                        id="policyUrl"
                        type="url"
                        placeholder="https://example.com/ai-policy"
                        {...register("policyUrl")}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Global Permissions */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Global Permissions</span>
                  </div>

                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Allow AI Training</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow AI models to train on your content
                        </p>
                      </div>
                      <Switch
                        checked={formData.allowTraining}
                        onCheckedChange={(checked) => setValue("allowTraining", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Allow AI Scraping</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow AI crawlers to access your content
                        </p>
                      </div>
                      <Switch
                        checked={formData.allowScraping}
                        onCheckedChange={(checked) => setValue("allowScraping", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Allow AI Citation</Label>
                        <p className="text-xs text-muted-foreground">
                          Allow AI to quote and cite your content
                        </p>
                      </div>
                      <Switch
                        checked={formData.allowCitation}
                        onCheckedChange={(checked) => setValue("allowCitation", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Require Attribution</Label>
                        <p className="text-xs text-muted-foreground">
                          Require source attribution when citing
                        </p>
                      </div>
                      <Switch
                        checked={formData.requireAttribution}
                        onCheckedChange={(checked) => setValue("requireAttribution", checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quick Add AI Crawlers */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Quick Block AI Crawlers</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AI_CRAWLERS.slice(0, 6).map((crawler) => (
                      <Button
                        key={crawler.agent}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addCrawlerRule(crawler)}
                        className="text-xs"
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        {crawler.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Rules Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Crawler Rules ({fields.length})</span>
                    </div>
                    <Button type="button" size="sm" onClick={addRule} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Rule
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4 border-violet-500/20">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Rule {index + 1}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(index)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">User-Agent *</Label>
                            <Select
                              value={formData.rules[index]?.userAgent || "*"}
                              onValueChange={(value) => setValue(`rules.${index}.userAgent`, value)}
                            >
                              <SelectTrigger className="text-sm font-mono">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="*">* (All bots)</SelectItem>
                                {AI_CRAWLERS.map((crawler) => (
                                  <SelectItem key={crawler.agent} value={crawler.agent}>
                                    {crawler.agent}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Crawl Delay (seconds)</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              {...register(`rules.${index}.crawlDelay`)}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-green-600">Allowed Paths (one per line)</Label>
                          <Textarea
                            placeholder="/blog/&#10;/docs/&#10;/public/"
                            {...register(`rules.${index}.allowedPaths`)}
                            className="min-h-[80px] font-mono text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-red-500">Disallowed Paths (one per line)</Label>
                          <Textarea
                            placeholder="/private/&#10;/admin/&#10;/user-data/"
                            {...register(`rules.${index}.disallowedPaths`)}
                            className="min-h-[80px] font-mono text-sm"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Separator />

                {/* Custom Directives */}
                <div className="space-y-2">
                  <Label htmlFor="customDirectives">Custom Directives</Label>
                  <Textarea
                    id="customDirectives"
                    placeholder="# Add any custom directives here"
                    {...register("customDirectives")}
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>
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
                    This is how your ai.txt file will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generateAITxt()}
                    readOnly
                    className="min-h-[400px] font-mono text-sm bg-muted/50"
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
                              <li key={index} className="flex items-start gap-2">
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
                >
                  <CheckCircle className="w-4 h-4" />
                  {isValidating ? "Validating..." : "Validate"}
                </Button>
                <Button
                  onClick={handleCopy}
                  variant="secondary"
                  className="flex-1"
                >
                  <Copy className="w-4 h-4" />
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  className="flex-1"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </Button>
              </div>

              {/* Help Text */}
              <Card className="bg-violet-500/5 border-violet-500/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-violet-500" />
                    AI Guidelines Best Practices
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500">•</span>
                      <span>Place ai.txt in your website's root directory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500">•</span>
                      <span>Use alongside robots.txt for comprehensive control</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500">•</span>
                      <span>Be specific about training vs. citation permissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-violet-500">•</span>
                      <span>Consider blocking individual AI crawlers if needed</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

