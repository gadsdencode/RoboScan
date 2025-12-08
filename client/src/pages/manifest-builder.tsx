import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles, Smartphone, Palette, Image, Plus, Trash2, Globe, Layout } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

interface ManifestFormData {
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  scope: string;
  display: string;
  orientation: string;
  themeColor: string;
  backgroundColor: string;
  lang: string;
  dir: string;
  categories: string;
  icons: ManifestIcon[];
}

export default function ManifestBuilder() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const { register, watch, control, setValue } = useForm<ManifestFormData>({
    defaultValues: {
      name: "My Progressive Web App",
      shortName: "My PWA",
      description: "A description of your progressive web application",
      startUrl: "/",
      scope: "/",
      display: "standalone",
      orientation: "any",
      themeColor: "#3b82f6",
      backgroundColor: "#ffffff",
      lang: "en-US",
      dir: "ltr",
      categories: "utilities",
      icons: [
        { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "icons",
  });

  const formData = watch();

  const generateManifest = (): string => {
    const manifest: Record<string, any> = {
      name: formData.name,
      short_name: formData.shortName,
      description: formData.description,
      start_url: formData.startUrl,
      scope: formData.scope,
      display: formData.display,
      orientation: formData.orientation,
      theme_color: formData.themeColor,
      background_color: formData.backgroundColor,
      lang: formData.lang,
      dir: formData.dir,
      categories: formData.categories ? formData.categories.split(',').map(c => c.trim()) : [],
      icons: formData.icons.map(icon => ({
        src: icon.src,
        sizes: icon.sizes,
        type: icon.type,
        purpose: icon.purpose,
      })),
    };

    return JSON.stringify(manifest, null, 2);
  };

  const handleValidate = async () => {
    setIsValidating(true);
    const errors: string[] = [];
    
    // Required fields
    if (!formData.name || formData.name.trim().length === 0) {
      errors.push("Name is required");
    }

    if (!formData.shortName || formData.shortName.trim().length === 0) {
      errors.push("Short name is required");
    } else if (formData.shortName.length > 12) {
      errors.push("Short name should be 12 characters or less for best display");
    }

    if (!formData.startUrl) {
      errors.push("Start URL is required");
    }

    // Validate icons
    if (formData.icons.length === 0) {
      errors.push("At least one icon is required");
    }

    const has192Icon = formData.icons.some(icon => icon.sizes.includes('192'));
    const has512Icon = formData.icons.some(icon => icon.sizes.includes('512'));

    if (!has192Icon) {
      errors.push("A 192x192 icon is recommended for PWA installability");
    }
    if (!has512Icon) {
      errors.push("A 512x512 icon is recommended for splash screens");
    }

    formData.icons.forEach((icon, index) => {
      if (!icon.src) {
        errors.push(`Icon ${index + 1}: Source path is required`);
      }
      if (!icon.sizes) {
        errors.push(`Icon ${index + 1}: Size is required`);
      }
    });

    // Validate colors
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (formData.themeColor && !hexColorRegex.test(formData.themeColor)) {
      errors.push("Theme color must be a valid hex color (e.g., #3b82f6)");
    }
    if (formData.backgroundColor && !hexColorRegex.test(formData.backgroundColor)) {
      errors.push("Background color must be a valid hex color (e.g., #ffffff)");
    }

    setValidationResult({
      isValid: errors.length === 0,
      errors
    });

    if (errors.length === 0) {
      toast({
        title: "Validation Successful",
        description: "Your manifest.json file is properly formatted!",
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
    const content = generateManifest();
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "The manifest.json content has been copied successfully.",
    });
  };

  const handleDownload = () => {
    const content = generateManifest();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your manifest.json file is being downloaded.",
    });
  };

  const addIcon = () => {
    append({
      src: "/icons/icon-256x256.png",
      sizes: "256x256",
      type: "image/png",
      purpose: "any"
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-500 mb-4">
              <Smartphone className="w-4 h-4" />
              <span className="text-sm font-medium">PWA Metadata Tool</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              manifest.json Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create a Web App Manifest to make your website installable as a Progressive Web App (PWA).
            </p>
            <Badge variant="secondary" className="mt-4">
              W3C Web App Manifest Standard
            </Badge>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  App Configuration
                </CardTitle>
                <CardDescription>
                  Configure your PWA's appearance and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Basic Information</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">App Name *</Label>
                    <Input
                      id="name"
                      placeholder="My Progressive Web App"
                      {...register("name")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortName">Short Name * (max 12 chars)</Label>
                    <Input
                      id="shortName"
                      placeholder="My PWA"
                      maxLength={12}
                      {...register("shortName")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Displayed on home screen when space is limited
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="A description of your app"
                      {...register("description")}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startUrl">Start URL</Label>
                      <Input
                        id="startUrl"
                        placeholder="/"
                        {...register("startUrl")}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scope">Scope</Label>
                      <Input
                        id="scope"
                        placeholder="/"
                        {...register("scope")}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Display Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Display Settings</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Display Mode</Label>
                      <Select
                        value={formData.display}
                        onValueChange={(value) => setValue("display", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fullscreen">Fullscreen</SelectItem>
                          <SelectItem value="standalone">Standalone</SelectItem>
                          <SelectItem value="minimal-ui">Minimal UI</SelectItem>
                          <SelectItem value="browser">Browser</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Orientation</Label>
                      <Select
                        value={formData.orientation}
                        onValueChange={(value) => setValue("orientation", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="portrait">Portrait</SelectItem>
                          <SelectItem value="landscape">Landscape</SelectItem>
                          <SelectItem value="portrait-primary">Portrait Primary</SelectItem>
                          <SelectItem value="landscape-primary">Landscape Primary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Theme Colors */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Theme Colors</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="themeColor">Theme Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="themeColor"
                          placeholder="#3b82f6"
                          {...register("themeColor")}
                          className="font-mono text-sm"
                        />
                        <input
                          type="color"
                          value={formData.themeColor}
                          onChange={(e) => setValue("themeColor", e.target.value)}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backgroundColor">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="backgroundColor"
                          placeholder="#ffffff"
                          {...register("backgroundColor")}
                          className="font-mono text-sm"
                        />
                        <input
                          type="color"
                          value={formData.backgroundColor}
                          onChange={(e) => setValue("backgroundColor", e.target.value)}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Icons */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Icons ({fields.length})</span>
                    </div>
                    <Button type="button" size="sm" onClick={addIcon} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Icon
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Icon {index + 1}</span>
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
                            <Label className="text-xs">Source Path *</Label>
                            <Input
                              placeholder="/icons/icon.png"
                              {...register(`icons.${index}.src`)}
                              className="font-mono text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Sizes *</Label>
                            <Select
                              value={formData.icons[index]?.sizes || "192x192"}
                              onValueChange={(value) => setValue(`icons.${index}.sizes`, value)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="72x72">72x72</SelectItem>
                                <SelectItem value="96x96">96x96</SelectItem>
                                <SelectItem value="128x128">128x128</SelectItem>
                                <SelectItem value="144x144">144x144</SelectItem>
                                <SelectItem value="152x152">152x152</SelectItem>
                                <SelectItem value="192x192">192x192</SelectItem>
                                <SelectItem value="256x256">256x256</SelectItem>
                                <SelectItem value="384x384">384x384</SelectItem>
                                <SelectItem value="512x512">512x512</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={formData.icons[index]?.type || "image/png"}
                              onValueChange={(value) => setValue(`icons.${index}.type`, value)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="image/png">PNG</SelectItem>
                                <SelectItem value="image/jpeg">JPEG</SelectItem>
                                <SelectItem value="image/webp">WebP</SelectItem>
                                <SelectItem value="image/svg+xml">SVG</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Purpose</Label>
                            <Select
                              value={formData.icons[index]?.purpose || "any"}
                              onValueChange={(value) => setValue(`icons.${index}.purpose`, value)}
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any</SelectItem>
                                <SelectItem value="maskable">Maskable</SelectItem>
                                <SelectItem value="any maskable">Any + Maskable</SelectItem>
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
                    This is how your manifest.json file will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generateManifest()}
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
              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-500" />
                    Integration Guide
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500">1.</span>
                      <span>Place manifest.json in your website's root directory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500">2.</span>
                      <span>Add to HTML: <code className="bg-muted px-1 rounded">&lt;link rel="manifest" href="/manifest.json"&gt;</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500">3.</span>
                      <span>Ensure icons exist at the specified paths</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500">4.</span>
                      <span>Add a service worker for full PWA functionality</span>
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

