import { useState } from "react";

export type BotAccessTestResult = {
  status: number;
  accessible: boolean;
  statusText: string;
  loading?: boolean;
};

export function useBotAccessTesting() {
  const [botAccessTests, setBotAccessTests] = useState<
    Record<string, BotAccessTestResult>
  >({});
  const [testingBots, setTestingBots] = useState<Set<string>>(new Set());

  const testBotAccess = async (scanUrl: string, botName: string) => {
    const testKey = `${scanUrl}-${botName}`;

    setTestingBots((prev) => new Set(prev).add(testKey));

    try {
      const response = await fetch("/api/test-bot-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: scanUrl, botName }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setBotAccessTests((prev) => ({
          ...prev,
          [testKey]: {
            status: data.status,
            accessible: data.accessible,
            statusText: data.statusText,
          },
        }));
      }
    } catch (error) {
      console.error("Failed to test bot access:", error);
      setBotAccessTests((prev) => ({
        ...prev,
        [testKey]: {
          status: 0,
          accessible: false,
          statusText: "Test failed",
        },
      }));
    } finally {
      setTestingBots((prev) => {
        const next = new Set(prev);
        next.delete(testKey);
        return next;
      });
    }
  };

  return {
    botAccessTests,
    testingBots,
    testBotAccess,
  };
}
