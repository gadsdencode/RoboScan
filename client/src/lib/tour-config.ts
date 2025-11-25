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
    element: '[data-testid="button-llms-builder"]',
    popover: {
      title: "✨ LLMs.txt Builder",
      description: "Use our tool to generate a compliant llms.txt file to control how AI agents view your content. Validating your llms.txt unlocks the 'Architect' achievement!",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-compare-sites"]',
    popover: {
      title: "⚡ Competitor Analysis",
      description: "Compare your website against competitors to see how their AI strategies differ from yours.",
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
