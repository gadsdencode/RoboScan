import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles, Plus, Trash2, DollarSign, Building, BadgeCheck, Globe } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AdRecord {
  domain: string;
  accountId: string;
  relationship: string;
  certificationId: string;
}

interface AdsFormData {
  contactEmail: string;
  contactUrl: string;
  records: AdRecord[];
}

// Common ad network presets
const AD_NETWORK_PRESETS = [
  { domain: "google.com", certificationId: "f08c47fec0942fa0", name: "Google AdSense/AdX" },
  { domain: "amazon-adsystem.com", certificationId: "", name: "Amazon Publisher Services" },
  { domain: "facebook.com", certificationId: "c3e20eee3f780d68", name: "Meta Audience Network" },
  { domain: "pubmatic.com", certificationId: "5d62403b186f2ace", name: "PubMatic" },
  { domain: "openx.com", certificationId: "540191398", name: "OpenX" },
  { domain: "rubiconproject.com", certificationId: "0bfd66d529a55807", name: "Magnite (Rubicon)" },
  { domain: "appnexus.com", certificationId: "f5ab79cb980f11d1", name: "Xandr (AppNexus)" },
  { domain: "indexexchange.com", certificationId: "50b1c356f2c5c8fc", name: "Index Exchange" },
];

export default function AdsBuilder() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const { register, watch, control, setValue } = useForm<AdsFormData>({
    defaultValues: {
      contactEmail: "adops@example.com",
      contactUrl: "https://example.com/ads-contact",
      records: [
        { domain: "google.com", accountId: "pub-0000000000000000", relationship: "DIRECT", certificationId: "f08c47fec0942fa0" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "records",
  });

  const formData = watch();

  const generateAdsTxt = (): string => {
    const lines: string[] = [];
    
    // Header comment
    lines.push("# ads.txt - Authorized Digital Sellers");
    lines.push("# IAB Tech Lab specification: https://iabtechlab.com/ads-txt/");
    lines.push("");

    // Contact variables
    if (formData.contactEmail) {
      lines.push(`CONTACT=${formData.contactEmail}`);
    }
    if (formData.contactUrl) {
      lines.push(`CONTACT=${formData.contactUrl}`);
    }
    if (formData.contactEmail || formData.contactUrl) {
      lines.push("");
    }

    // Ad records
    formData.records.forEach((record) => {
      if (record.domain && record.accountId) {
        let line = `${record.domain}, ${record.accountId}, ${record.relationship}`;
        if (record.certificationId) {
          line += `, ${record.certificationId}`;
        }
        lines.push(line);
      }
    });

    return lines.join('\n');
  };

  const handleValidate = async () => {
    setIsValidating(true);
    const errors: string[] = [];
    
    if (formData.records.length === 0) {
      errors.push("At least one ad seller record is required");
    }

    formData.records.forEach((record, index) => {
      if (!record.domain) {
        errors.push(`Record ${index + 1}: Domain is required`);
      } else if (!record.domain.includes('.')) {
        errors.push(`Record ${index + 1}: Invalid domain format`);
      }
      
      if (!record.accountId) {
        errors.push(`Record ${index + 1}: Account ID is required`);
      }

      if (!record.relationship || (record.relationship !== 'DIRECT' && record.relationship !== 'RESELLER')) {
        errors.push(`Record ${index + 1}: Relationship must be DIRECT or RESELLER`);
      }
    });

    // Validate email format
    if (formData.contactEmail && !formData.contactEmail.includes('@')) {
      errors.push("Contact email must be a valid email address");
    }

    setValidationResult({
      isValid: errors.length === 0,
      errors
    });

    if (errors.length === 0) {
      toast({
        title: "Validation Successful",
        description: "Your ads.txt file is IAB compliant!",
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
    const content = generateAdsTxt();
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "The ads.txt content has been copied successfully.",
    });
  };

  const handleDownload = () => {
    const content = generateAdsTxt();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ads.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your ads.txt file is being downloaded.",
    });
  };

  const addRecord = () => {
    append({
      domain: "",
      accountId: "",
      relationship: "DIRECT",
      certificationId: ""
    });
  };

  const addPreset = (preset: typeof AD_NETWORK_PRESETS[0]) => {
    append({
      domain: preset.domain,
      accountId: "",
      relationship: "DIRECT",
      certificationId: preset.certificationId
    });
    toast({
      title: `Added ${preset.name}`,
      description: "Don't forget to enter your Account ID",
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-500 mb-4">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Ad Transparency Tool</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              ads.txt Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create an IAB-compliant ads.txt file to declare authorized digital sellers and prevent ad fraud.
            </p>
            <Badge variant="secondary" className="mt-4">
              IAB Tech Lab Standard
            </Badge>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Seller Configuration
                </CardTitle>
                <CardDescription>
                  Declare your authorized advertising partners
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Variables */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Contact Information</span>
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="adops@example.com"
                        {...register("contactEmail")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactUrl">Contact URL</Label>
                      <Input
                        id="contactUrl"
                        type="url"
                        placeholder="https://example.com/ads"
                        {...register("contactUrl")}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quick Add Presets */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Quick Add Networks</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AD_NETWORK_PRESETS.slice(0, 4).map((preset) => (
                      <Button
                        key={preset.domain}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addPreset(preset)}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Ad Records */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Seller Records ({fields.length})</span>
                    </div>
                    <Button type="button" size="sm" onClick={addRecord} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Record
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Seller {index + 1}</span>
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
                            <Label className="text-xs">Domain *</Label>
                            <Input
                              placeholder="google.com"
                              {...register(`records.${index}.domain`)}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Account ID *</Label>
                            <Input
                              placeholder="pub-0000000000000000"
                              {...register(`records.${index}.accountId`)}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Relationship *</Label>
                            <Select
                              value={formData.records[index]?.relationship || "DIRECT"}
                              onValueChange={(value) => setValue(`records.${index}.relationship`, value)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DIRECT">DIRECT</SelectItem>
                                <SelectItem value="RESELLER">RESELLER</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Certification ID</Label>
                            <Input
                              placeholder="f08c47fec0942fa0"
                              {...register(`records.${index}.certificationId`)}
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {fields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No seller records yet</p>
                      <p className="text-sm">Click "Add Record" or use Quick Add to get started</p>
                    </div>
                  )}
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
                    This is how your ads.txt file will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generateAdsTxt()}
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
                          {validationResult.isValid ? "IAB Compliant" : "Validation Issues"}
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
              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    Understanding ads.txt
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span><strong>DIRECT:</strong> You have a direct relationship with the ad network</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span><strong>RESELLER:</strong> Inventory sold through an intermediary</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span>Place ads.txt in your website's root directory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500">•</span>
                      <span>Get Account IDs from your ad network dashboards</span>
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

