// client/src/components/ShareScoreDialog.tsx
import { useState } from "react";
import { Copy, Check, Link2, Linkedin, Twitter, Code2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScoreCard } from "@/components/ScoreCard";
import { useToast } from "@/hooks/use-toast";
import { gradeMeta } from "@shared/scoreGrade";
import type { BotSummary } from "@shared/publicScanSummary";

interface ShareScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareToken: string;
  hostname: string;
  score: number;
  bots: BotSummary[];
}

function CopyField({ label, value, testId }: { label: string; value: string; testId: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-2 text-xs font-mono">
        {value}
      </code>
      <Button type="button" variant="secondary" size="sm" onClick={copy} data-testid={testId}>
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

export function ShareScoreDialog({
  open,
  onOpenChange,
  shareToken,
  hostname,
  score,
  bots,
}: ShareScoreDialogProps) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.aibotcheck.io";
  const shareUrl = `${origin}/s/${shareToken}`;
  const badgeUrl = `${origin}/api/badge/${shareToken}`;
  const grade = gradeMeta(score).grade;

  const shareText = `${hostname} scored ${score}/100 (Grade ${grade}) for AI visibility — checked with AI BotCheck`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const badgeHtml = `<a href="${shareUrl}"><img src="${badgeUrl}" alt="AI BotCheck — Grade ${grade}"></a>`;
  const badgeMarkdown = `[![AI BotCheck — Grade ${grade}](${badgeUrl})](${shareUrl})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Share my score
          </DialogTitle>
          <DialogDescription>
            Share this public result. It shows only your grade and AI crawler permissions — no account data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <ScoreCard hostname={hostname} score={score} bots={bots} />

          <div className="space-y-2">
            <p className="text-sm font-medium">Share link</p>
            <CopyField label="Link" value={shareUrl} testId="copy-share-link" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Post to social</p>
            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <a href={xUrl} target="_blank" rel="noopener noreferrer" data-testid="share-x">
                  <Twitter className="w-4 h-4 mr-2" />
                  Share on X
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" data-testid="share-linkedin">
                  <Linkedin className="w-4 h-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              Embeddable badge
            </p>
            <p className="text-xs text-muted-foreground">HTML</p>
            <CopyField label="Badge HTML" value={badgeHtml} testId="copy-badge-html" />
            <p className="text-xs text-muted-foreground mt-2">Markdown</p>
            <CopyField label="Badge Markdown" value={badgeMarkdown} testId="copy-badge-markdown" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
