import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { motion } from "framer-motion";
import { Download, CheckCircle, AlertCircle, Copy, FileText, Sparkles, Plus, Trash2, Users, Heart, Globe, Mail, MapPin, Calendar, Link } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  role: string;
  name: string;
  contact: string;
  twitter: string;
  location: string;
}

interface ThanksMember {
  name: string;
  reason: string;
}

interface HumansFormData {
  // Team
  team: TeamMember[];
  // Thanks
  thanks: ThanksMember[];
  // Site info
  lastUpdate: string;
  language: string;
  doctype: string;
  components: string;
  software: string;
  standards: string;
}

export default function HumansBuilder() {
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
  } | null>(null);

  const { register, watch, control, setValue } = useForm<HumansFormData>({
    defaultValues: {
      team: [
        { role: "Lead Developer", name: "Jane Doe", contact: "jane@example.com", twitter: "@janedoe", location: "San Francisco, CA" },
        { role: "Designer", name: "John Smith", contact: "john@example.com", twitter: "@johnsmith", location: "New York, NY" },
      ],
      thanks: [
        { name: "Open Source Community", reason: "For the amazing tools and libraries" },
      ],
      lastUpdate: new Date().toISOString().split('T')[0],
      language: "English",
      doctype: "HTML5",
      components: "React, TypeScript, Tailwind CSS",
      software: "VS Code, Figma, GitHub",
      standards: "HTML5, CSS3, ECMAScript 2024",
    },
  });

  const { fields: teamFields, append: appendTeam, remove: removeTeam } = useFieldArray({
    control,
    name: "team",
  });

  const { fields: thanksFields, append: appendThanks, remove: removeThanks } = useFieldArray({
    control,
    name: "thanks",
  });

  const formData = watch();

  const generateHumansTxt = (): string => {
    const lines: string[] = [];
    
    // Team section
    lines.push("/* TEAM */");
    lines.push("");
    
    formData.team.forEach((member) => {
      if (member.role && member.name) {
        lines.push(`${member.role}: ${member.name}`);
        if (member.contact) lines.push(`Contact: ${member.contact}`);
        if (member.twitter) lines.push(`Twitter: ${member.twitter}`);
        if (member.location) lines.push(`Location: ${member.location}`);
        lines.push("");
      }
    });

    // Thanks section
    if (formData.thanks.some(t => t.name)) {
      lines.push("/* THANKS */");
      lines.push("");
      
      formData.thanks.forEach((thanks) => {
        if (thanks.name) {
          lines.push(`Name: ${thanks.name}`);
          if (thanks.reason) lines.push(`${thanks.reason}`);
          lines.push("");
        }
      });
    }

    // Site section
    lines.push("/* SITE */");
    lines.push("");
    
    if (formData.lastUpdate) {
      lines.push(`Last update: ${formData.lastUpdate}`);
    }
    if (formData.language) {
      lines.push(`Language: ${formData.language}`);
    }
    if (formData.doctype) {
      lines.push(`Doctype: ${formData.doctype}`);
    }
    if (formData.components) {
      lines.push(`Components: ${formData.components}`);
    }
    if (formData.software) {
      lines.push(`Software: ${formData.software}`);
    }
    if (formData.standards) {
      lines.push(`Standards: ${formData.standards}`);
    }

    return lines.join('\n');
  };

  const handleValidate = async () => {
    setIsValidating(true);
    const errors: string[] = [];
    
    // At least one team member
    const validTeamMembers = formData.team.filter(m => m.name && m.role);
    if (validTeamMembers.length === 0) {
      errors.push("At least one team member with name and role is required");
    }

    // Validate email formats
    formData.team.forEach((member, index) => {
      if (member.contact && member.contact.includes('@') && !member.contact.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push(`Team member ${index + 1}: Invalid email format`);
      }
    });

    // Validate Twitter handles
    formData.team.forEach((member, index) => {
      if (member.twitter && !member.twitter.startsWith('@')) {
        errors.push(`Team member ${index + 1}: Twitter handle should start with @`);
      }
    });

    setValidationResult({
      isValid: errors.length === 0,
      errors
    });

    if (errors.length === 0) {
      toast({
        title: "Validation Successful",
        description: "Your humans.txt file is properly formatted!",
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
    const content = generateHumansTxt();
    await navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "The humans.txt content has been copied successfully.",
    });
  };

  const handleDownload = () => {
    const content = generateHumansTxt();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'humans.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Your humans.txt file is being downloaded.",
    });
  };

  const addTeamMember = () => {
    appendTeam({
      role: "",
      name: "",
      contact: "",
      twitter: "",
      location: ""
    });
  };

  const addThanks = () => {
    appendThanks({
      name: "",
      reason: ""
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 text-pink-500 mb-4">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Team Credits Tool</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              humans.txt Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create a humans.txt file to credit your team and acknowledge the people who built your website.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Team & Credits
                </CardTitle>
                <CardDescription>
                  Recognize the humans behind your website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Team Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Team Members ({teamFields.length})</span>
                    </div>
                    <Button type="button" size="sm" onClick={addTeamMember} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Member
                    </Button>
                  </div>

                  {teamFields.map((field, index) => (
                    <Card key={field.id} className="p-4 border-pink-500/20">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Member {index + 1}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTeam(index)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-1">
                              Role *
                            </Label>
                            <Input
                              placeholder="Lead Developer"
                              {...register(`team.${index}.role`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-1">
                              Name *
                            </Label>
                            <Input
                              placeholder="Jane Doe"
                              {...register(`team.${index}.name`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-1">
                              <Mail className="w-3 h-3" /> Contact
                            </Label>
                            <Input
                              placeholder="jane@example.com"
                              {...register(`team.${index}.contact`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs flex items-center gap-1">
                              <Link className="w-3 h-3" /> Twitter
                            </Label>
                            <Input
                              placeholder="@janedoe"
                              {...register(`team.${index}.twitter`)}
                            />
                          </div>
                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Location
                            </Label>
                            <Input
                              placeholder="San Francisco, CA"
                              {...register(`team.${index}.location`)}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Separator />

                {/* Thanks Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Special Thanks ({thanksFields.length})</span>
                    </div>
                    <Button type="button" size="sm" onClick={addThanks} variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Thanks
                    </Button>
                  </div>

                  {thanksFields.map((field, index) => (
                    <Card key={field.id} className="p-4 border-pink-500/10">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Thanks {index + 1}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeThanks(index)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Name / Organization</Label>
                            <Input
                              placeholder="Open Source Community"
                              {...register(`thanks.${index}.name`)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Reason</Label>
                            <Input
                              placeholder="For the amazing tools and libraries"
                              {...register(`thanks.${index}.reason`)}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Separator />

                {/* Site Info Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Site Information</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastUpdate" className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3" /> Last Update
                      </Label>
                      <Input
                        id="lastUpdate"
                        type="date"
                        {...register("lastUpdate")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language" className="text-xs">Language</Label>
                      <Input
                        id="language"
                        placeholder="English"
                        {...register("language")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doctype" className="text-xs">Doctype</Label>
                      <Input
                        id="doctype"
                        placeholder="HTML5"
                        {...register("doctype")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="standards" className="text-xs">Standards</Label>
                      <Input
                        id="standards"
                        placeholder="HTML5, CSS3"
                        {...register("standards")}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="components" className="text-xs">Components / Stack</Label>
                      <Input
                        id="components"
                        placeholder="React, TypeScript, Tailwind CSS"
                        {...register("components")}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="software" className="text-xs">Software Used</Label>
                      <Input
                        id="software"
                        placeholder="VS Code, Figma, GitHub"
                        {...register("software")}
                      />
                    </div>
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
                    This is how your humans.txt file will look
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={generateHumansTxt()}
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
              <Card className="bg-pink-500/5 border-pink-500/20">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-500" />
                    About humans.txt
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-pink-500">•</span>
                      <span>Place humans.txt in your website's root directory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-500">•</span>
                      <span>Add to HTML: <code className="bg-muted px-1 rounded">&lt;link rel="author" href="/humans.txt"&gt;</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-500">•</span>
                      <span>Credit everyone who contributed to your project</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-500">•</span>
                      <span>Learn more at <a href="https://humanstxt.org" target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">humanstxt.org</a></span>
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

