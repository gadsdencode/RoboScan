// shared/scoreGrade.ts
// Display-only mapping from the existing numeric scan score (0-100) to a letter
// grade. This does NOT change how the score is computed (see server/report-generator.ts);
// it only provides a human-friendly grade for the shareable score card.

export type ScoreGrade = "A" | "B" | "C" | "D" | "F";

export interface GradeMeta {
  grade: ScoreGrade;
  label: string;
  /** Tailwind text color token used by the score card. */
  colorClass: string;
  /** Hex color for non-Tailwind contexts (e.g. the OG image / SVG badge). */
  hex: string;
}

export function scoreToGrade(score: number): ScoreGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

const GRADE_META: Record<ScoreGrade, Omit<GradeMeta, "grade">> = {
  A: { label: "Excellent", colorClass: "text-green-400", hex: "#4ade80" },
  B: { label: "Good", colorClass: "text-emerald-400", hex: "#34d399" },
  C: { label: "Fair", colorClass: "text-yellow-400", hex: "#facc15" },
  D: { label: "Needs work", colorClass: "text-orange-400", hex: "#fb923c" },
  F: { label: "Poor", colorClass: "text-red-400", hex: "#f87171" },
};

export function gradeMeta(score: number): GradeMeta {
  const grade = scoreToGrade(score);
  return { grade, ...GRADE_META[grade] };
}
