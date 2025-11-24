import { DriveStep } from "driver.js";

export const dashboardTourSteps: DriveStep[] = [
  {
    element: '[data-testid="input-scan-url"]',
    popover: {
      title: "Scan a Website",
      description: "Enter any URL here to analyze its robots.txt and llms.txt files for AI bot permissions.",
      side: "bottom",
      align: "start"
    }
  },
  {
    element: '[data-testid="button-create-recurring"]',
    popover: {
      title: "Monitor Automatically",
      description: "Set up recurring scans to get notified immediately when a website's bot permissions change.",
      side: "left",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-compare-sites"]',
    popover: {
      title: "Competitor Analysis",
      description: "Compare your website against competitors to see how their AI strategies differ from yours.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-llms-builder"]',
    popover: {
      title: "LLMs.txt Builder",
      description: "Use our tool to generate a compliant llms.txt file to control how AI agents view your content.",
      side: "bottom",
      align: "center"
    }
  },
  {
    element: '[data-testid="button-notifications"]',
    popover: {
      title: "Stay Updated",
      description: "Check here for alerts about scan changes, new errors, or permission updates.",
      side: "left",
      align: "start"
    }
  }
];
