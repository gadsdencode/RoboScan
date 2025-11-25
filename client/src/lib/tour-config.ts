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
    element: '[data-testid="user-hud"]',
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
      title: "🎮 Gamification System",
      description: "ROBOSCAN now rewards you for every action! Scan sites to earn XP and level up. Unlock achievements by completing special tasks. Check your Trophy Case to see all available badges!"
    }
  }
];
