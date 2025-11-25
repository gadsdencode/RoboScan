export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

export const ACHIEVEMENTS = {
  ARCHITECT: {
    key: 'ARCHITECT',
    name: 'AI Architect',
    description: 'Created a valid llms.txt file',
    xpReward: 50,
    icon: 'FileCode'
  }
};
