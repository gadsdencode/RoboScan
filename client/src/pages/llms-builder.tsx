import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Shield, Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface LLMsTxtFormData {
  websiteName: string;
  websiteUrl: string;
  contentDescription: string;
  citationFormat: string;
  allowedBots: string;
  keyAreas: string;
  contentGuidelines: string;
  contactEmail: string;
}

export default function LLMsBuilder() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const { register, watch } = useForm<LLMsTxtFormData>({
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

  const generateLLMsTxt = (): string => {
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `# llms.txt - AI Agent Instructions
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
                {/* Website Name */}
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
                  <p className="text-xs text-muted-foreground">
                    Your website's domain or company name
                  </p>
                </div>

                {/* Website URL */}
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
                  <p className="text-xs text-muted-foreground">
                    The full URL of your website
                  </p>
                </div>

                <Separator />

                {/* Content Description */}
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
                  <p className="text-xs text-muted-foreground">
                    A brief description of your website's main purpose or offerings
                  </p>
                </div>

                <Separator />

                {/* Citation Format */}
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
                  <p className="text-xs text-muted-foreground">
                    How AI agents should cite your content (e.g., include brackets for placeholders)
                  </p>
                </div>

                <Separator />

                {/* Allowed Bots */}
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
                  <p className="text-xs text-muted-foreground">
                    List of AI crawlers and bots allowed to access your content (one per line)
                  </p>
                </div>

                <Separator />

                {/* Key Areas */}
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
                  <p className="text-xs text-muted-foreground">
                    Important sections of your website (one per line, use bullet points)
                  </p>
                </div>

                <Separator />

                {/* Content Guidelines */}
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
                  <p className="text-xs text-muted-foreground">
                    Usage policies and attribution requirements (one per line)
                  </p>
                </div>

                <Separator />

                {/* Contact Email */}
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
                  <p className="text-xs text-muted-foreground">
                    Email for AI partnership inquiries
                  </p>
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
                      <span>Update the file when your content structure changes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Use clear citation formats to ensure proper attribution</span>
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
