import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles, Plus, Trash2, MapPin } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

interface SitemapFormData {
  websiteUrl: string;
  urls: SitemapUrl[];
}

export default function SitemapBuilder() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const { register, watch, control, setValue } = useForm<SitemapFormData>({
    defaultValues: {
      websiteUrl: "https://example.com",
      urls: [
        { loc: "https://example.com/", lastmod: new Date().toISOString().split('T')[0], changefreq: "weekly", priority: "1.0" },
        { loc: "https://example.com/about", lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: "0.8" },
        { loc: "https://example.com/contact", lastmod: new Date().toISOString().split('T')[0], changefreq: "monthly", priority: "0.6" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "urls",
  });

  const formData = watch();

  const generateSitemap = (): string => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    formData.urls.forEach((url) => {
      if (url.loc) {
        xml += `
  <url>
    <loc>${escapeXml(url.loc)}</loc>`;
        if (url.lastmod) {
          xml += `
    <lastmod>${url.lastmod}</lastmod>`;
        }
        if (url.changefreq) {
          xml += `
    <changefreq>${url.changefreq}</changefreq>`;
        }
        if (url.priority) {
          xml += `
    <priority>${url.priority}</priority>`;
        }
        xml += `
  </url>`;
      }
    });

    xml += `
</urlset>`;
    return xml;
  };

  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const handleValidate = async () => {
    setIsValidating(true);
    const errors: string[] = [];
    
    if (formData.urls.length === 0) {
      errors.push("At least one URL is required");
    }

    formData.urls.forEach((url, index) => {
      if (!url.loc) {
        errors.push(`URL ${index + 1}: Location is required`);
      } else if (!url.loc.startsWith('http://') && !url.loc.startsWith('https://')) {
        errors.push(`URL ${index + 1}: Must be a valid URL starting with http:// or https://`);
      }
      
      if (url.priority) {
        const priority = parseFloat(url.priority);
        if (isNaN(priority) || priority < 0 || priority > 1) {
          errors.push(`URL ${index + 1}: Priority must be between 0.0 and 1.0`);
        }
      }

      if (url.lastmod && isNaN(Date.parse(url.lastmod))) {
        errors.push(`URL ${index + 1}: Invalid date format`);
      }
    });

    setValidationResult({
      isValid: errors.length === 0,
      errors
    });

    if (errors.length === 0) {
      toast({
        title: "Validation Successful",
        description: "Your sitemap.xml file is properly formatted!",
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
    const content = generateSitemap();
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "The sitemap.xml content has been copied successfully.",
    });
  };

  const handleDownload = () => {
    const content = generateSitemap();
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your sitemap.xml file is being downloaded.",
    });
  };

  const addUrl = () => {
    append({
      loc: `${formData.websiteUrl}/new-page`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: "monthly",
      priority: "0.5"
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-500 mb-4">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Page Structure Tool</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              sitemap.xml Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create a professional XML sitemap to help search engines discover and index all your important pages efficiently.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  URL Configuration
                </CardTitle>
                <CardDescription>
                  Add and configure the URLs you want included in your sitemap
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Base Website URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://example.com"
                    {...register("websiteUrl")}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Pages ({fields.length})</Label>
                    <Button type="button" size="sm" onClick={addUrl} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add URL
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Page {index + 1}</span>
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

                        <div className="space-y-2">
                          <Label className="text-xs">URL (loc) *</Label>
                          <Input
                            placeholder="https://example.com/page"
                            {...register(`urls.${index}.loc`)}
                            className="font-mono text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Last Modified</Label>
                            <Input
                              type="date"
                              {...register(`urls.${index}.lastmod`)}
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Change Freq</Label>
                            <Select
                              value={formData.urls[index]?.changefreq || "monthly"}
                              onValueChange={(value) => setValue(`urls.${index}.changefreq`, value)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="always">Always</SelectItem>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                                <SelectItem value="never">Never</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Priority</Label>
                            <Select
                              value={formData.urls[index]?.priority || "0.5"}
                              onValueChange={(value) => setValue(`urls.${index}.priority`, value)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1.0">1.0 (Highest)</SelectItem>
                                <SelectItem value="0.9">0.9</SelectItem>
                                <SelectItem value="0.8">0.8</SelectItem>
                                <SelectItem value="0.7">0.7</SelectItem>
                                <SelectItem value="0.6">0.6</SelectItem>
                                <SelectItem value="0.5">0.5 (Default)</SelectItem>
                                <SelectItem value="0.4">0.4</SelectItem>
                                <SelectItem value="0.3">0.3</SelectItem>
                                <SelectItem value="0.2">0.2</SelectItem>
                                <SelectItem value="0.1">0.1 (Lowest)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
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
                    This is how your sitemap.xml file will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generateSitemap()}
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
              <Card className="bg-cyan-500/5 border-cyan-500/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-500" />
                    Quick Tips
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-500">•</span>
                      <span>Place sitemap.xml in your website's root directory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-500">•</span>
                      <span>Reference it in robots.txt: Sitemap: https://yoursite.com/sitemap.xml</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-500">•</span>
                      <span>Set higher priority (0.8-1.0) for important pages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-500">•</span>
                      <span>Submit your sitemap to Google Search Console and Bing Webmaster Tools</span>
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

