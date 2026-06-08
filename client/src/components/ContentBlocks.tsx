// client/src/components/ContentBlocks.tsx
import { useState } from "react";
import { Check, Copy, AlertTriangle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { BotFaqItem } from "@/lib/content/bots";

interface CodeSnippetProps {
  code: string;
  label?: string;
}

/** Monospace code block with a copy-to-clipboard button. */
export function CodeSnippet({ code, label }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. during prerender) — fail silently.
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50">
        <span className="text-xs font-mono text-slate-400">{label ?? "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono text-slate-200 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

/** Amber pill flagging an unverified placeholder value. */
export function TodoBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-500 text-xs font-medium">
      <AlertTriangle className="w-3 h-3" />
      Needs verification
    </span>
  );
}

interface FaqListProps {
  faqs: BotFaqItem[];
}

/** Accessible FAQ accordion. The matching FAQPage JSON-LD is emitted via <Seo>. */
export function FaqList({ faqs }: FaqListProps) {
  if (faqs.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, index) => (
        <AccordionItem key={faq.question} value={`faq-${index}`}>
          <AccordionTrigger className="text-base font-medium text-foreground">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground whitespace-pre-line leading-relaxed">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
