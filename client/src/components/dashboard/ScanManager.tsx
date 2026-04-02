import { useState } from "react";
import { AlertCircle, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useScan } from "@/hooks/useScan";
import { toast } from "sonner";

export interface ScanManagerProps {
  allTags: string[];
  onScanComplete: () => void;
}

export function ScanManager({ allTags, onScanComplete }: ScanManagerProps) {
  const { user } = useAuth();
  const { mutate: scanUrl, isPending: isScanningMutation } = useScan();
  const [scanUrlInput, setScanUrlInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedScanTag, setSelectedScanTag] = useState("default");

  const handleScan = () => {
    if (!scanUrlInput.trim()) return;
    setScanError(null);

    scanUrl(
      {
        url: scanUrlInput,
        tags: selectedScanTag !== "default" ? [selectedScanTag] : [],
      },
      {
        onSuccess: (data) => {
          if (data.gamification && user) {
            const { xpGained, totalXp, newLevel, levelUp, cooldownActive } =
              data.gamification;

            if (cooldownActive) {
              toast.info("Domain cooldown active", {
                description:
                  "You've already scanned this domain recently. No XP awarded this time.",
                duration: 3000,
              });
            } else if (levelUp) {
              toast.success(`🎉 Level Up! You're now Level ${newLevel}!`, {
                description: `You earned ${xpGained} XP and reached a new level! Keep scanning!`,
                duration: 5000,
              });
            } else {
              const isPerfectScan = xpGained >= 50;
              toast.success(
                isPerfectScan
                  ? `✨ Perfect Scan! +${xpGained} XP`
                  : `+${xpGained} XP earned`,
                {
                  description: isPerfectScan
                    ? `Both robots.txt and llms.txt found! Total: ${totalXp} XP`
                    : `Total XP: ${totalXp}`,
                  duration: 3000,
                }
              );
            }
          }

          onScanComplete();
          setScanUrlInput("");
        },
        onError: (error) => {
          setScanError(
            error instanceof Error ? error.message : "Failed to scan website"
          );
        },
      }
    );
  };

  return (
    <Card className="lg:col-span-2 p-6 flex flex-col justify-center border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">Run Diagnostic Scan</h2>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="url"
          placeholder="Enter website URL (e.g., example.com)"
          value={scanUrlInput}
          onChange={(e) => setScanUrlInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !isScanningMutation && handleScan()
          }
          disabled={isScanningMutation}
          className="flex-1 bg-background border-border focus:border-primary"
          data-testid="input-scan-url"
        />

        <Select value={selectedScanTag} onValueChange={setSelectedScanTag}>
          <SelectTrigger
            className="w-full sm:w-[180px] bg-background border-border"
            data-testid="select-scan-tag"
          >
            <SelectValue placeholder="Assign Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">No Client</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleScan}
          disabled={isScanningMutation || !scanUrlInput.trim()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 btn-hover-lift"
          data-testid="button-scan"
        >
          {isScanningMutation ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Scanning...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 mr-2" />
              Scan
            </>
          )}
        </Button>
      </div>
      {scanError && (
        <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {scanError}
        </div>
      )}
    </Card>
  );
}
