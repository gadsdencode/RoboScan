import { useScanMutation } from "@/hooks/useScanMutation";

export { useScanMutation } from "@/hooks/useScanMutation";
export type { UseScanMutationOptions } from "@/hooks/useScanMutation";

/** Dashboard / primary scan mutation with optimistic XP and shared polling. */
export function useScan() {
  return useScanMutation();
}
