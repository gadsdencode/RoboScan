import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";

export interface BuilderPageLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Short label shown in the pill next to the icon (e.g. "PWA Metadata Tool"). */
  badgeText: string;
  /**
   * Tailwind classes for the pill container (background + text), e.g.
   * `bg-primary/10 text-primary` or `bg-purple-500/10 text-purple-500`.
   */
  badgeClassName?: string;
  /** Optional line between title and description (builders today omit this). */
  subtitle?: string;
  /** Optional icon color class for the badge icon (defaults to inheriting badge text color). */
  iconClassName?: string;
  /** Rendered below the description (e.g. secondary standard Badge). */
  headerExtra?: ReactNode;
  /** Passed to Navbar when present (Import URL, tour, etc.). */
  toolbarItems?: ReactNode;
  children: ReactNode;
}

export function BuilderPageLayout({
  title,
  description,
  subtitle,
  icon: Icon,
  badgeText,
  badgeClassName = "bg-primary/10 text-primary",
  iconClassName,
  headerExtra,
  toolbarItems,
  children,
}: BuilderPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar {...(toolbarItems != null ? { toolbarItems } : {})} />

      <div className="container mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-12">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${badgeClassName}`}
            >
              <Icon className={`w-4 h-4 ${iconClassName ?? ""}`} />
              <span className="text-sm font-medium">{badgeText}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
            {subtitle != null && subtitle !== "" && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">{subtitle}</p>
            )}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{description}</p>
            {headerExtra}
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
