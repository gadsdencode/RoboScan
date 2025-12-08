import { DriveStep } from "driver.js";

export const dashboardTourSteps: DriveStep[] = [
  {
    element: '[data-testid="input-scan-url"]',
    popover: {
      title: "🔍 Scan a Website",
      description: "Enter any URL here to analyze its robots.txt and llms.txt files for AI bot permissions. Each scan earns you XP!",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: '[data-testid="button-tools-dropdown"]',
    popover: {
      title: "🛠️ Tools & Analysis",
      description: "Access all 8 technical file builders (robots.txt, llms.txt, sitemap.xml, security.txt, manifest.json, ads.txt, humans.txt, ai.txt) and the Compare Sites analysis tool from this dropdown menu.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-trophy-case"]',
    popover: {
      title: "🏆 Trophy Case",
      description: "View your unlocked achievements! Earn badges like 'Architect' (validate llms.txt), 'Guardian' (set up recurring scans), and 'Speed Demon' (perfect scans).",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-tour"]',
    popover: {
      title: "❓ Need Help?",
      description: "Click here anytime to restart this tour and learn about all the features.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-notifications"]',
    popover: {
      title: "🔔 Stay Updated",
      description: "Check here for alerts about scan changes, new errors, or permission updates from your recurring scans.",
      side: "left",
      align: "start"
    }
  },
  {
    element: '[data-testid="hud-level-display"]',
    popover: {
      title: "📊 Your Progress",
      description: "Track your level and XP! Earn 10 XP per scan, +40 bonus for perfect scans, and 5 XP for each recurring scan that runs automatically.",
      side: "left",
      align: "start"
    }
  },
  {
    element: '[data-testid="button-create-recurring"]',
    popover: {
      title: "🔄 Monitor Automatically",
      description: "Set up recurring scans to get notified when a website's bot permissions change. This unlocks the 'Guardian' achievement and earns passive XP!",
      side: "left",
      align: "center"
    }
  },
  {
    popover: {
      title: "📈 Track Your Progress",
      description: "As you use ROBOSCAN, you'll build expertise and unlock new milestones. Every scan contributes to your knowledge score, and completing different tasks reveals achievements in your Trophy Case. The more you explore AI bot permissions, the more you'll discover!"
    }
  }
];

export const builderTourSteps: DriveStep[] = [
  {
    popover: {
      title: "🎯 Welcome to the LLMs.txt Builder",
      description: "This tool helps you create a professional llms.txt file that guides AI agents on how to interact with your content. Let's walk through each section!"
    }
  },
  {
    element: '[data-testid="input-website-name"]',
    popover: {
      title: "🌐 Website Name",
      description: "Enter your website's domain name. This helps AI agents identify your site when referencing your content.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="input-website-url"]',
    popover: {
      title: "🔗 Website URL",
      description: "Provide your complete website URL. This ensures AI agents can properly link back to your content.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="textarea-content-description"]',
    popover: {
      title: "📝 Content Summary",
      description: "Describe what your website is about. This gives AI agents context about your content, helping them provide accurate information to users.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="input-citation-format"]',
    popover: {
      title: "📚 Citation Format",
      description: "Specify how you want AI agents to cite your content. This ensures proper attribution when your information is referenced.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="textarea-allowed-bots"]',
    popover: {
      title: "🤖 Allowed Bots",
      description: "List which AI bots can access your content. You can allow specific bots like GPTBot, Claude-Web, or others based on your preferences.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="textarea-key-areas"]',
    popover: {
      title: "📍 Key Areas",
      description: "Highlight important sections of your website. Point AI agents to documentation, blogs, or other valuable resources.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="textarea-content-guidelines"]',
    popover: {
      title: "📋 Content Guidelines",
      description: "Set rules for how AI agents should use your content. Specify attribution requirements, usage restrictions, or licensing information.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="input-contact-email"]',
    popover: {
      title: "📧 Contact Email",
      description: "Provide a contact email for AI partnership inquiries. This helps AI companies reach you for collaboration opportunities.",
      side: "right",
      align: "start"
    }
  },
  {
    popover: {
      title: "✨ Premium Fields",
      description: "Premium fields allow you to provide even more context to AI agents! You can unlock fields like Products & Services, Pricing Information, Brand Voice, and more through secure payment. Each unlocked field earns you XP and enhances your llms.txt profile.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-testid="textarea-preview"]',
    popover: {
      title: "👁️ Live Preview",
      description: "See your llms.txt file in real-time! This preview updates automatically as you fill in the fields, showing exactly what your final file will look like.",
      side: "left",
      align: "start"
    }
  },
  {
    element: '[data-testid="button-validate"]',
    popover: {
      title: "✅ Validate Your File",
      description: "Check if your llms.txt file is properly formatted. Validation ensures AI agents can read your file correctly and unlocks the 'Architect' achievement!",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-copy"]',
    popover: {
      title: "📋 Copy to Clipboard",
      description: "Quickly copy your llms.txt content to paste it into your website's root directory.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-download"]',
    popover: {
      title: "💾 Download File",
      description: "Download your llms.txt file and upload it to your website's root directory (alongside robots.txt).",
      side: "top",
      align: "center"
    }
  },
  {
    popover: {
      title: "🎉 You're All Set!",
      description: "Fill in your information, validate your file, and download it to help AI agents understand your content better. Premium fields can be unlocked anytime to enhance your profile and earn extra XP!"
    }
  }
];

export const robotsBuilderTourSteps: DriveStep[] = [
  {
    popover: {
      title: "🤖 Welcome to the Robots.txt Builder",
      description: "This tool helps you create a professional robots.txt file to control how search engines and AI bots crawl your website. Let's explore each section!"
    }
  },
  {
    element: '[data-testid="input-website-url"]',
    popover: {
      title: "🌐 Website URL",
      description: "Enter your website's main URL. This helps you generate proper sitemap references and verify your configuration.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="select-default-access"]',
    popover: {
      title: "🚦 Default Access Policy",
      description: "Set the default access level for all bots. Choose 'Allow All' to permit full crawling, 'Block All' to prevent all bots, or 'Custom' to define specific rules.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="textarea-disallowed-paths"]',
    popover: {
      title: "🚫 Blocked Paths",
      description: "List paths that bots should not access. For example, /admin/, /private/, or /api/. Each path should be on a new line.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="textarea-allowed-paths"]',
    popover: {
      title: "✅ Allowed Paths",
      description: "Specify paths that should be explicitly allowed, even if blocked by other rules. This is useful for making exceptions to broader restrictions.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="input-crawl-delay"]',
    popover: {
      title: "⏱️ Crawl Delay",
      description: "Set the number of seconds bots should wait between requests. This helps prevent server overload. A value of 0 means no delay.",
      side: "right",
      align: "start"
    }
  },
  {
    element: '[data-testid="input-sitemap-url"]',
    popover: {
      title: "🗺️ Sitemap Location",
      description: "Provide the URL to your XML sitemap. This helps search engines discover and index your pages more efficiently.",
      side: "right",
      align: "start"
    }
  },
  {
    popover: {
      title: "✨ Premium Fields",
      description: "Unlock advanced features for more precise bot control! Premium fields let you set bot-specific rules, advanced path patterns, multiple sitemaps, request rate limiting, and more. Each unlocked field earns you XP and gives you professional-grade crawl management.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-testid="textarea-preview"]',
    popover: {
      title: "👁️ Live Preview",
      description: "See your robots.txt file in real-time! This preview updates automatically as you configure the rules, showing exactly what search engines will see.",
      side: "left",
      align: "start"
    }
  },
  {
    element: '[data-testid="button-validate"]',
    popover: {
      title: "✅ Validate Your File",
      description: "Check if your robots.txt file follows best practices and has no syntax errors. This ensures search engines can properly read your directives.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-copy"]',
    popover: {
      title: "📋 Copy to Clipboard",
      description: "Quickly copy your robots.txt content to paste it into your website's root directory.",
      side: "top",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-download"]',
    popover: {
      title: "💾 Download File",
      description: "Download your robots.txt file and place it in your website's root directory at /robots.txt.",
      side: "top",
      align: "center"
    }
  },
  {
    popover: {
      title: "🎉 You're Ready to Go!",
      description: "Configure your crawl rules, validate your file, and download it to control how bots access your site. Premium fields can be unlocked anytime for advanced bot management and extra XP!"
    }
  }
];
