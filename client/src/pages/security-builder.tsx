import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles, ShieldCheck, Mail, Key, Globe, Calendar, Award, Link } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface SecurityTxtFormData {
  // Required fields
  contact: string;
  expires: string;
  // Optional fields
  encryption: string;
  acknowledgments: string;
  preferredLanguages: string;
  canonical: string;
  policy: string;
  hiring: string;
}

export default function SecurityBuilder() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  // Calculate default expiry date (1 year from now)
  const getDefaultExpiry = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };

  const { register, watch } = useForm<SecurityTxtFormData>({
    defaultValues: {
      contact: "mailto:security@example.com",
      expires: getDefaultExpiry(),
      encryption: "https://example.com/.well-known/pgp-key.txt",
      acknowledgments: "https://example.com/security/hall-of-fame",
      preferredLanguages: "en",
      canonical: "https://example.com/.well-known/security.txt",
      policy: "https://example.com/security/policy",
      hiring: "https://example.com/careers/security",
    },
  });

  const formData = watch();

  const generateSecurityTxt = (): string => {
    const lines: string[] = [];
    
    // Header comment
    lines.push("# security.txt - RFC 9116");
    lines.push("# https://securitytxt.org/");
    lines.push("");

    // Contact (Required) - can have multiple
    if (formData.contact) {
      formData.contact.split('\n').filter(c => c.trim()).forEach(contact => {
        lines.push(`Contact: ${contact.trim()}`);
      });
    }

    // Expires (Required)
    if (formData.expires) {
      // Convert date to ISO 8601 format with timezone
      const expiryDate = new Date(formData.expires);
      lines.push(`Expires: ${expiryDate.toISOString()}`);
    }

    // Encryption (Optional)
    if (formData.encryption) {
      lines.push(`Encryption: ${formData.encryption}`);
    }

    // Acknowledgments (Optional)
    if (formData.acknowledgments) {
      lines.push(`Acknowledgments: ${formData.acknowledgments}`);
    }

    // Preferred-Languages (Optional)
    if (formData.preferredLanguages) {
      lines.push(`Preferred-Languages: ${formData.preferredLanguages}`);
    }

    // Canonical (Optional)
    if (formData.canonical) {
      lines.push(`Canonical: ${formData.canonical}`);
    }

    // Policy (Optional)
    if (formData.policy) {
      lines.push(`Policy: ${formData.policy}`);
    }

    // Hiring (Optional)
    if (formData.hiring) {
      lines.push(`Hiring: ${formData.hiring}`);
    }

    return lines.join('\n');
  };

  const handleValidate = async () => {
    setIsValidating(true);
    const errors: string[] = [];
    
    // Contact is required
    if (!formData.contact || !formData.contact.trim()) {
      errors.push("Contact field is required (RFC 9116)");
    } else {
      // Validate contact format
      const contacts = formData.contact.split('\n').filter(c => c.trim());
      contacts.forEach((contact, index) => {
        const trimmed = contact.trim();
        if (!trimmed.startsWith('mailto:') && !trimmed.startsWith('https://') && !trimmed.startsWith('tel:')) {
          errors.push(`Contact ${index + 1}: Must start with mailto:, https://, or tel:`);
        }
      });
    }

    // Expires is required
    if (!formData.expires) {
      errors.push("Expires field is required (RFC 9116)");
    } else {
      const expiryDate = new Date(formData.expires);
      const now = new Date();
      if (expiryDate <= now) {
        errors.push("Expires date must be in the future");
      }
    }

    // Validate URLs
    const urlFields = [
      { name: 'Encryption', value: formData.encryption },
      { name: 'Acknowledgments', value: formData.acknowledgments },
      { name: 'Canonical', value: formData.canonical },
      { name: 'Policy', value: formData.policy },
      { name: 'Hiring', value: formData.hiring },
    ];

    urlFields.forEach(({ name, value }) => {
      if (value && !value.startsWith('https://') && !value.startsWith('http://')) {
        errors.push(`${name}: Must be a valid URL starting with https://`);
      }
    });

    setValidationResult({
      isValid: errors.length === 0,
      errors
    });

    if (errors.length === 0) {
      toast({
        title: "Validation Successful",
        description: "Your security.txt file is RFC 9116 compliant!",
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
    const content = generateSecurityTxt();
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "The security.txt content has been copied successfully.",
    });
  };

  const handleDownload = () => {
    const content = generateSecurityTxt();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'security.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your security.txt file is being downloaded.",
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Security Contact Tool</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              security.txt Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create an RFC 9116 compliant security.txt file to help security researchers report vulnerabilities responsibly.
            </p>
            <Badge variant="secondary" className="mt-4">
              RFC 9116 Standard
            </Badge>
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
                  Configure your security contact information and disclosure policy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Required Fields */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                    <span className="text-sm font-semibold">Mandatory Fields</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Contact *
                    </Label>
                    <Textarea
                      id="contact"
                      placeholder="mailto:security@example.com&#10;https://example.com/contact"
                      {...register("contact")}
                      className="min-h-[100px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Multiple contacts allowed (one per line). Use mailto:, https://, or tel: prefix.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expires" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Expires *
                    </Label>
                    <Input
                      id="expires"
                      type="date"
                      {...register("expires")}
                    />
                    <p className="text-xs text-muted-foreground">
                      When this file should be considered expired. Must be in the future.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Optional Fields */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                    <span className="text-sm font-semibold">Additional Fields</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="encryption" className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Encryption
                    </Label>
                    <Input
                      id="encryption"
                      type="url"
                      placeholder="https://example.com/.well-known/pgp-key.txt"
                      {...register("encryption")}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL to your PGP public key for encrypted communications.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="acknowledgments" className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Acknowledgments
                    </Label>
                    <Input
                      id="acknowledgments"
                      type="url"
                      placeholder="https://example.com/security/hall-of-fame"
                      {...register("acknowledgments")}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL to your security researcher hall of fame page.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredLanguages" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Preferred Languages
                    </Label>
                    <Input
                      id="preferredLanguages"
                      placeholder="en, es, de"
                      {...register("preferredLanguages")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated list of preferred languages (e.g., en, es).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="canonical" className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Canonical URL
                    </Label>
                    <Input
                      id="canonical"
                      type="url"
                      placeholder="https://example.com/.well-known/security.txt"
                      {...register("canonical")}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      The official location of this security.txt file.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="policy" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Policy
                    </Label>
                    <Input
                      id="policy"
                      type="url"
                      placeholder="https://example.com/security/policy"
                      {...register("policy")}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL to your vulnerability disclosure policy.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hiring">Hiring</Label>
                    <Input
                      id="hiring"
                      type="url"
                      placeholder="https://example.com/careers/security"
                      {...register("hiring")}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL to security-related job openings.
                    </p>
                  </div>
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
                    This is how your security.txt file will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generateSecurityTxt()}
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
                          {validationResult.isValid ? "RFC 9116 Compliant" : "Validation Issues"}
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
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Placement Guide
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>Place at: <code className="bg-muted px-1 rounded">/.well-known/security.txt</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>Must be served over HTTPS</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>Content-Type should be text/plain</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500">•</span>
                      <span>Remember to update before the Expires date</span>
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

